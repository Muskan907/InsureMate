import json
import time
from pathlib import Path

import requests


# =========================================================
# CONFIGURATION
# =========================================================

OLLAMA_URL = "http://localhost:11434/api/generate"

RETRIEVAL_URL = "http://localhost:8000/api/retrieval/search"

MODEL = "codellama:7b-instruct"

TOP_K = 3

BASE_DIR = Path(__file__).resolve().parent

DATASET_FILE = BASE_DIR / "dataset.json"

RESULTS_DIR = BASE_DIR / "results"

OUTPUT_FILE = RESULTS_DIR / "retrieval_ablation.json"

RESULTS_DIR.mkdir(exist_ok=True)


# =========================================================
# SELECTED QUESTIONS
# =========================================================

QUESTION_IDS = [
    "Q02",
    "Q04",
    "Q06",
    "Q08",
    "Q10",
    "Q11",
    "Q18",
    "Q20",
]


# =========================================================
# GENERATION SETTINGS
# =========================================================

OLLAMA_OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256,
}


# =========================================================
# LOAD DATASET
# =========================================================

with open(DATASET_FILE, encoding="utf-8") as f:
    dataset = json.load(f)


questions = [
    q for q in dataset
    if q["id"] in QUESTION_IDS
]


# =========================================================
# HEALTH CHECK
# =========================================================

def ollama_available():

    try:

        r = requests.get(
            "http://localhost:11434/api/tags",
            timeout=10
        )

        return r.ok

    except Exception:

        return False


# =========================================================
# RETRIEVE CONTEXT
# =========================================================

def retrieve_context(question):

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

    latency = time.perf_counter() - start

    data = response.json()

    chunks = data.get("results", [])

    if not chunks:
        raise RuntimeError(
            "No retrieval results returned."
        )

    context_parts = []

    for i, chunk in enumerate(chunks, 1):

        text = chunk.get(
            "text",
            ""
        ).strip()

        context_parts.append(
            f"[Context {i}]\n{text}"
        )

    context = "\n\n".join(context_parts)

    return context, chunks, latency


# =========================================================
# RAG PROMPT
# =========================================================

def build_rag_prompt(question, context):

    return f"""You are an insurance policy assistant.

Answer the question using ONLY the policy
context provided below.

If the answer cannot be determined from the
provided context, say that the available
insurance documents do not contain enough
information to answer the question.

Do not invent or assume policy terms,
waiting periods, coverage amounts,
exclusions, or conditions.

POLICY CONTEXT:

{context}

QUESTION:

{question}

ANSWER:
"""


# =========================================================
# NO-RAG PROMPT
# =========================================================

def build_no_rag_prompt(question):

    return f"""You are an insurance policy assistant.

Answer the following question using your
existing knowledge.

Do not pretend that you have access to
specific InsureMate policy documents.

If you do not know the answer, clearly say
that you do not have enough information.

QUESTION:

{question}

ANSWER:
"""


# =========================================================
# CALL OLLAMA
# =========================================================

def run_model(prompt):

    start = time.perf_counter()

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "0",
            "options": OLLAMA_OPTIONS
        },
        timeout=600
    )

    response.raise_for_status()

    latency = time.perf_counter() - start

    data = response.json()

    answer = data.get(
        "response",
        ""
    ).strip()

    return answer, latency


# =========================================================
# START
# =========================================================

if not ollama_available():

    print("ERROR: Ollama is not available.")

    raise SystemExit(1)


print("=" * 75)
print("INSUREMATE WEEK 4 - RETRIEVAL ABLATION")
print("=" * 75)

print("\nPurpose:")
print("Compare the same LLM with RAG enabled and disabled.")

print("\nIMPORTANT:")
print("- Does NOT call /api/chat")
print("- Does NOT use multi-model orchestration")
print("- Does NOT modify production code")
print("- Same model used in both conditions")
print("- Same questions used in both conditions")
print("- Same generation settings used in both conditions")

