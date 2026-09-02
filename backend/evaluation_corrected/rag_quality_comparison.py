import json
import time
from pathlib import Path
from collections import defaultdict

import requests


# =========================================================
# CONFIGURATION
# =========================================================

OLLAMA_URL = "http://localhost:11434/api/generate"
RETRIEVAL_URL = "http://localhost:8000/api/retrieval/search"

MODEL = "codellama:7b-instruct"
TOP_K = 3

BASE_DIR = Path(__file__).resolve().parent
DATASET = BASE_DIR / "rag_quality_dataset.json"
RESULTS_DIR = BASE_DIR / "results"
OUTPUT = RESULTS_DIR / "rag_quality_comparison.json"

RESULTS_DIR.mkdir(parents=True, exist_ok=True)

OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256
}


# =========================================================
# LOAD DATASET
# =========================================================

with open(DATASET, encoding="utf-8") as f:
    questions = json.load(f)


# =========================================================
# OLLAMA
# =========================================================

def generate(prompt):

    start = time.perf_counter()

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "0",
            "options": OPTIONS
        },
        timeout=600
    )

    response.raise_for_status()

    elapsed = time.perf_counter() - start

    data = response.json()

    return {
        "answer": data.get("response", "").strip(),
        "latency": elapsed,
        "prompt_tokens": data.get("prompt_eval_count", 0),
        "generated_tokens": data.get("eval_count", 0)
    }


# =========================================================
# RETRIEVAL
# =========================================================

def retrieve(question):

    start = time.perf_counter()

    response = requests.post(
        RETRIEVAL_URL,
        json={
            "question": question,
            "top_k": TOP_K
        },
        timeout=120
    )

    response.raise_for_status()

    elapsed = time.perf_counter() - start

    chunks = response.json().get("results", [])

    return chunks, elapsed


def build_context(chunks):

    parts = []

    for i, chunk in enumerate(chunks, 1):

        text = chunk.get("text", "").strip()

        document = chunk.get(
            "document",
            chunk.get("file", "unknown")
        )

        page = chunk.get("page", "")

        score = chunk.get("score", 0)

        parts.append(
            f"[Context {i}]\n"
            f"Document: {document}\n"
            f"Page: {page}\n"
            f"Similarity: {score}\n"
            f"{text}"
        )

    return "\n\n".join(parts)


# =========================================================
# PROMPTS
# =========================================================

def rag_prompt(question, context):

    return f"""
You are an insurance policy assistant.

Answer the question using ONLY the retrieved policy evidence.

IMPORTANT RULES:

1. Do not use outside knowledge.
2. Do not invent policy terms.
3. Do not invent waiting periods.
4. Do not invent coverage.
5. Do not invent exclusions.
6. If the evidence does not contain enough information,
   explicitly say that the available insurance documents
   do not contain enough information to answer the question.
7. For document identification questions, identify the
   document only from the supplied evidence.
8. For out-of-scope questions, refuse rather than guessing.

RETRIEVED POLICY EVIDENCE:

{context}

QUESTION:

{question}

ANSWER:
"""


def norag_prompt(question):

    return f"""
You are an insurance policy assistant.

Answer the question using your own model knowledge.

IMPORTANT:

You do NOT have access to the InsureMate policy documents.

Do not pretend that you know the contents of the
specific insurance documents.

If the question requires information from the
InsureMate knowledge base and you do not know it,
say that you do not have enough information.

For questions outside the insurance knowledge base,
do not fabricate an answer.

QUESTION:

{question}

ANSWER:
"""


# =========================================================
# AUTOMATIC QUALITY HEURISTICS
# =========================================================

REFUSAL_TERMS = [
    "not enough information",
    "cannot determine",
    "cannot be determined",
    "do not have enough",
    "don't have enough",
    "not mentioned",
    "cannot answer",
    "can't answer",
    "do not have access",
    "don't have access",
    "unable to determine",
    "outside the scope",
    "out of scope"
]


def is_refusal(answer):

    text = answer.lower()

    return any(
        term in text
        for term in REFUSAL_TERMS
    )


def score_answer(item, answer, rag):

    text = answer.lower()

    qid = item["id"]

    # -----------------------------------------------------
    # OUT OF SCOPE
    # -----------------------------------------------------

    if item["type"] == "out_of_scope":

        if is_refusal(answer):
            return "correct"

        return "incorrect"


    # -----------------------------------------------------
    # URINARY STONES
    # -----------------------------------------------------

    if qid == "Q04":

        if "24 month" in text or "24-month" in text:
            return "correct"

        if is_refusal(answer):
            return "incorrect"

        return "incorrect"


    # -----------------------------------------------------
    # OTHER POLICY QUESTIONS
    #
    # For these questions we avoid pretending that
    # keyword matching proves complete correctness.
    # The result is classified as answer/refusal and
    # marked for manual verification.
    # -----------------------------------------------------

    if is_refusal(answer):

        return "manual_review"

    return "manual_review"


# =========================================================
# RUN EXPERIMENT
# =========================================================

print("=" * 78)
print("INSUREMATE - CORRECTED RAG QUALITY COMPARISON")
print("=" * 78)

print(f"\nModel: {MODEL}")
print(f"Top-K: {TOP_K}")
print(f"Questions: {len(questions)}")

print("\nConditions:")
print("  1. RAG ON")
print("  2. RAG OFF")

results = []


