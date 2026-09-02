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

QUESTIONS = [
    {
        "id": "Q02",
        "question": "What is the waiting period for cataract treatment?"
    },
    {
        "id": "Q11",
        "question": "Compare the health insurance policies in the knowledge base based on waiting periods."
    },
    {
        "id": "Q20",
        "question": "What is the current price of Bitcoin?"
    },
]


def system_memory():
    output = subprocess.check_output(
        ["free", "-m"],
        text=True
    )

    for line in output.splitlines():
        if line.startswith("Mem:"):
            parts = line.split()
            return {
                "total_mb": int(parts[1]),
                "used_mb": int(parts[2]),
                "available_mb": int(parts[6]),
            }

    return {}


def ollama_memory():
    try:
        output = subprocess.check_output(
            ["ollama", "ps"],
            text=True
        )

        lines = output.strip().splitlines()

        if len(lines) <= 1:
            return 0.0

        total_gb = 0.0

        for line in lines[1:]:
            parts = line.split()

            if len(parts) >= 3:
                size = parts[2]

                if size.endswith("GB"):
                    total_gb += float(size[:-2])

                elif size.endswith("MB"):
                    total_gb += float(size[:-2]) / 1024

        return total_gb

    except Exception:
        return 0.0


def run_model(model, question):

    prompt = f"""
You are an insurance policy assistant.

Answer the following question using only the information provided
in the question itself. Do not invent facts.

Question:
{question}

Answer concisely.
"""

    before = system_memory()

    start = time.perf_counter()

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "0",
            "options": {
                "temperature": 0,
                "num_ctx": 2048
            }
        },
        timeout=300
    )

    latency = time.perf_counter() - start

    response.raise_for_status()

    data = response.json()

    after = system_memory()

    model_memory = ollama_memory()

    return {
        "model": model,
        "question": question,
        "latency_seconds": round(latency, 3),
        "ram_before_mb": before.get("used_mb"),
        "ram_after_mb": after.get("used_mb"),
        "ram_available_mb": after.get("available_mb"),
        "ollama_model_memory_gb": round(model_memory, 3),
        "response": data.get("response", "").strip(),
    }


print("=" * 70)
print("INSUREMATE WEEK 4 - RESOURCE BENCHMARK")
print("=" * 70)

print("\nThis benchmark:")
print("  - Does NOT call /api/chat")
print("  - Does NOT use multi-model orchestration")
print("  - Tests each Ollama model independently")
print("  - Uses identical generation settings")

results = []

total = len(MODELS) * len(QUESTIONS)
current = 0

for question_data in QUESTIONS:

    print("\n" + "-" * 70)
    print(question_data["id"], ":", question_data["question"])
    print("-" * 70)

    for model in MODELS:

        current += 1

        print(
            f"\n[{current}/{total}] "
            f"Testing {model}..."
        )

        # Make sure the previous model is unloaded.
        subprocess.run(
            ["ollama", "stop", model],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        time.sleep(2)

        try:
            result = run_model(
                model,
                question_data["question"]
            )

            result["question_id"] = question_data["id"]

            results.append(result)

            print(
                "✓",
                round(result["latency_seconds"], 2),
                "seconds",
                "| model memory:",
                result["ollama_model_memory_gb"],
                "GB"
            )

        except Exception as e:

            print("✗ ERROR:", repr(e))

            results.append({
                "model": model,
                "question_id": question_data["id"],
                "question": question_data["question"],
                "error": repr(e)
            })

        finally:
            subprocess.run(
                ["ollama", "stop", model],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            time.sleep(2)


output_dir = Path(
    "backend/evaluation/results"
)

output_dir.mkdir(
    exist_ok=True
)

output_file = (
    output_dir /
    "resource_benchmark.json"
)

with open(
    output_file,
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        {
            "metadata": {
                "models": MODELS,
                "questions": QUESTIONS,
                "cpu_cores": (
                    subprocess.check_output(
                        ["nproc"],
                        text=True
                    ).strip()
                ),
                "baseline_memory": system_memory(),
            },
            "results": results
        },
        f,
        indent=2,
        ensure_ascii=False
    )


print("\n" + "=" * 70)
print("RESOURCE BENCHMARK COMPLETED")
print("=" * 70)

print("\nResults saved to:")
print(output_file)

