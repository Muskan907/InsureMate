import json
import time
import subprocess
from pathlib import Path

import requests


OLLAMA_URL = "http://localhost:11434/api/generate"

MODELS = [
    "codellama:7b-instruct",
    "qwen2.5:1.5b",
    "phi3:mini",
]

QUESTION_IDS = ["Q02", "Q11", "Q20"]

RESULT_FILE = Path(
    "backend/evaluation/results/independent_evaluation.json"
)

OUTPUT_FILE = Path(
    "backend/evaluation/results/resource_benchmark_rag.json"
)

OLLAMA_OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256,
}


def get_memory_mb():

    output = subprocess.check_output(
        ["free", "-m"],
        text=True
    )

    for line in output.splitlines():

        if line.startswith("Mem:"):

            parts = line.split()

            return {
                "total": int(parts[1]),
                "used": int(parts[2]),
                "available": int(parts[6]),
            }

    return {}


def get_cpu_percent():

    try:

        output = subprocess.check_output(
            ["bash", "-c",
             "ps -C ollama -o %cpu= | awk '{sum+=$1} END {print sum+0}'"],
            text=True
        )

        return float(output.strip() or 0)

    except Exception:

        return 0.0


def build_prompt(question, chunks):

    context_parts = []

    for i, chunk in enumerate(
        chunks,
        start=1
    ):

        text = chunk.get(
            "text",
            ""
        ).strip()

        text = text[:1500]

        context_parts.append(
            f"[Context {i}]\n{text}"
        )

    context = "\n\n".join(
        context_parts
    )

    context = context[:4000]

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


def stop_model(model):

    subprocess.run(
        ["ollama", "stop", model],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )


with open(
    RESULT_FILE,
    encoding="utf-8"
) as f:

    evaluation_data = json.load(f)


# ---------------------------------------------------------
# Get ONE shared context for each selected question
# ---------------------------------------------------------

question_records = {}

for r in evaluation_data["results"]:

    qid = r["question_id"]

    if qid not in QUESTION_IDS:
        continue

    if qid not in question_records:

        question_records[qid] = {
            "question_id": qid,
            "question": r["question"],
            "retrieved_chunks": r[
                "retrieved_chunks"
            ],
            "context_characters": r[
                "context_characters"
            ]
        }


print("=" * 70)
print("INSUREMATE WEEK 4 - RAG RESOURCE BENCHMARK")
print("=" * 70)

print(
    "\nThis benchmark uses the SAME retrieved "
    "RAG context from the independent evaluation."
)

print("\nIt does NOT call /api/chat.")
print("It does NOT use multi-model orchestration.")
print("Each model is tested independently.")
print("Models are unloaded between tests.")

print("\nQuestions:")

for qid in QUESTION_IDS:

    print(
        f"  {qid}: "
        f"{question_records[qid]['question']}"
    )


results = []

total = len(QUESTION_IDS) * len(MODELS)

current = 0


for qid in QUESTION_IDS:

    record = question_records[qid]

    question = record["question"]

    chunks = record["retrieved_chunks"]

    prompt = build_prompt(
        question,
        chunks
    )

    print("\n" + "-" * 70)

    print(
        f"{qid}: {question}"
    )

    print("-" * 70)

    print(
        "Shared context:",
        len(prompt),
        "prompt characters"
    )


    for model in MODELS:

        current += 1

        print(
            f"\n[{current}/{total}] "
            f"Testing {model}..."
        )

        stop_model(model)

        time.sleep(2)

        before_memory = get_memory_mb()

        start = time.perf_counter()

        try:

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

            latency = (
                time.perf_counter()
                - start
            )

            data = response.json()

            after_memory = get_memory_mb()

            cpu = get_cpu_percent()

            result = {

                "question_id": qid,

                "question": question,

                "model": model,

                "latency_seconds":
                    round(latency, 3),

                "ram_before_mb":
                    before_memory.get(
                        "used"
                    ),

                "ram_after_mb":
                    after_memory.get(
                        "used"
                    ),

                "ram_change_mb":
                    round(
                        after_memory.get(
                            "used", 0
                        )
                        -
                        before_memory.get(
                            "used", 0
                        ),
                        2
                    ),

                "ram_available_after_mb":
                    after_memory.get(
                        "available"
                    ),

                "cpu_percent":
                    cpu,

                "context_characters":
                    record[
                        "context_characters"
                    ],

                "retrieved_chunks":
                    chunks,

                "response":
                    data.get(
                        "response",
                        ""
                    ).strip(),

                "status":
                    "success"
            }

            results.append(result)

            print(
                "✓ Completed in",
                round(latency, 2),
                "seconds"
            )

            print(
                "  RAM change:",
                result["ram_change_mb"],
                "MB"
            )

            print(
                "  CPU:",
                result["cpu_percent"],
                "%"
            )

        except Exception as e:

            print(
                "✗ ERROR:",
                repr(e)
            )

            results.append({

                "question_id": qid,

                "question": question,

                "model": model,

                "status": "error",

                "error": repr(e)

            })

        finally:

            stop_model(model)

            time.sleep(3)


# ---------------------------------------------------------
# SAVE
# ---------------------------------------------------------

OUTPUT_FILE.parent.mkdir(
    exist_ok=True
)

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(

        {
            "metadata": {

                "evaluation_type":
                    "Independent RAG Resource Benchmark",

                "questions":
                    QUESTION_IDS,

                "models":
                    MODELS,

                "conditions":
                    (
                        "Same questions, same retrieved "
                        "chunks, same RAG prompt, same "
                        "generation settings. Models "
                        "evaluated independently."
                    ),

                "note":
                    (
                        "Resource measurements are "
                        "system-level measurements on the "
                        "evaluation VM."
                    )
            },

            "results":
                results
        },

        f,

        indent=2,

        ensure_ascii=False
    )


print("\n" + "=" * 70)

print(
    "RAG RESOURCE BENCHMARK COMPLETED"
)

print("=" * 70)

print("\nSaved to:")

print(OUTPUT_FILE)

