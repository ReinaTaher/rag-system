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


_RAG_KEYWORDS = {
    "cis", "control", "controls", "security", "cybersecurity", "vulnerability",
    "vulnerabilities", "asset", "assets", "malware", "network", "firewall",
    "patch", "patching", "audit", "access", "authentication", "encryption",
    "incident", "penetration", "compliance", "risk", "data protection",
    "backup", "recovery", "monitoring", "log", "logs", "logging", "email",
    "browser", "software", "hardware", "inventory", "safeguard", "safeguards",
    "ransomware", "phishing", "endpoint", "privilege", "account", "password",
    "multifactor", "mfa", "dns", "vpn", "segmentation", "awareness", "training",
}


def _is_rag_query(query: str) -> bool:
    """Return True if the query is about cybersecurity / CIS Controls."""
    q_lower = query.lower()
    return any(kw in q_lower for kw in _RAG_KEYWORDS)


def _is_list_all_query(query: str) -> bool:
    q = query.lower()
    wants_explanation = any(w in q for w in (
        "explain", "description", "describe", "detail", "short", "brief",
        "summary", "about", "what does", "what do", "overview", "meaning",
    ))
    if wants_explanation:
        return False
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


def _build_free_chat_prompt(query: str, history: list[dict] | None = None) -> str:
    history_section = ""
    if history:
        history_section = f"Previous conversation:\n{_format_history(history)}\n\n"
    return (
        "You are a helpful and friendly AI assistant.\n\n"
        f"{history_section}"
        f"Human: {query}\nAssistant:"
    )


def _free_chat_answer(query: str, history: list[dict] | None = None) -> str:
    prompt = _build_free_chat_prompt(query, history)
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.7}},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["response"]


def _stream_free_chat(query: str, history: list[dict] | None = None) -> Generator[str, None, None]:
    prompt = _build_free_chat_prompt(query, history)
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": True, "options": {"temperature": 0.7}},
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


def generate_answer(
    query: str,
    top_chunks: list[tuple[dict, float]],
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
    """Route to RAG pipeline for security queries, free chat otherwise."""
    history = (history or [])[-HISTORY_LIMIT:]
    if not _is_rag_query(query):
        return _free_chat_answer(query, history)
    if _is_list_all_query(query):
        return _all_controls_answer()
    retrieval_query = _contextualize_query(query, history)
    chunks = retrieve(retrieval_query, k=RETRIEVE_K)
    top_chunks = rerank(retrieval_query, chunks, top_k=RERANK_TOP_K)
    return generate_answer(query, top_chunks, history)


def _build_sources_payload(top_chunks: list[tuple[dict, float]]) -> list[dict]:
    """Build the sources list to send to the frontend."""
    return [
        {
            "id": i,
            "text": chunk["text"][:300] + ("…" if len(chunk["text"]) > 300 else ""),
            "source": chunk["source"],
            "chunk_id": chunk["chunk_id"],
        }
        for i, (chunk, _) in enumerate(top_chunks, start=1)
    ]


def _build_prompt(
    query: str,
    top_chunks: list[tuple[dict, float]],
    history: list[dict] | None = None,
) -> str:
    """Shared prompt builder used by both streaming and non-streaming paths."""
    context_parts = []
    for i, (chunk, _) in enumerate(top_chunks, start=1):
        context_parts.append(f"[{i}] {chunk['text']}")
    context = "\n\n".join(context_parts)

    history_section = ""
    if history:
        history_section = f"Previous conversation:\n{_format_history(history)}\n\n"
    return (
        "You are an expert assistant on CIS Critical Security Controls v8.\n\n"
        "You MUST cite sources inline. Every sentence that uses information from the context "
        "must end with the citation number in brackets, like this: [1] or [2].\n"
        "Example of correct citation usage: \"Assets must be inventoried regularly [1]. "
        "Software licenses should also be tracked [2].\"\n\n"
        "Answer the question using ONLY the context provided below. Do not use outside knowledge.\n\n"
        "Rules:\n"
        "- Add [1], [2], etc. after EVERY sentence that draws from the context. Do not skip citations.\n"
        "- Cite specific CIS Control numbers and names when they appear in the context.\n"
        "- If the question asks for a list, respond with a clear numbered or bulleted list.\n"
        "- If the question asks what a control is or what it covers, give a complete summary: its purpose, why it is critical, and its key safeguards.\n"
        "- Be specific and complete — avoid one-line answers for overview questions.\n"
        "- Write your full answer first. Only if the context contains absolutely no relevant information, end with exactly: 'This information is not available in the provided context.' Never add this phrase after you have already given an answer.\n\n"
        f"{history_section}"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer (remember to add [1], [2], etc. after each sentence):"
    )


def stream_knowledge_agent(
    query: str, history: list[dict] | None = None, temperature: float = 0
) -> Generator[str, None, None]:
    """Route to streaming RAG pipeline for security queries, free chat otherwise."""
    history = (history or [])[-HISTORY_LIMIT:]
    if not _is_rag_query(query):
        yield from _stream_free_chat(query, history)
        return
    if _is_list_all_query(query):
        for word in _all_controls_answer().split(" "):
            yield f"data: {json.dumps({'token': word + ' '})}\n\n"
        yield "data: [DONE]\n\n"
        return
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
            "options": {"temperature": temperature},
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
            sources = _build_sources_payload(top_chunks)
            yield f"data: {json.dumps({'sources': sources})}\n\n"
            yield "data: [DONE]\n\n"
            break
