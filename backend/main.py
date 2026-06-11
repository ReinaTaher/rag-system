import asyncio
import json
import threading
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import knowledge_agent, stream_knowledge_agent
from database import threads_collection, messages_collection, message_versions_collection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            if "data: [DONE]" in chunk:
                continue  # we emit our own [DONE] below
            yield chunk
            if chunk.startswith("data: "):
                try:
                    full_response += json.loads(chunk[6:]).get("token", "")
                except Exception:
                    pass

        result = await messages_collection.insert_one({
            "thread_id": thread_id,
            "role": "assistant",
            "content": full_response,
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

    # Archive current version before overwriting
    await message_versions_collection.insert_one({
        "message_id": message_id,
        "thread_id": thread_id,
        "version_num": current_version_count,
        "content": existing["content"],
        "created_at": existing.get("created_at", _now()),
    })

    history = [m.model_dump() for m in request.history]

    async def generate():
        queue = _make_streamer(request.message, history, temperature=0.5)
        full_response = ""

        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            if "data: [DONE]" in chunk:
                continue
            yield chunk
            if chunk.startswith("data: "):
                try:
                    full_response += json.loads(chunk[6:]).get("token", "")
                except Exception:
                    pass

        new_version_count = current_version_count + 1
        await messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {
                "content": full_response,
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
