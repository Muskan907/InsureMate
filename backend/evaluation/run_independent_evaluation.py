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
    "qwen2.5:1.5b",
    "phi3:mini",
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
    "independent_evaluation.json"
)

RESULTS_DIR.mkdir(exist_ok=True)


# =========================================================
# SETTINGS
# =========================================================

TOP_K = 3

# Keep the evaluation stable on the available VM resources.
# Every model receives EXACTLY the same processed context.
MAX_CHARS_PER_CHUNK = 1500
MAX_TOTAL_CONTEXT_CHARS = 4000

OLLAMA_OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256,
}


# =========================================================
# HEALTH CHECK
# =========================================================

def ollama_is_available():

    try:

        response = requests.get(
            "http://localhost:11434/api/tags",
            timeout=10
        )

        return response.ok

    except Exception:

        return False


# =========================================================
# LOAD DATASET
# =========================================================

with open(
    DATASET_FILE,
    "r",
    encoding="utf-8"
) as f:

    dataset = json.load(f)


# =========================================================
# LOAD PREVIOUS RESULTS
# =========================================================

if OUTPUT_FILE.exists():

    with open(
        OUTPUT_FILE,
        "r",
        encoding="utf-8"
    ) as f:

        saved_data = json.load(f)

        results = saved_data.get(
            "results",
            []
        )

else:

    results = []


completed = {

    (
        r["question_id"],
        r["model"]
    )

    for r in results

    if r.get("status") == "success"
}


# =========================================================
# SAVE CHECKPOINT
# =========================================================

def save_results():

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            {
                "metadata": {

                    "timestamp":
                        datetime.now().isoformat(),

                    "evaluation_type":
                        "Independent RAG Model Evaluation",

                    "total_questions":
                        len(dataset),

                    "models":
                        MODELS,

                    "evaluation_condition":
                        (
                            "Same question, same retrieved "
                            "context, same RAG prompt, same "
                            "generation settings. Each model "
                            "is called independently through "
                            "the Ollama API."
                        )

                },

                "results": results

            },
            f,
            indent=2,
            ensure_ascii=False
        )


# =========================================================
# PREPARE SHARED CONTEXT
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

        context_parts.append(
            f"[Context {i}]\n{text}"
        )

    context = "\n\n".join(
        context_parts
    )

    return context[
        :MAX_TOTAL_CONTEXT_CHARS
    ]


# =========================================================
# BUILD SAME RAG PROMPT
# =========================================================

