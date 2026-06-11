from sentence_transformers import CrossEncoder

from config import RERANKER_MODEL_NAME, RERANK_TOP_K

# Loaded once at startup
_reranker = CrossEncoder(RERANKER_MODEL_NAME)


def rerank(
    query: str,
    chunks: list[dict],
    top_k: int = RERANK_TOP_K,
) -> list[tuple[dict, float]]:
    """
    Score each (query, chunk) pair with a cross-encoder and return the
    top_k most relevant chunks, ordered using 'lost in the middle' placement:
    best chunk first, second-best last, rest in between.
    This counters the tendency of LLMs to ignore context in the middle.
    """
    pairs = [(query, c["text"]) for c in chunks]
    scores = _reranker.predict(pairs)

    ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
    top = ranked[:top_k]

    return _lost_in_middle(top)


def _lost_in_middle(chunks: list[tuple[dict, float]]) -> list[tuple[dict, float]]:
    """
    Reorder so the highest-scored chunks appear at the start and end of
    the list. LLMs pay more attention to content at the boundaries.
    """
    if len(chunks) <= 2:
        return chunks

    # Even positions → start of context, odd positions → end of context
    start = [c for i, c in enumerate(chunks) if i % 2 == 0]
    end = [c for i, c in enumerate(chunks) if i % 2 != 0]

    return start + list(reversed(end))
