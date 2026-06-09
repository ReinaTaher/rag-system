import atexit

import weaviate

from config import (
    WEAVIATE_HOST, WEAVIATE_PORT, WEAVIATE_GRPC_PORT,
    COLLECTION_NAME, RETRIEVE_K,
)
from embedding import embed_query

# Weaviate connection — opened once at startup, closed on process exit
_client = weaviate.connect_to_local(
    host=WEAVIATE_HOST,
    port=WEAVIATE_PORT,
    grpc_port=WEAVIATE_GRPC_PORT,
)
_collection = _client.collections.get(COLLECTION_NAME)
atexit.register(_client.close)


def retrieve(query: str, k: int = RETRIEVE_K) -> list[str]:
    """
    Embed the query and return the top-k most similar chunks from Weaviate,
    ranked by cosine similarity (native ANN search — no custom re-scoring).
    """
    query_vector = embed_query(query)

    results = _collection.query.near_vector(
        near_vector=query_vector,
        limit=k,
    )

    return [obj.properties["text"] for obj in results.objects]
