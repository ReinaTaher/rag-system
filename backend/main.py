from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import knowledge_agent, stream_knowledge_agent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    answer: str


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
