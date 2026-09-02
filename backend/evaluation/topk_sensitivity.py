import json
import time
from pathlib import Path
from datetime import datetime

import requests


# =========================================================
# CONFIGURATION
# =========================================================

OLLAMA_URL = "http://localhost:11434/api/generate"

RETRIEVAL_URL = (
    "http://localhost:8000/api/retrieval/search"
)

MODELS = [
    "codellama:7b-instruct",
]

# Small controlled experiment.
# We do NOT rerun all 25 questions.
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

TOP_K_VALUES = [
    1,
    3,
    5,
]

BASE_DIR = Path(__file__).parent

DATASET_FILE = (
    BASE_DIR / "dataset.json"
)

RESULTS_DIR = (
    BASE_DIR / "results"
)

OUTPUT_FILE = (
    RESULTS_DIR /
    "topk_sensitivity.json"
)

RESULTS_DIR.mkdir(exist_ok=True)


# =========================================================
# GENERATION SETTINGS
# =========================================================

OLLAMA_OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256,
}


# =========================================================
# CONTEXT SETTINGS
# =========================================================

MAX_CHARS_PER_CHUNK = 1500
MAX_TOTAL_CONTEXT_CHARS = 4000


# =========================================================
# LOAD DATASET
# =========================================================

with open(
    DATASET_FILE,
    "r",
    encoding="utf-8"
) as f:

    dataset = json.load(f)


questions = [
    q for q in dataset
    if q["id"] in QUESTION_IDS
]


if len(questions) != len(QUESTION_IDS):

    found = {
        q["id"]
        for q in questions
    }

    missing = [
        qid
        for qid in QUESTION_IDS
        if qid not in found
    ]

    raise RuntimeError(
        f"Missing questions from dataset: {missing}"
    )


# =========================================================
# PREPARE CONTEXT
# =========================================================

def prepare_context(chunks):

    context_parts = []

    for i, chunk in enumerate(
        chunks,
        start=1
    ):

        text = chunk.get(
            "text",
            ""
        ).strip()

        text = text[
            :MAX_CHARS_PER_CHUNK
        ]

        document = chunk.get(
            "document",
            chunk.get("file", "unknown")
        )

        page = chunk.get(
            "page",
            "?"
        )

        context_parts.append(
            f"[Context {i}]\n"
            f"Document: {document}\n"
            f"Page: {page}\n"
            f"{text}"
        )

    context = "\n\n".join(
        context_parts
    )

    return context[
        :MAX_TOTAL_CONTEXT_CHARS
    ]


# =========================================================
# SAME RAG PROMPT FOR EVERY K
# =========================================================

def build_prompt(
    question,
    context
):

    return f"""You are an insurance policy assistant.

Answer the question using ONLY the policy
context provided below.

If the answer cannot be determined from the
provided context, clearly say that the available
policy documents do not contain enough information.

Do not invent or assume policy terms, waiting
periods, coverage amounts, exclusions, or
conditions.

POLICY CONTEXT:

{context}

QUESTION:

{question}

ANSWER:
"""


# =========================================================
# OLLAMA CALL
# =========================================================

def run_model(
    model,
    prompt
):

    response = requests.post(

        OLLAMA_URL,

        json={
            "model": model,
            "prompt": prompt,
            "stream": False,

            # Unload model after each experiment.
            # This keeps the VM memory stable.
            "keep_alive": "0",

            "options": OLLAMA_OPTIONS
        },

        timeout=600
    )

    response.raise_for_status()

    data = response.json()

    return data.get(
        "response",
        ""
    ).strip()


# =========================================================
# START
# =========================================================

print("=" * 75)
print("INSUREMATE WEEK 4 - TOP-K SENSITIVITY ANALYSIS")
print("=" * 75)

print(
    "\nPurpose:"
)

print(
    "Measure how changing retrieval depth affects "
    "context quality, latency, and model response."
)

print(
    "\nThis experiment does NOT call /api/chat."
)

print(
    "It does NOT use multi-model orchestration."
)

print(
    "Production application code is not modified."
)

print(
    "\nModels:"
)

for model in MODELS:

    print(
        f"  - {model}"
    )

print(
    f"\nQuestions: {len(questions)}"
)

print(
    f"Top-K values: {TOP_K_VALUES}"
)

total_tests = (
    len(questions)
    * len(TOP_K_VALUES)
    * len(MODELS)
)

print(
    f"Total evaluations: {total_tests}"
)


# =========================================================
# RUN
# =========================================================

results = []

current_test = 0


