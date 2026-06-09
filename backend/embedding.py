import numpy as np
from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL_NAME

# Loaded once at startup
_model = SentenceTransformer(EMBEDDING_MODEL_NAME)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts and return unit-normalized vectors."""
    vectors = _model.encode(texts, show_progress_bar=False)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return (vectors / norms).tolist()


def embed_query(query: str) -> list[float]:
    """Embed a single query string and return a unit-normalized vector."""
    vector = _model.encode(query)
    return (vector / np.linalg.norm(vector)).tolist()
