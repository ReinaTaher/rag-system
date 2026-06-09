import json
import re
from collections.abc import Generator

import requests

from config import OLLAMA_BASE_URL, OLLAMA_MODEL, RETRIEVE_K, RERANK_TOP_K
from retrieval import retrieve
from reranking import rerank

HISTORY_LIMIT = 6

# CIS Controls v8 has 18 controls — map numbers to titles for query expansion
_CIS_TITLES = {
    1: "Inventory and Control of Enterprise Assets",
    2: "Inventory and Control of Software Assets",
    3: "Data Protection",
    4: "Secure Configuration of Enterprise Assets and Software",
    5: "Account Management",
    6: "Access Control Management",
    7: "Continuous Vulnerability Management",
    8: "Audit Log Management",
    9: "Email and Web Browser Protections",
    10: "Malware Defenses",
    11: "Data Recovery",
    12: "Network Infrastructure Management",
    13: "Network Monitoring and Defense",
    14: "Security Awareness and Skills Training",
    15: "Service Provider Management",
    16: "Application Software Security",
    17: "Incident Response Management",
    18: "Penetration Testing",
}


def _expand_control_numbers(query: str) -> str:
    """
    Replace every "Control N" mention with "Control N (Title)" so the embedding
    has semantic content to match. Expands ALL matches — not just the first —
    so contextualized queries like "CIS Control 4 control 13" expand both correctly.
    """
    def _replace(match: re.Match) -> str:
        number = int(match.group(1))
        title = _CIS_TITLES.get(number)
        return f"{match.group(0)} ({title})" if title else match.group(0)

    return re.sub(r'\bcontrol\s+(\d+)\b', _replace, query, flags=re.IGNORECASE)


def _is_list_all_query(query: str) -> bool:
    q = query.lower()
    return "control" in q and ("all" in q or "18" in q) and any(
        w in q for w in ("list", "what are", "name", "show")
    )


def _all_controls_answer() -> str:
    lines = ["Here are all 18 CIS Critical Security Controls v8:\n"]
    for num, title in _CIS_TITLES.items():
        lines.append(f"{num}. {title}")
    return "\n".join(lines)


def _contextualize_query(message: str, history: list[dict]) -> str:
    """
    For short follow-up messages, prepend the last user message so retrieval
    has enough context. Then expand any control numbers to their titles.
    """
    query = message
    if len(message.split()) <= 5 and history:
        last_user = next(
            (m["content"] for m in reversed(history) if m["role"] == "user"), ""
        )
        if last_user:
            query = f"{last_user} {message}"
    return _expand_control_numbers(query)


def _format_history(history: list[dict]) -> str:
    lines = []
    for m in history:
        role = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{role}: {m['content']}")
    return "\n".join(lines)


def generate_answer(
    query: str,
    top_chunks: list[tuple[str, float]],
    history: list[dict] | None = None,
) -> str:
    """Build a prompt from reranked context and conversation history, then call Ollama."""
    prompt = _build_prompt(query, top_chunks, history)
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0},
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["response"]


def knowledge_agent(query: str, history: list[dict] | None = None) -> str:
    """Full RAG pipeline: retrieve → rerank → generate."""
    if _is_list_all_query(query):
        return _all_controls_answer()
    history = (history or [])[-HISTORY_LIMIT:]
    retrieval_query = _contextualize_query(query, history)
    chunks = retrieve(retrieval_query, k=RETRIEVE_K)
    top_chunks = rerank(retrieval_query, chunks, top_k=RERANK_TOP_K)
    return generate_answer(query, top_chunks, history)


def _build_prompt(
    query: str,
    top_chunks: list[tuple[str, float]],
    history: list[dict] | None = None,
) -> str:
    """Shared prompt builder used by both streaming and non-streaming paths."""
    context = "\n\n---\n\n".join([chunk for chunk, _ in top_chunks])
    history_section = ""
    if history:
        history_section = f"Previous conversation:\n{_format_history(history)}\n\n"
    return (
        "You are an expert assistant on CIS Critical Security Controls v8.\n\n"
        "Answer the question using ONLY the context provided below. Do not use outside knowledge.\n\n"
        "Rules:\n"
        "- Cite specific CIS Control numbers and names when they appear in the context.\n"
        "- If the question asks for a list, respond with a clear numbered or bulleted list.\n"
        "- Be specific and complete — avoid vague generalities.\n"
        '- If the answer is not present in the context, respond only with: "This information is not available in the provided context."\n\n'
        f"{history_section}"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer:"
    )


def stream_knowledge_agent(
    query: str, history: list[dict] | None = None
) -> Generator[str, None, None]:
    """Streaming RAG pipeline — yields SSE-formatted token events."""
    if _is_list_all_query(query):
        for word in _all_controls_answer().split(" "):
            yield f"data: {json.dumps({'token': word + ' '})}\n\n"
        yield "data: [DONE]\n\n"
        return
    history = (history or [])[-HISTORY_LIMIT:]
    retrieval_query = _contextualize_query(query, history)
    chunks = retrieve(retrieval_query, k=RETRIEVE_K)
    top_chunks = rerank(retrieval_query, chunks, top_k=RERANK_TOP_K)
    prompt = _build_prompt(query, top_chunks, history)

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": True,
            "options": {"temperature": 0},
        },
        stream=True,
        timeout=120,
    )
    response.raise_for_status()

    for line in response.iter_lines():
        if not line:
            continue
        data = json.loads(line)
        token = data.get("response", "")
        if token:
            yield f"data: {json.dumps({'token': token})}\n\n"
        if data.get("done"):
            yield "data: [DONE]\n\n"
            break