for question_data in questions:

    question_id = question_data["id"]
    question = question_data["question"]

    print(
        "\n" + "-" * 75
    )

    print(
        f"{question_id}: {question}"
    )

    print(
        "-" * 75
    )


    for top_k in TOP_K_VALUES:

        print(
            f"\nTOP-K = {top_k}"
        )


        # -------------------------------------------------
        # RETRIEVAL
        # -------------------------------------------------

        retrieval_start = (
            time.perf_counter()
        )

        try:

            retrieval_response = requests.post(

                RETRIEVAL_URL,

                json={
                    "question": question,
                    "top_k": top_k
                },

                timeout=120
            )

            retrieval_response.raise_for_status()

            retrieval_latency = (
                time.perf_counter()
                - retrieval_start
            )

            retrieval_data = (
                retrieval_response.json()
            )

            chunks = retrieval_data.get(
                "results",
                []
            )

        except Exception as e:

            print(
                f"✗ Retrieval error: {e}"
            )

            raise SystemExit(1)


        if not chunks:

            print(
                "✗ No chunks retrieved."
            )

            raise SystemExit(1)


        context = prepare_context(
            chunks
        )

        prompt = build_prompt(
            question,
            context
        )


        # -------------------------------------------------
        # RETRIEVAL INFORMATION
        # -------------------------------------------------

        scores = []

        retrieved_documents = []

        for chunk in chunks:

            if chunk.get("score") is not None:

                scores.append(
                    chunk["score"]
                )

            retrieved_documents.append(
                chunk.get(
                    "document",
                    chunk.get(
                        "file",
                        "unknown"
                    )
                )
            )


        average_score = (
            sum(scores) / len(scores)
            if scores
            else None
        )

        top_score = (
            max(scores)
            if scores
            else None
        )


        print(
            f"Retrieved chunks: {len(chunks)}"
        )

        print(
            f"Average retrieval score: "
            f"{average_score:.4f}"
            if average_score is not None
            else "Average retrieval score: N/A"
        )

        print(
            f"Context size: "
            f"{len(context)} characters"
        )


        # -------------------------------------------------
        # TEST EACH MODEL
        # -------------------------------------------------

        for model in MODELS:

            current_test += 1

            print(
                f"\n[{current_test}/{total_tests}] "
                f"Testing {model} with K={top_k}..."
            )


            start_time = (
                time.perf_counter()
            )

            try:

                answer = run_model(
                    model,
                    prompt
                )

                latency = (
                    time.perf_counter()
                    - start_time
                )


                result = {

                    "question_id":
                        question_id,

                    "question":
                        question,

                    "model":
                        model,

                    "top_k":
                        top_k,

                    "retrieved_chunks":
                        len(chunks),

                    "retrieval_latency_seconds":
                        round(
                            retrieval_latency,
                            3
                        ),

                    "average_retrieval_score":
                        round(
                            average_score,
                            4
                        )
                        if average_score is not None
                        else None,

                    "top_retrieval_score":
                        round(
                            top_score,
                            4
                        )
                        if top_score is not None
                        else None,

                    "context_characters":
                        len(context),

                    "retrieved_documents":
                        retrieved_documents,

                    "latency_seconds":
                        round(
                            latency,
                            3
                        ),

                    "answer":
                        answer,

                    "status":
                        "success"
                }


                results.append(
                    result
                )


                print(
                    f"✓ Completed in "
                    f"{latency:.2f}s"
                )


            except Exception as e:

                latency = (
                    time.perf_counter()
                    - start_time
                )

                print(
                    f"✗ MODEL ERROR: {e}"
                )

                results.append({

                    "question_id":
                        question_id,

                    "question":
                        question,

                    "model":
                        model,

                    "top_k":
                        top_k,

                    "retrieved_chunks":
                        len(chunks),

                    "retrieval_latency_seconds":
                        round(
                            retrieval_latency,
                            3
                        ),

                    "average_retrieval_score":
                        round(
                            average_score,
                            4
                        )
                        if average_score is not None
                        else None,

                    "top_retrieval_score":
                        round(
                            top_score,
                            4
                        )
                        if top_score is not None
                        else None,

                    "context_characters":
                        len(context),

                    "retrieved_documents":
                        retrieved_documents,

                    "latency_seconds":
                        round(
                            latency,
                            3
                        ),

                    "answer":
                        "",

                    "status":
                        "error",

                    "error":
                        str(e)
                })


# =========================================================
# SAVE
# =========================================================

output = {

    "metadata": {

        "timestamp":
            datetime.now().isoformat(),

        "experiment":
            "Top-K Sensitivity Analysis",

        "models":
            MODELS,

        "questions":
            QUESTION_IDS,

        "top_k_values":
            TOP_K_VALUES,

        "evaluation_condition":
            (
                "Same questions, same model, same "
                "generation settings, and same retrieval "
                "system. Only TOP-K is varied."
            ),

        "total_evaluations":
            total_tests
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


# =========================================================
# SUMMARY
# =========================================================

print(
    "\n" + "=" * 75
)

print(
    "TOP-K SENSITIVITY ANALYSIS COMPLETED"
)

print(
    "=" * 75
)

print(
    f"\nResults saved to:"
)

print(
    OUTPUT_FILE
)

print(
    f"\nSuccessful evaluations: "
    f"{sum(r['status'] == 'success' for r in results)}"
)

print(
    f"Failed evaluations: "
    f"{sum(r['status'] == 'error' for r in results)}"
)

print(
    "\nTop-K values tested:"
)

for k in TOP_K_VALUES:

    count = sum(
        r["top_k"] == k
        for r in results
    )

    print(
        f"  K={k}: {count} evaluations"
    )

print(
    "\n" + "=" * 75
)
