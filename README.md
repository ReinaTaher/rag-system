# RAG System

A full-stack Retrieval-Augmented Generation (RAG) chat application built on CIS Critical Security Controls v8. Ask questions about cybersecurity best practices and get cited, streamed answers powered by a local LLM.

## Features

- Real-time streaming answers with inline citations
- Expandable source panel showing the exact document chunks used
- Chat history persisted in MongoDB — nothing lost on refresh
- Regenerate any response and compare versions side by side
- Thumbs up / down feedback with reason selection
- Follow-up question suggestions after each response
- Rename, search, and delete conversations
- Export any conversation as a PDF
- Feedback analytics dashboard
- Guided onboarding tour
- Dark / light theme

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Mantine UI |
| Backend | FastAPI, Python 3.12 |
| Database | MongoDB 7 |
| Vector store | Weaviate |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| Reranker | BAAI/bge-reranker-v2-m3 |
| LLM | Ollama (`llama3.2:3b`) |

---

## Prerequisites

Install these before starting:

| Tool | Version | Notes |
|---|---|---|
| [Python](https://python.org) | 3.12+ | |
| [uv](https://github.com/astral-sh/uv) | latest | Python package manager |
| [Node.js](https://nodejs.org) | 18+ | |
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | latest | For MongoDB |
| [Ollama](https://ollama.ai) | latest | Local LLM runtime |

---

## Setup (under 5 minutes)

### 1. Clone the repo

```bash
git clone https://github.com/ReinaTaher/rag-system.git
cd rag-system
```

### 2. Start MongoDB

```bash
docker compose up -d
```

This starts MongoDB on port `27017`. Data is persisted in a Docker volume.

### 3. Start Ollama and pull the model

```bash
ollama pull llama3.2:3b
```

Ollama must be running in the background. On Mac it starts automatically after installation. Verify with:

```bash
ollama list
```

You should see `llama3.2:3b` in the list.

### 4. Start the backend

```bash
cd backend
uv sync
uv run uvicorn main:app --port 8000
```

The first run downloads the embedding and reranker models (~500 MB total). Subsequent starts are fast.

Backend runs on `http://localhost:8000`.

### 5. Start the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. Open it in your browser.

---

## Verify everything is working

1. Open `http://localhost:5173`
2. Click **New Chat**
3. Ask: *"What is CIS Control 1?"*
4. You should see a streamed answer with citation numbers and an expandable sources panel

---

## Project structure

```
rag-system/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── agent.py         # RAG pipeline and LLM routing
│   ├── retrieval.py     # Weaviate vector search
│   ├── reranking.py     # Cross-encoder reranker
│   ├── embedding.py     # Sentence transformer embeddings
│   ├── chunking.py      # Document chunking
│   ├── parsing.py       # PDF parsing
│   ├── ingestion.py     # One-time document ingestion
│   ├── database.py      # MongoDB connection
│   └── config.py        # Model names and parameters
├── frontend/
│   └── src/
│       ├── App.jsx               # Main app state and logic
│       ├── components/
│       │   ├── ChatWindow.jsx    # Message display and actions
│       │   ├── ChatInput.jsx     # Auto-resizing input
│       │   ├── Sidebar.jsx       # Thread list with search and rename
│       │   ├── Header.jsx        # Theme toggle, export, analytics
│       │   ├── SourcesPanel.jsx  # Expandable citations
│       │   ├── FeedbackButtons.jsx
│       │   ├── AnalyticsDashboard.jsx
│       │   └── GuidedTour.jsx
│       └── context/
│           └── ThemeContext.jsx  # Dark/light theme
└── docker-compose.yml   # MongoDB service
```

---

## Re-ingesting documents

If you want to re-index the CIS Controls PDF (Weaviate must be running):

```bash
cd backend
uv run python ingestion.py
```

This deletes and recreates the Weaviate collection. Existing chat history in MongoDB is not affected.

---

## Troubleshooting

**Backend won't start**
- Make sure you're inside the `backend/` directory before running `uv run`
- Run `uv sync` to install dependencies if you haven't

**"Failed to create thread" in the browser**
- Check that MongoDB is running: `docker ps` should show `rag-mongodb`
- If Docker isn't running, start Docker Desktop first, then `docker compose up -d`

**Answers are empty or the backend hangs**
- Make sure Ollama is running and `llama3.2:3b` is pulled: `ollama list`
- The first response after startup is slow (~30s) because the model loads into memory

**Frontend shows port 5174 instead of 5173**
- Another process is using 5173. Use whichever port Vite prints in the terminal.
