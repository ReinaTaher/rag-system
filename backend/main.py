import asyncio
import json
import threading
from datetime import datetime, timezone, timedelta

from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import re

import requests as http_requests

from agent import knowledge_agent, stream_knowledge_agent
from config import OLLAMA_BASE_URL, OLLAMA_MODEL
from database import threads_collection, messages_collection, message_versions_collection, feedback_collection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Pydantic models ──────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    answer: str


class CreateThreadRequest(BaseModel):
    title: str = ""


class FeedbackRequest(BaseModel):
    vote: str        # "up" or "down"
    reason: str = "" # required when vote == "down"
    version_num: int = 1


class SuggestionsRequest(BaseModel):
    question: str
    answer: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_streamer(user_message: str, history: list[dict], temperature: float = 0):
    """Return a queue fed by a background thread running the agent."""
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def run_sync():
        try:
            for chunk in stream_knowledge_agent(user_message, history, temperature=temperature):
                loop.call_soon_threadsafe(queue.put_nowait, chunk)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    threading.Thread(target=run_sync, daemon=True).start()
    return queue


# ── Thread endpoints ─────────────────────────────────────────────────────────

@app.get("/threads")
async def list_threads():
    cursor = threads_collection.find().sort("updated_at", -1)
    threads = [_serialize(doc) async for doc in cursor]
    return threads


@app.post("/threads")
async def create_thread(body: CreateThreadRequest):
    now = _now()
    result = await threads_collection.insert_one({
        "title": body.title or "New Chat",
        "created_at": now,
        "updated_at": now,
    })
    return {"id": str(result.inserted_id), "title": body.title or "New Chat", "created_at": now}


@app.get("/threads/{thread_id}/messages")
async def get_thread_messages(thread_id: str):
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Invalid thread ID")
    cursor = messages_collection.find({"thread_id": thread_id}).sort("created_at", 1)
    messages = []
    async for doc in cursor:
        msg = _serialize(doc)
        msg.setdefault("sources", None)
        msg.setdefault("version_count", 1)
        messages.append(msg)
    return messages


# ── Streaming chat with persistence ─────────────────────────────────────────

@app.post("/threads/{thread_id}/chat/stream")
async def thread_chat_stream(thread_id: str, request: ChatRequest):
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Invalid thread ID")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    now = _now()

    await messages_collection.insert_one({
        "thread_id": thread_id,
        "role": "user",
        "content": request.message,
        "created_at": now,
    })

    thread = await threads_collection.find_one({"_id": ObjectId(thread_id)})
    if thread and thread.get("title") == "New Chat":
        title = request.message[:50] + ("…" if len(request.message) > 50 else "")
        await threads_collection.update_one(
            {"_id": ObjectId(thread_id)},
            {"$set": {"title": title, "updated_at": now}},
        )
    else:
        await threads_collection.update_one(
            {"_id": ObjectId(thread_id)},
            {"$set": {"updated_at": now}},
        )

    history = [m.model_dump() for m in request.history]

    async def generate():
        queue = _make_streamer(request.message, history)
        full_response = ""
        sources_data = None

        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            if "data: [DONE]" in chunk:
                continue
            yield chunk
            if chunk.startswith("data: "):
                try:
                    parsed = json.loads(chunk[6:])
                    if "token" in parsed:
                        full_response += parsed["token"]
                    elif "sources" in parsed:
                        sources_data = parsed["sources"]
                except Exception:
                    pass

        result = await messages_collection.insert_one({
            "thread_id": thread_id,
            "role": "assistant",
            "content": full_response,
            "sources": sources_data,
            "version_count": 1,
            "created_at": _now(),
        })
        yield f"data: {json.dumps({'message_id': str(result.inserted_id), 'version_count': 1})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )


@app.patch("/threads/{thread_id}")
async def rename_thread(thread_id: str, body: CreateThreadRequest):
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Invalid thread ID")
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    await threads_collection.update_one(
        {"_id": ObjectId(thread_id)},
        {"$set": {"title": title, "updated_at": _now()}},
    )
    return {"ok": True}


@app.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Invalid thread ID")
    await threads_collection.delete_one({"_id": ObjectId(thread_id)})
    await messages_collection.delete_many({"thread_id": thread_id})
    return {"ok": True}


# ── Regeneration ─────────────────────────────────────────────────────────────

@app.post("/threads/{thread_id}/messages/{message_id}/regenerate")
async def regenerate_message(thread_id: str, message_id: str, request: ChatRequest):
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID")

    existing = await messages_collection.find_one({"_id": ObjectId(message_id)})
    if not existing or existing.get("role") != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message not found")

    current_version_count = existing.get("version_count", 1)

    await message_versions_collection.insert_one({
        "message_id": message_id,
        "thread_id": thread_id,
        "version_num": current_version_count,
        "content": existing["content"],
        "sources": existing.get("sources"),
        "created_at": existing.get("created_at", _now()),
    })

    history = [m.model_dump() for m in request.history]

    async def generate():
        queue = _make_streamer(request.message, history, temperature=0.5)
        full_response = ""
        sources_data = None

        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            if "data: [DONE]" in chunk:
                continue
            yield chunk
            if chunk.startswith("data: "):
                try:
                    parsed = json.loads(chunk[6:])
                    if "token" in parsed:
                        full_response += parsed["token"]
                    elif "sources" in parsed:
                        sources_data = parsed["sources"]
                except Exception:
                    pass

        new_version_count = current_version_count + 1
        await messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {
                "content": full_response,
                "sources": sources_data,
                "version_count": new_version_count,
                "updated_at": _now(),
            }},
        )
        yield f"data: {json.dumps({'message_id': message_id, 'version_count': new_version_count})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )


