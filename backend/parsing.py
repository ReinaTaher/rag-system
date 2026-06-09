# Ingestion-time script — not needed for the API to run.
# Run from rag_setup environment: uv run python parsing.py
# Extra deps: pip install langchain-unstructured unstructured[pdf]

from langchain_unstructured import UnstructuredLoader
from langchain_core.documents import Document


def _is_valid(doc: Document) -> bool:
    text = doc.page_content.strip()
    if len(text) < 40:
        return False
    # Drop elements that are mostly non-alphabetic (noise, OCR garbage)
    if sum(c.isalpha() for c in text) < 15:
        return False
    return True


def parse(pdf_path: str) -> list[Document]:
    """Load a PDF with layout-aware parsing and return clean document elements."""
    loader = UnstructuredLoader(
        file_path=pdf_path,
        strategy="hi_res",
        infer_table_structure=True,
    )
    docs = loader.load()
    clean = [d for d in docs if _is_valid(d)]
    print(f"Parsing: {len(docs)} raw elements → {len(clean)} after cleaning")
    return clean
