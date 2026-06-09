# Ingestion-time script — run once to populate Weaviate.
# Usage: uv run python ingestion.py
# WARNING: deletes and recreates the CISControls collection on each run.

import weaviate
from weaviate.classes.config import Configure, Property, DataType

from config import (
    WEAVIATE_HOST, WEAVIATE_PORT, WEAVIATE_GRPC_PORT,
    COLLECTION_NAME, PDF_PATH,
)
from parsing import parse
from chunking import chunk_documents
from embedding import embed_texts


def _get_client() -> weaviate.WeaviateClient:
    return weaviate.connect_to_local(
        host=WEAVIATE_HOST,
        port=WEAVIATE_PORT,
        grpc_port=WEAVIATE_GRPC_PORT,
    )


def _setup_collection(client: weaviate.WeaviateClient):
    client.collections.delete(COLLECTION_NAME)
    return client.collections.create(
        name=COLLECTION_NAME,
        vectorizer_config=Configure.Vectorizer.none(),
        properties=[
            Property(name="text", data_type=DataType.TEXT),
            Property(name="source", data_type=DataType.TEXT),
            Property(name="chunk_id", data_type=DataType.INT),
        ],
    )


def ingest(pdf_path: str = PDF_PATH):
    """Full ingestion pipeline: parse → chunk → embed → store in Weaviate."""
    docs = parse(pdf_path)
    chunks = chunk_documents(docs)

    texts = [c["text"] for c in chunks]
    vectors = embed_texts(texts)

    client = _get_client()
    try:
        collection = _setup_collection(client)
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            collection.data.insert(
                properties={
                    "text": chunk["text"],
                    "source": chunk["metadata"]["source"],
                    "chunk_id": i,
                },
                vector=vector,
            )
        print(f"Ingestion complete: {len(chunks)} chunks stored in '{COLLECTION_NAME}'")
    finally:
        client.close()


if __name__ == "__main__":
    ingest()