@app.post("/threads/{thread_id}/messages/{message_id}/compare")
async def compare_message(thread_id: str, message_id: str, request: ChatRequest):
    """Stream an alternative generation at higher temperature without persisting."""
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID")

    history = [m.model_dump() for m in request.history]

    async def generate():
        queue = _make_streamer(request.message, history, temperature=0.5)
        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )


@app.get("/messages/{message_id}/versions")
async def get_message_versions(message_id: str):
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID")
    cursor = message_versions_collection.find(
        {"message_id": message_id}
    ).sort("version_num", 1)
    versions = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        versions.append(doc)
    return versions


# ── Feedback ─────────────────────────────────────────────────────────────────

@app.post("/messages/{message_id}/feedback")
async def submit_feedback(message_id: str, body: FeedbackRequest):
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID")
    if body.vote not in ("up", "down"):
        raise HTTPException(status_code=400, detail="vote must be 'up' or 'down'")
    if body.vote == "down" and not body.reason.strip():
        raise HTTPException(status_code=400, detail="reason is required for downvotes")

    await feedback_collection.insert_one({
        "message_id": message_id,
        "version_num": body.version_num,
        "vote": body.vote,
        "reason": body.reason.strip() if body.vote == "down" else None,
        "created_at": _now(),
    })
    return {"ok": True}


# ── Suggestions ──────────────────────────────────────────────────────────────

@app.post("/suggestions")
async def get_suggestions(body: SuggestionsRequest):
    prompt = (
        f"A user asked: \"{body.question}\"\n\n"
        f"The answer was: \"{body.answer[:400]}\"\n\n"
        "Generate exactly 3 short follow-up questions the user might ask next. "
        "Each question must be under 12 words. "
        "Return ONLY a JSON array of 3 strings, no explanation.\n"
        "Example: [\"What tools implement this?\", \"How does this apply to cloud?\", \"What is the risk of skipping this?\"]"
    )
    try:
        res = http_requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.7}},
            timeout=30,
        )
        res.raise_for_status()
        raw = res.json().get("response", "[]")
        match = re.search(r'\[.*?\]', raw, re.DOTALL)
        if match:
            suggestions = json.loads(match.group())
            return {"suggestions": [s for s in suggestions if isinstance(s, str)][:3]}
    except Exception:
        pass
    return {"suggestions": []}


# ── Analytics ────────────────────────────────────────────────────────────────

@app.get("/analytics")
async def get_analytics():
    total_threads = await threads_collection.count_documents({})
    total_messages = await messages_collection.count_documents({"role": "assistant"})
    total_feedback = await feedback_collection.count_documents({})
    thumbs_up = await feedback_collection.count_documents({"vote": "up"})
    thumbs_down = await feedback_collection.count_documents({"vote": "down"})
    satisfaction_rate = round(thumbs_up / total_feedback * 100, 1) if total_feedback > 0 else 0

    reasons_cursor = feedback_collection.aggregate([
        {"$match": {"vote": "down", "reason": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ])
    downvote_reasons = {}
    async for doc in reasons_cursor:
        downvote_reasons[doc["_id"]] = doc["count"]

    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    trend_cursor = feedback_collection.aggregate([
        {"$match": {"created_at": {"$gte": seven_days_ago}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "vote": "$vote",
            },
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.date": 1}},
    ])
    trend_map: dict = {}
    async for doc in trend_cursor:
        date = doc["_id"]["date"]
        vote = doc["_id"]["vote"]
        if date not in trend_map:
            trend_map[date] = {"up": 0, "down": 0}
        trend_map[date][vote] = doc["count"]

    feedback_trend = []
    for i in range(7):
        date = (seven_days_ago + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        feedback_trend.append({
            "date": date,
            "up": trend_map.get(date, {}).get("up", 0),
            "down": trend_map.get(date, {}).get("down", 0),
        })

    return {
        "total_threads": total_threads,
        "total_messages": total_messages,
        "total_feedback": total_feedback,
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "satisfaction_rate": satisfaction_rate,
        "downvote_reasons": downvote_reasons,
        "feedback_trend": feedback_trend,
    }


# ── Original endpoints (kept for reference) ──────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    history = [m.model_dump() for m in request.history]
    answer = knowledge_agent(request.message, history)
    return ChatResponse(answer=answer)


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    history = [m.model_dump() for m in request.history]
    return StreamingResponse(
        stream_knowledge_agent(request.message, history),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )
