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
    # Exclude explanation/detail requests
    if any(w in q for w in ("explain", "describe", "detail", "brief", "summary",
                             "about", "what does", "what do", "overview", "meaning")):
        return False
    # Exclude queries targeting a specific control number
    if re.search(r'\bcontrol\s+\d+\b', q):
        return False
    has_control = "control" in q
    has_list_intent = any(w in q for w in ("list", "what are", "name", "show", "give"))
    has_all_marker = "all" in q or "18" in q or "every" in q
    return has_control and (has_list_intent or has_all_marker)


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


def _strip_references_section(text: str) -> str:
    """Remove any trailing References/Sources/Bibliography section the LLM may have added."""
    return re.sub(
        r'\n+(?:References|Sources|Bibliography|Citations)\s*:?.*$',
        '',
        text,
        flags=re.DOTALL | re.IGNORECASE,
    ).rstrip()


def _normalize_citations(text: str, sources: list[dict]) -> tuple[str, list[dict]]:
    """
    Renumber citations sequentially based on order of first appearance and
    filter sources to only those actually cited in the response.
    e.g. if LLM used [1],[2],[4] → remapped to [1],[2],[3], source [4]→[3].
    """
    used_order: list[int] = []
    for m in re.finditer(r'\[(\d+)\]', text):
        n = int(m.group(1))
        if n not in used_order:
            used_order.append(n)

    if not used_order:
        return text, []

    remap = {old: new for new, old in enumerate(used_order, start=1)}

    new_text = re.sub(
        r'\[(\d+)\]',
        lambda m: f"[{remap.get(int(m.group(1)), int(m.group(1)))}]",
        text,
    )

    source_map = {s["id"]: s for s in sources}
    new_sources = []
    for old_num in used_order:
        if old_num in source_map:
            s = dict(source_map[old_num])
            s["id"] = remap[old_num]
            new_sources.append(s)

    return new_text, new_sources


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
        "Answer the question using ONLY the context provided below. Do not use outside knowledge.\n\n"
        "Formatting rules:\n"
        "- Use **bold** for CIS Control names, security terms, and key concepts.\n"
        "- Use a bulleted list (- item) or numbered list whenever you mention multiple items, safeguards, or steps.\n\n"
        "Citation rules:\n"
        "- Place the source number in brackets immediately after the sentence that uses it: [1], [2], or [3].\n"
        "- Only use numbers 1 to " + str(len(top_chunks)) + " — do not invent other numbers.\n"
        "- Do NOT add a References, Sources, or bibliography section at the end. Citations must be inline only.\n\n"
        "Example of correct output:\n"
        "**Audit Log Management** requires collecting logs from all enterprise assets [1]. "
        "Logs must be retained to prevent tampering [2].\n\n"
        f"{history_section}"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer:"
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

    full_response = ""
    for line in response.iter_lines():
        if not line:
            continue
        data = json.loads(line)
        token = data.get("response", "")
        if token:
            full_response += token
            yield f"data: {json.dumps({'token': token})}\n\n"
        if data.get("done"):
            break

    # Post-process after streaming completes — send corrected version
    full_response = _strip_references_section(full_response)
    raw_sources = _build_sources_payload(top_chunks)
    full_response, sources = _normalize_citations(full_response, raw_sources)

    yield f"data: {json.dumps({'replace': full_response})}\n\n"
    yield f"data: {json.dumps({'sources': sources})}\n\n"
    yield "data: [DONE]\n\n"
