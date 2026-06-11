WEAVIATE_HOST = "localhost"
WEAVIATE_PORT = 8080
WEAVIATE_GRPC_PORT = 50051
COLLECTION_NAME = "CISControls"

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
RERANKER_MODEL_NAME = "BAAI/bge-reranker-v2-m3"

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"

# How many candidates to pull from Weaviate before reranking
RETRIEVE_K = 20
# How many reranked chunks to send to the LLM
RERANK_TOP_K = 3

# Ingestion settings (used by chunking.py — ~300 tokens per chunk)
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150
PDF_PATH = "../rag_setup/data/CIS_Controls__v8__Critical_Security_Controls__2023_08.pdf"
