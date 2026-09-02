import json
import time
import sys
from pathlib import Path
from datetime import datetime

import requests


# =========================================================
# CONFIGURATION
# =========================================================
API_URL = "http://localhost:8000/api/hallucination/check"

MODELS = [
    "codellama:7b-instruct",
    "qwen2.5:1.5b",
    "phi3:mini",
]

BASE_DIR = Path(__file__).parent
DATASET_FILE = BASE_DIR / "dataset.json"
RESULTS_DIR = BASE_DIR / "results"

RESULTS_DIR.mkdir(exist_ok=True)


# =========================================================
# BATCH CONFIGURATION
# =========================================================

if len(sys.argv) != 2:
    print(
        "\nUsage:"
    )
    print(
        "  python3 backend/evaluation/run_evaluation.py 1"
    )
    print(
        "  python3 backend/evaluation/run_evaluation.py 2"
    )
    sys.exit(1)


batch_number = sys.argv[1]

if batch_number == "1":
    START_INDEX = 0
    END_INDEX = 13

elif batch_number == "2":
    START_INDEX = 13
    END_INDEX = 25

else:
    print(
        "\nInvalid batch number."
    )
    print(
        "Use 1 or 2."
    )
    sys.exit(1)


# =========================================================
# LOAD DATASET
# =========================================================

with open(
    DATASET_FILE,
    "r",
    encoding="utf-8"
) as f:

    dataset = json.load(f)


batch_dataset = dataset[
    START_INDEX:END_INDEX
]


# =========================================================
# RESULT FILE
# =========================================================

output_file = (
    RESULTS_DIR /
    f"evaluation_batch_{batch_number}.json"
)


# =========================================================
# LOAD PREVIOUS RESULTS FOR RESUME
# =========================================================

results = []

if output_file.exists():

    try:

        with open(
            output_file,
            "r",
            encoding="utf-8"
        ) as f:

            saved_data = json.load(f)

            results = saved_data.get(
                "results",
                []
            )

        print(
            f"\nFound existing results."
        )

        print(
            f"Completed evaluations: "
            f"{len(results)}"
        )

        print(
            "Resuming evaluation..."
        )

    except Exception:

        print(
            "\nExisting result file could "
            "not be read."
        )

        print(
            "Starting fresh..."
        )

        results = []


# =========================================================
# HELPER: SAVE RESULTS
# =========================================================

def save_results():

    completed = len(results)

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            {
                "metadata": {
                    "timestamp": (
                        datetime.now()
                        .isoformat()
                    ),

                    "batch": batch_number,

                    "total_questions": (
                        len(batch_dataset)
                    ),

                    "models": MODELS,

                    "expected_evaluations": (
                        len(batch_dataset)
                        * len(MODELS)
                    ),

                    "completed_evaluations": (
                        completed
                    )
                },

                "results": results

            },
            f,
            indent=2,
            ensure_ascii=False
        )


# =========================================================
# CHECK IF ALREADY COMPLETED
# =========================================================

completed_keys = {

    (
        result["question_id"],
        result["model"]
    )

    for result in results

}


# =========================================================
# DISPLAY INFO
# =========================================================

total_tests = (
    len(batch_dataset)
    * len(MODELS)
)

remaining_tests = (
    total_tests
    - len(completed_keys)
)


print("\n" + "=" * 70)

print(
    "INSUREMATE WEEK 4 "
    f"- EVALUATION BATCH {batch_number}"
)

print("=" * 70)

print(
    f"\nQuestions in this batch: "
    f"{len(batch_dataset)}"
)

print(
    f"Models: "
    f"{len(MODELS)}"
)

print(
    f"Total evaluations: "
    f"{total_tests}"
)

print(
    f"Already completed: "
    f"{len(completed_keys)}"
)

print(
    f"Remaining: "
    f"{remaining_tests}"
)

print("\nModels being tested:")

for model in MODELS:

    print(
        f"  - {model}"
    )


# =========================================================
# RUN EVALUATION
# =========================================================

current_test = len(completed_keys)


for question_data in batch_dataset:

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


    for model in MODELS:

        result_key = (
            question_id,
            model
        )


        # Skip completed evaluation
        if result_key in completed_keys:

            print(
                f"\n✓ Skipping {model} "
                f"(already completed)"
            )

            continue


        current_test += 1


        print(
            f"\n[{current_test}/{total_tests}] "
            f"Testing {model}..."
        )


        start_time = (
            time.perf_counter()
        )


        try:

            response = requests.post(

                API_URL,

                json={
                    "question": question,
                    "model": model,
                    "top_k": 3
                },

                timeout=300
            )


            latency = (
                time.perf_counter()
                - start_time
            )


            response.raise_for_status()

            data = response.json()


            result = {

                "question_id": (
                    question_id
                ),

                "category": (
                    question_data["category"]
                ),

                "type": (
                    question_data["type"]
                ),

                "question": (
                    question
                ),

                "model": (
                    model
                ),

                "answer": data.get(
                    "answer",
                    ""
                ),

                "latency_seconds": round(
                    latency,
                    3
                ),

                "models_used": data.get(
                    "models_used",
                    []
                ),

                "validation": data.get(
                    "validation",
                    None
                ),

                "complexity": data.get(
                    "complexity",
                    None
                ),

                "retrieval_confidence": data.get(
                    "retrieval_confidence",
                    None
                ),

                "retrieved_chunks": data.get(
                    "retrieved_chunks",
                    data.get(
                        "sources",
                        []
                    )
                ),

                "status": "success"
            }


            print(
                f"✓ Completed in "
                f"{latency:.2f} seconds"
            )


        except Exception as e:


            latency = (
                time.perf_counter()
                - start_time
            )


            result = {

                "question_id": (
                    question_id
                ),

                "category": (
                    question_data["category"]
                ),

                "type": (
                    question_data["type"]
                ),

                "question": (
                    question
                ),

                "model": (
                    model
                ),

                "answer": "",

                "latency_seconds": round(
                    latency,
                    3
                ),

                "models_used": [],

                "validation": None,

                "complexity": None,

                "retrieval_confidence": None,

                "retrieved_chunks": [],

                "status": "error",

                "error": str(e)
            }


            print(
                f"✗ ERROR: {e}"
            )


        # =============================================
        # SAVE IMMEDIATELY AFTER EVERY EVALUATION
        # =============================================

        results.append(result)

        completed_keys.add(
            result_key
        )

        save_results()

        print(
            "  Results checkpoint saved."
        )


# =========================================================
# FINAL SUMMARY
# =========================================================

successful = sum(

    1

    for result in results

    if result["status"] == "success"
)


failed = (
    len(results)
    - successful
)


print("\n" + "=" * 70)

print(
    f"BATCH {batch_number} COMPLETED"
)

print("=" * 70)

print(
    f"\nSuccessful evaluations: "
    f"{successful}"
)

print(
    f"Failed evaluations: "
    f"{failed}"
)

print(
    f"\nResults saved to:"
)

print(
    output_file
)

print("\n" + "=" * 70)