for index, item in enumerate(questions, 1):

    qid = item["id"]
    question = item["question"]

    print("\n" + "-" * 78)
    print(f"{qid}: {question}")
    print("-" * 78)

    # =====================================================
    # RAG
    # =====================================================

    print("\n[RAG ON]")

    chunks, retrieval_latency = retrieve(question)

    context = build_context(chunks)

    rag_result = generate(
        rag_prompt(question, context)
    )

    rag_score = score_answer(
        item,
        rag_result["answer"],
        True
    )

    print(
        f"Retrieved chunks: {len(chunks)}"
    )

    print(
        f"Generation latency: "
        f"{rag_result['latency']:.2f}s"
    )

    print(
        f"Quality classification: "
        f"{rag_score}"
    )

    print(
        "Answer:",
        rag_result["answer"]
    )

    results.append({
        "question_id": qid,
        "question": question,
        "condition": "RAG_ON",
        "model": MODEL,
        "answer": rag_result["answer"],
        "classification": rag_score,
        "retrieval_latency_seconds":
            round(retrieval_latency, 3),
        "generation_latency_seconds":
            round(rag_result["latency"], 3),
        "prompt_tokens":
            rag_result["prompt_tokens"],
        "generated_tokens":
            rag_result["generated_tokens"],
        "retrieved_chunks": chunks,
        "context_characters": len(context),
        "status": "success"
    })


    # =====================================================
    # NO RAG
    # =====================================================

    print("\n[NO RAG]")

    norag_result = generate(
        norag_prompt(question)
    )

    norag_score = score_answer(
        item,
        norag_result["answer"],
        False
    )

    print(
        f"Generation latency: "
        f"{norag_result['latency']:.2f}s"
    )

    print(
        f"Quality classification: "
        f"{norag_score}"
    )

    print(
        "Answer:",
        norag_result["answer"]
    )

    results.append({
        "question_id": qid,
        "question": question,
        "condition": "NO_RAG",
        "model": MODEL,
        "answer": norag_result["answer"],
        "classification": norag_score,
        "retrieval_latency_seconds": 0,
        "generation_latency_seconds":
            round(norag_result["latency"], 3),
        "prompt_tokens":
            norag_result["prompt_tokens"],
        "generated_tokens":
            norag_result["generated_tokens"],
        "retrieved_chunks": [],
        "context_characters": 0,
        "status": "success"
    })


# =========================================================
# SUMMARY
# =========================================================

groups = defaultdict(list)

for result in results:

    groups[result["condition"]].append(result)


summary = {}

for condition, rows in groups.items():

    correct = sum(
        r["classification"] == "correct"
        for r in rows
    )

    incorrect = sum(
        r["classification"] == "incorrect"
        for r in rows
    )

    manual = sum(
        r["classification"] == "manual_review"
        for r in rows
    )

    scored = correct + incorrect

    accuracy = (
        correct / scored * 100
        if scored
        else None
    )

    refusal_count = sum(
        is_refusal(r["answer"])
        for r in rows
    )

    avg_latency = (
        sum(
            r["generation_latency_seconds"]
            for r in rows
        ) / len(rows)
    )

    summary[condition] = {
        "evaluations": len(rows),
        "correct": correct,
        "incorrect": incorrect,
        "manual_review": manual,
        "accuracy_percent_excluding_manual":
            round(accuracy, 2)
            if accuracy is not None
            else None,
        "refusal_count": refusal_count,
        "average_generation_latency_seconds":
            round(avg_latency, 3)
    }


# =========================================================
# QUESTION-LEVEL WINNER
# =========================================================

pairs = defaultdict(dict)

for r in results:

    pairs[r["question_id"]][
        r["condition"]
    ] = r


comparisons = []

for qid, pair in pairs.items():

    rag = pair["RAG_ON"]
    norag = pair["NO_RAG"]

    if (
        rag["classification"] == "correct"
        and norag["classification"] != "correct"
    ):
        winner = "RAG"

    elif (
        norag["classification"] == "correct"
        and rag["classification"] != "correct"
    ):
        winner = "NO_RAG"

    else:
        winner = "tie_or_manual_review"

    comparisons.append({
        "question_id": qid,
        "rag_classification":
            rag["classification"],
        "no_rag_classification":
            norag["classification"],
        "winner": winner
    })


# =========================================================
# SAVE
# =========================================================

output = {
    "metadata": {
        "experiment":
            "Corrected RAG Quality Comparison",
        "model": MODEL,
        "top_k": TOP_K,
        "same_questions": True,
        "same_model": True,
        "same_generation_settings": True,
        "only_difference":
            "retrieved policy context availability"
    },

    "summary": summary,

    "question_comparisons":
        comparisons,

    "results": results
}


with open(
    OUTPUT,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        indent=2,
        ensure_ascii=False
    )


# =========================================================
# PRINT SUMMARY
# =========================================================

print("\n" + "=" * 78)
print("CORRECTED RAG QUALITY EXPERIMENT COMPLETED")
print("=" * 78)

for condition, data in summary.items():

    print(f"\n{condition}")

    print(
        f"  Correct:       {data['correct']}"
    )

    print(
        f"  Incorrect:     {data['incorrect']}"
    )

    print(
        f"  Manual review: {data['manual_review']}"
    )

    print(
        f"  Accuracy*:     "
        f"{data['accuracy_percent_excluding_manual']}"
    )

    print(
        f"  Refusals:      {data['refusal_count']}"
    )

    print(
        f"  Avg latency:   "
        f"{data['average_generation_latency_seconds']}s"
    )

print("\n* Manual-review cases are not included in accuracy.")

print(f"\nSaved to:")
print(OUTPUT)

print("=" * 78)