print("\nModel:")
print(f"  {MODEL}")

print(f"\nQuestions: {len(questions)}")

print("\nConditions:")
print("  1. RAG ON")
print("  2. RAG OFF")


results = []


# =========================================================
# RUN EXPERIMENT
# =========================================================

for index, question_data in enumerate(
    questions,
    start=1
):

    qid = question_data["id"]

    question = question_data["question"]

    print("\n" + "-" * 75)

    print(
        f"{qid}: {question}"
    )

    print("-" * 75)


    # -----------------------------------------------------
    # RAG ON
    # -----------------------------------------------------

    print("\n[RAG ON]")

    try:

        context, chunks, retrieval_latency = (
            retrieve_context(question)
        )

        print(
            f"Retrieved {len(chunks)} chunks"
        )

        print(
            f"Retrieval time: "
            f"{retrieval_latency:.2f}s"
        )

        prompt = build_rag_prompt(
            question,
            context
        )

        answer, generation_latency = run_model(
            prompt
        )

        print(
            f"Generation time: "
            f"{generation_latency:.2f}s"
        )

        print("Answer:")

        print(answer)

        rag_result = {
            "question_id": qid,
            "condition": "rag_on",
            "model": MODEL,
            "question": question,
            "retrieval_top_k": TOP_K,
            "retrieval_latency_seconds":
                round(retrieval_latency, 3),
            "generation_latency_seconds":
                round(generation_latency, 3),
            "context_characters":
                len(context),
            "retrieved_chunks":
                chunks,
            "answer":
                answer,
            "status":
                "success"
        }

    except Exception as e:

        print(
            f"RAG ERROR: {e}"
        )

        rag_result = {
            "question_id": qid,
            "condition": "rag_on",
            "model": MODEL,
            "question": question,
            "answer": "",
            "status": "error",
            "error": str(e)
        }


    results.append(rag_result)


    # -----------------------------------------------------
    # RAG OFF
    # -----------------------------------------------------

    print("\n[RAG OFF]")

    try:

        prompt = build_no_rag_prompt(
            question
        )

        answer, generation_latency = run_model(
            prompt
        )

        print(
            f"Generation time: "
            f"{generation_latency:.2f}s"
        )

        print("Answer:")

        print(answer)

        no_rag_result = {
            "question_id": qid,
            "condition": "rag_off",
            "model": MODEL,
            "question": question,
            "generation_latency_seconds":
                round(generation_latency, 3),
            "context_characters":
                0,
            "retrieved_chunks":
                [],
            "answer":
                answer,
            "status":
                "success"
        }

    except Exception as e:

        print(
            f"NO-RAG ERROR: {e}"
        )

        no_rag_result = {
            "question_id": qid,
            "condition": "rag_off",
            "model": MODEL,
            "question": question,
            "answer": "",
            "status": "error",
            "error": str(e)
        }


    results.append(no_rag_result)


# =========================================================
# SAVE RESULTS
# =========================================================

successful = sum(
    1
    for r in results
    if r.get("status") == "success"
)

failed = len(results) - successful


output = {

    "metadata": {

        "evaluation":
            "Retrieval Ablation",

        "model":
            MODEL,

        "questions":
            QUESTION_IDS,

        "conditions":
            [
                "rag_on",
                "rag_off"
            ],

        "top_k":
            TOP_K,

        "experimental_control":
            (
                "Same model, same questions, "
                "same generation settings. "
                "Only retrieval availability "
                "is changed."
            ),

        "production_orchestration_used":
            False

    },

    "results":
        results

}


with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        indent=2,
        ensure_ascii=False
    )


print("\n" + "=" * 75)
print("RETRIEVAL ABLATION COMPLETED")
print("=" * 75)

print(
    f"\nSuccessful evaluations: "
    f"{successful}/{len(results)}"
)

print(
    f"Failed evaluations: "
    f"{failed}"
)

print(
    f"\nSaved to:\n{OUTPUT_FILE}"
)

print("=" * 75)