def build_prompt(question, context):

    return f"""You are an insurance policy assistant.

Answer the question using ONLY the policy
context provided below.

If the answer cannot be determined from the
provided context, respond exactly:

The available insurance documents do not contain
enough information to answer this question.

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
# TEST A MODEL
# =========================================================

def run_model(model, prompt):

    response = requests.post(

        OLLAMA_URL,

        json={

            "model": model,

            "prompt": prompt,

            "stream": False,

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

if not ollama_is_available():

    print(
        "\nERROR: Ollama is not available."
    )

    raise SystemExit(1)


total_tests = (
    len(dataset) *
    len(MODELS)
)


print("=" * 70)

print(
    "INSUREMATE WEEK 4 - "
    "INDEPENDENT MODEL EVALUATION"
)

print("=" * 70)

print(
    f"\nQuestions: {len(dataset)}"
)

print(
    f"Models: {len(MODELS)}"
)

print(
    f"Total evaluations: {total_tests}"
)

print(
    f"Already completed: "
    f"{len(completed)}"
)

print(
    f"Remaining: "
    f"{total_tests - len(completed)}"
)

print(
    "\nIMPORTANT:"
)

print(
    "Each model is evaluated independently."
)

print(
    "The same retrieved context, prompt, and "
    "generation settings are used for all models."
)

print(
    "\nModels:"
)

for model in MODELS:

    print(
        f"  - {model}"
    )


# =========================================================
# RUN EVALUATION
# =========================================================

current_test = 0


for question_data in dataset:

    question_id = question_data["id"]

    question = question_data["question"]


    print(
        "\n" + "-" * 70
    )

    print(
        f"{question_id}: {question}"
    )

    print(
        "-" * 70
    )


    # -----------------------------------------------------
    # RETRIEVE ONCE
    # -----------------------------------------------------

    print(
        "\nRetrieving shared context..."
    )

    try:

        retrieval_start = (
            time.perf_counter()
        )

        retrieval_response = (
            requests.post(

                RETRIEVAL_URL,

                json={
                    "question": question,
                    "top_k": TOP_K
                },

                timeout=120
            )
        )

        retrieval_response.raise_for_status()

        retrieval_latency = (
            time.perf_counter()
            - retrieval_start
        )

        retrieval_data = (
            retrieval_response.json()
        )

        chunks = (
            retrieval_data.get(
                "results",
                []
            )
        )

        if not chunks:

            raise RuntimeError(
                "No chunks were retrieved."
            )

        print(
            f"Retrieved {len(chunks)} chunks in "
            f"{retrieval_latency:.2f} seconds"
        )

    except Exception as e:

        print(
            f"\nRETRIEVAL ERROR: {e}"
        )

        print(
            "Stopping safely."
        )

        save_results()

        raise SystemExit(1)


    # -----------------------------------------------------
    # BUILD ONE SHARED PROMPT
    # -----------------------------------------------------

    context = prepare_context(
        chunks
    )

    prompt = build_prompt(
        question,
        context
    )

    print(
        f"Shared context size: "
        f"{len(context)} characters"
    )


    # -----------------------------------------------------
    # EVALUATE EACH MODEL INDEPENDENTLY
    # -----------------------------------------------------

    for model in MODELS:

        current_test += 1

        key = (
            question_id,
            model
        )


        if key in completed:

            print(
                f"\n✓ Skipping {model} "
                f"(already completed)"
            )

            continue


        print(
            f"\n[{current_test}/{total_tests}] "
            f"Testing {model} independently..."
        )


        if not ollama_is_available():

            print(
                "\nOLLAMA IS NOT AVAILABLE."
            )

            save_results()

            raise SystemExit(1)


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

                "category":
                    question_data[
                        "category"
                    ],

                "type":
                    question_data[
                        "type"
                    ],

                "question":
                    question,

                "model":
                    model,

                "answer":
                    answer,

                "latency_seconds":
                    round(
                        latency,
                        3
                    ),

                "retrieval_latency_seconds":
                    round(
                        retrieval_latency,
                        3
                    ),

                "retrieval_top_k":
                    TOP_K,

                "context_characters":
                    len(context),

                "retrieved_chunks":
                    chunks,

                "status":
                    "success"

            }


            results.append(
                result
            )

            completed.add(
                key
            )


            print(
                f"✓ Completed in "
                f"{latency:.2f} seconds"
            )


            save_results()

            print(
                "  Results checkpoint saved."
            )


            # Give Ollama time to release the model
            time.sleep(5)


        except Exception as e:

            latency = (
                time.perf_counter()
                - start_time
            )


            print(
                f"\nMODEL ERROR for {model}: "
                f"{repr(e)}"
            )

            print(
                "Stopping safely. No failed "
                "evaluation will be marked complete."
            )


            save_results()

            raise SystemExit(1)


# =========================================================
# FINAL SUMMARY
# =========================================================

successful = sum(

    1

    for r in results

    if r.get("status")
    == "success"

)


print(
    "\n" + "=" * 70
)

print(
    "INDEPENDENT EVALUATION COMPLETED"
)

print(
    "=" * 70
)

print(
    f"\nSuccessful evaluations: "
    f"{successful}"
)

print(
    f"Results saved to:\n"
    f"{OUTPUT_FILE}"
)

print(
    "\n" + "=" * 70
)