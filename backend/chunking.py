# Ingestion-time script — not needed for the API to run.
# Run from rag_setup environment: uv run python chunking.py
# Extra deps: pip install langchain-text-splitters

import re
from collections import defaultdict

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from config import CHUNK_SIZE, CHUNK_OVERLAP


def _is_bad_chunk(text: str) -> bool:
    text = text.strip()

    if len(text.split()) < 25:
        return True

    # OCR artifacts and formatting noise
    if re.search(r"[|]{2,}|[_]{2,}|[•]{3,}", text):
        return True

    # Glossary / acronym-heavy sections with low information density
    words = text.split()
    if words and sum(w.isupper() for w in words) / len(words) > 0.35:
        return True

    # Garbage text: too few actual letters
    alpha_ratio = sum(c.isalpha() for c in text) / max(len(text), 1)
    if alpha_ratio < 0.65:
        return True

    return False


def chunk_documents(docs: list[Document]) -> list[dict]:
    """Merge elements by page, split into overlapping chunks, and filter noise."""
    pages: dict[int, list[str]] = defaultdict(list)
    for doc in docs:
        page = doc.metadata.get("page_number", -1)
        pages[page].append(doc.page_content)

    merged = [
        {"text": "\n\n".join(pages[p]), "page": p}
        for p in sorted(pages.keys())
    ]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " ", ""],
    )

    chunks = []
    for doc in merged:
        for i, text in enumerate(splitter.split_text(doc["text"])):
            if not _is_bad_chunk(text):
                chunks.append({
                    "text": text,
                    "metadata": {
                        "source": "CIS v8",
                        "page": doc["page"],
                        "sub_chunk": i,
                    },
                })

    print(f"Chunking: {len(merged)} pages → {len(chunks)} clean chunks")
    return chunks
