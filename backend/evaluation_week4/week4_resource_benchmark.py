import json, time, subprocess, sys
from pathlib import Path

try:
    import psutil
except ImportError:
    print("Installing psutil...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
    import psutil

import requests

BASE = Path(__file__).resolve().parent
RAW = BASE / "week4_raw_results.json"
OUT = BASE / "week4_resource_benchmark.json"

MODELS = ["codellama:7b-instruct", "phi3:mini", "qwen2.5:1.5b"]

# One representative task from each Week-4 category.
TASKS = [
    ("E01", "Explain the purpose of backend/app/services/document_processor.py and describe what process_pdf() does."),
    ("CR01", "Which file contains generate_embedding()?"),
    ("DU03", "Explain the relationship between the API layer, document processing, embedding service, and retrieval service."),
    ("BA03", "Retrieval returns unrelated chunks. What are the possible causes and how would you debug it?"),
    ("CG01", "Write a Python function cosine_similarity(a,b) that safely handles zero vectors."),
    ("RF01", "Refactor cosine_similarity for readability while preserving its behavior."),
    ("RAG01", "What is the waiting period for pre-existing diseases in Group Health Insurance?"),
]

OLLAMA = "http://localhost:11434/api/generate"

def sample_resource(model, question):
    p = psutil.Process()
    before_ram = p.memory_info().rss / (1024*1024)
    cpu_samples = []

    start = time.perf_counter()
    r = requests.post(
        OLLAMA,
        json={
            "model": model,
            "prompt": (
                "Answer the software-engineering question accurately. "
                "Use only the supplied question and do not invent project facts.\n\n"
                + question
            ),
            "stream": False,
            "options": {"temperature": 0, "num_ctx": 4096, "num_predict": 500},
            "keep_alive": 0,
        },
        timeout=600,
    )
    latency = time.perf_counter() - start
    r.raise_for_status()
    data = r.json()

    after_ram = p.memory_info().rss / (1024*1024)
    cpu = p.cpu_percent(interval=0.2)

    return {
        "latency_seconds": round(latency, 3),
        "ram_before_mb": round(before_ram, 2),
        "ram_after_mb": round(after_ram, 2),
        "ram_change_mb": round(after_ram-before_ram, 2),
        "process_cpu_percent_sample": round(cpu, 2),
        "prompt_eval_count": data.get("prompt_eval_count"),
        "eval_count": data.get("eval_count"),
        "total_duration_ns": data.get("total_duration"),
        "load_duration_ns": data.get("load_duration"),
    }

results = []
for model in MODELS:
    print("\nMODEL:", model)
    for qid, question in TASKS:
        print(" ", qid, end=" ... ", flush=True)
        try:
            m = sample_resource(model, question)
            results.append({"model": model, "question_id": qid, **m})
            print(f"{m['latency_seconds']}s | RAM Δ {m['ram_change_mb']} MB | CPU {m['process_cpu_percent_sample']}%")
        except Exception as e:
            results.append({"model": model, "question_id": qid, "error": str(e)})
            print("ERROR:", e)

summary = {}
for model in MODELS:
    rows = [x for x in results if x["model"] == model and "error" not in x]
    if rows:
        summary[model] = {
            "samples": len(rows),
            "avg_latency_seconds": round(sum(x["latency_seconds"] for x in rows)/len(rows), 3),
            "avg_ram_change_mb": round(sum(x["ram_change_mb"] for x in rows)/len(rows), 2),
            "avg_cpu_percent_sample": round(sum(x["process_cpu_percent_sample"] for x in rows)/len(rows), 2),
            "avg_prompt_tokens": (
                round(sum(x["prompt_eval_count"] for x in rows if isinstance(x["prompt_eval_count"], int)) /
                len([x for x in rows if isinstance(x["prompt_eval_count"], int)]), 2)
                if any(isinstance(x["prompt_eval_count"], int) for x in rows) else None
            ),
            "avg_output_tokens": (
                round(sum(x["eval_count"] for x in rows if isinstance(x["eval_count"], int)) /
                len([x for x in rows if isinstance(x["eval_count"], int)]), 2)
                if any(isinstance(x["eval_count"], int) for x in rows) else None
            ),
        }

out = {
    "methodology": {
        "sample_design": "7 representative tasks, one per Week-4 category, repeated for each of 3 models.",
        "ram": "Python process RSS before/after each Ollama request; RAM change is reported.",
        "cpu": "Python process CPU sample after each request; not whole-system CPU.",
        "tokens": "Ollama prompt_eval_count and eval_count when returned.",
        "gpu": "Not measured by this script."
    },
    "results": results,
    "summary": summary,
}
OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
print("\nSaved:", OUT)
