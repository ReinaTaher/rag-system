# RAG System

A full-stack Retrieval-Augmented Generation (RAG) chat application built on CIS Critical Security Controls v8.

## Stack

- **Backend**: FastAPI, Weaviate, sentence-transformers, Ollama (llama3.2:3b)
- **Frontend**: React (Vite), Mantine UI, Tailwind CSS

## Prerequisites

- Python 3.12+, [uv](https://github.com/astral-sh/uv)
- Node.js 18+
- [Ollama](https://ollama.ai) running with `llama3.2:3b` pulled
- [Weaviate](https://weaviate.io) running locally on port 8080

## Setup

### Backend

```bash
cd backend
uv sync
uv run uvicorn main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
