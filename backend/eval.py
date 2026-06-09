"""
RAG Evaluation Pipeline
Run with: uv run python eval.py
Requires: Weaviate running, Ollama running with llama3.2:3b
"""

import json
import os

os.environ["DEEPEVAL_NUM_THREADS"] = "1"
os.environ["DEEPEVAL_PER_ATTEMPT_TIMEOUT_SECONDS_OVERRIDE"] = "300"
os.environ["DEEPEVAL_TELEMETRY_OPT_OUT"] = "YES"

from deepeval import evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    FaithfulnessMetric,
)
from deepeval.models import OllamaModel
from deepeval.test_case import LLMTestCase

from retrieval import retrieve
from reranking import rerank
from agent import generate_answer, knowledge_agent
from config import RETRIEVE_K, RERANK_TOP_K

GOLDEN_PATH = "../rag_setup/golden_dataset.json"
BATCH_SIZE = 2


def build_test_cases(goldens: list[dict]) -> list[LLMTestCase]:
    test_cases = []
    for i, g in enumerate(goldens):
        query = g["question"]
        print(f"[{i+1}/{len(goldens)}] Running pipeline for: {query[:60]}...")

        # Run full pipeline and capture retrieval context for eval
        chunks = retrieve(query, k=RETRIEVE_K)
        top_chunks = rerank(query, chunks, top_k=RERANK_TOP_K)
        actual_output = generate_answer(query, top_chunks)
        retrieval_context = [chunk for chunk, _ in top_chunks]

        test_cases.append(
            LLMTestCase(
                input=query,
                actual_output=actual_output,
                expected_output=g["ground_truth_answer"],
                retrieval_context=retrieval_context,
            )
        )
    return test_cases


def run_eval():
    with open(GOLDEN_PATH) as f:
        goldens = json.load(f)

    goldens = goldens[:5]
    print(f"Loaded {len(goldens)} golden questions\n")
    print("=" * 60)
    print("Step 1: Generating pipeline outputs...")
    print("=" * 60)

    test_cases = build_test_cases(goldens)

    judge = OllamaModel(model="llama3.2:3b")

    metrics = [
        AnswerRelevancyMetric(threshold=0.6, model=judge),
        FaithfulnessMetric(threshold=0.7, model=judge),
        ContextualPrecisionMetric(threshold=0.6, model=judge),
        ContextualRecallMetric(threshold=0.5, model=judge),
        ContextualRelevancyMetric(threshold=0.6, model=judge),
    ]

    print("\n" + "=" * 60)
    print("Step 2: Running DeepEval metrics (batch size = 2)...")
    print("=" * 60 + "\n")

    all_results = []
    for i in range(0, len(test_cases), BATCH_SIZE):
        batch = test_cases[i : i + BATCH_SIZE]
        print(f"Batch {i // BATCH_SIZE + 1} ({len(batch)} cases)...")
        result = evaluate(batch, metrics)
        all_results.append(result)

    print("\n" + "=" * 60)
    print("EVALUATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run_eval()
