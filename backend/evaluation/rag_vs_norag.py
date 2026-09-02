import json
import time
import requests
from pathlib import Path
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/generate"
RETRIEVAL_URL = "http://localhost:8000/api/retrieval/search"

MODELS = [
    "codellama:7b-instruct",
    "qwen2.5:1.5b",
    "phi3:mini",
]

# Small representative subset to keep the VM stable
QUESTIONS = [
    {
        "id": "Q02",
        "question": "What is the waiting period for cataract treatment?"
    },
    {
        "id": "Q04",
        "question": "What is the waiting period for stones in the urinary system?"
    },
    {
        "id": "Q06",
        "question": "Does the policy cover hospitalization expenses?"
    },
    {
        "id": "Q08",
        "question": "What does the policy say about spondylosis or spondylitis?"
    },
    {
        "id": "Q10",
        "question": "What are the important waiting periods mentioned in the policy documents?"
    },
    {
        "id": "Q11",
        "question": "Compare the health insurance policies in the knowledge base based on waiting periods."
    },
    {
        "id": "Q18",
        "question": "Will my treatment be covered?"
    },
    {
        "id": "Q20",
        "question": "What is the current price of Bitcoin?"
    },
]

TOP_K = 3

OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256,
}

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

OUTPUT = RESULTS_DIR / "rag_vs_norag.json"


def check_ollama():
    try:
        r = requests.get(
            "http://localhost:11434/api/tags",
            timeout=10
        )
        return r.ok
    except Exception:
        return False


def retrieve(question):
    start = time.perf_counter()

    r = requests.post(
        RETRIEVAL_URL,
        json={
            "question": question,
            "top_k": TOP_K
        },
        timeout=120
    )

    r.raise_for_status()

    latency = time.perf_counter() - start

    chunks = r.json().get("results", [])

    return chunks, latency


def make_context(chunks):
    parts = []

    for i, c in enumerate(chunks, 1):
        text = c.get("text", "").strip()[:1500]

        parts.append(
            f"[Context {i}]\n{text}"
        )

    return "\n\n".join(parts)[:4000]


def rag_prompt(question, context):
    return f"""You are an insurance policy assistant.

Answer the question using ONLY the policy context below.

If the answer cannot be determined from the context, say:

The available insurance documents do not contain enough information to answer this question.

Do not invent policy terms, waiting periods, coverage,
exclusions, prices, or conditions.

POLICY CONTEXT:

{context}

QUESTION:

{question}

ANSWER:
"""


def norag_prompt(question):
    return f"""You are an insurance policy assistant.

Answer the question using your own model knowledge.

IMPORTANT:
You do NOT have access to the InsureMate insurance
knowledge base for this experiment.

Do not claim that information comes from InsureMate
documents.

QUESTION:

{question}

ANSWER:
"""


def generate(model, prompt):
    start = time.perf_counter()

    r = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "0",
            "options": OPTIONS,
        },
        timeout=600
    )

    r.raise_for_status()

    elapsed = time.perf_counter() - start

    data = r.json()

    return {
        "answer": data.get("response", "").strip(),
        "latency_seconds": round(elapsed, 3),
        "prompt_tokens": data.get("prompt_eval_count", 0),
        "generated_tokens": data.get("eval_count", 0),
        "total_tokens": (
            data.get("prompt_eval_count", 0)
            + data.get("eval_count", 0)
        ),
    }


if not check_ollama():
    print("ERROR: Ollama is not available.")
    raise SystemExit(1)


print("=" * 70)
print("INSUREMATE WEEK 4 - RAG VS NO-RAG")
print("=" * 70)

print("\nThis experiment:")
print("- Does NOT call /api/chat")
print("- Does NOT use multi-model orchestration")
print("- Calls every model independently")
print("- Uses identical generation settings")
print("- Compares RAG against No-RAG")

print(f"\nQuestions: {len(QUESTIONS)}")
print(f"Models: {len(MODELS)}")

results = []

total = len(QUESTIONS) * len(MODELS) * 2
counter = 0

for q in QUESTIONS:

    qid = q["id"]
    question = q["question"]

    print("\n" + "-" * 70)
    print(f"{qid}: {question}")
    print("-" * 70)

    print("\nRetrieving shared context...")

    try:
        chunks, retrieval_latency = retrieve(question)
    except Exception as e:
        print("RETRIEVAL ERROR:", e)
        raise SystemExit(1)

    context = make_context(chunks)

    print(
        f"Retrieved {len(chunks)} chunks "
        f"in {retrieval_latency:.2f}s"
    )

    for model in MODELS:

        # ------------------------------------------------
        # RAG
        # ------------------------------------------------

        counter += 1

        print(
            f"\n[{counter}/{total}] "
            f"{model} | RAG"
        )

        try:
            result = generate(
                model,
                rag_prompt(question, context)
            )

            results.append({
                "question_id": qid,
                "question": question,
                "model": model,
                "condition": "RAG",
                "answer": result["answer"],
                "latency_seconds":
                    result["latency_seconds"],
                "prompt_tokens":
                    result["prompt_tokens"],
                "generated_tokens":
                    result["generated_tokens"],
                "total_tokens":
                    result["total_tokens"],
                "retrieval_latency_seconds":
                    round(retrieval_latency, 3),
                "retrieved_chunks": chunks,
                "status": "success",
            })

            print(
                f"✓ {result['latency_seconds']:.2f}s"
            )

        except Exception as e:
            print("ERROR:", repr(e))
            raise SystemExit(1)

        # ------------------------------------------------
        # NO RAG
        # ------------------------------------------------

        counter += 1

        print(
            f"\n[{counter}/{total}] "
            f"{model} | NO-RAG"
        )

        try:
            result = generate(
                model,
                norag_prompt(question)
            )

            results.append({
                "question_id": qid,
                "question": question,
                "model": model,
                "condition": "NO_RAG",
                "answer": result["answer"],
                "latency_seconds":
                    result["latency_seconds"],
                "prompt_tokens":
                    result["prompt_tokens"],
                "generated_tokens":
                    result["generated_tokens"],
                "total_tokens":
                    result["total_tokens"],
                "retrieval_latency_seconds":
                    0,
                "retrieved_chunks": [],
                "status": "success",
            })

            print(
                f"✓ {result['latency_seconds']:.2f}s"
            )

        except Exception as e:
            print("ERROR:", repr(e))
            raise SystemExit(1)

        # Save after every model pair
        with open(OUTPUT, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "metadata": {
                        "timestamp":
                            datetime.now().isoformat(),
                        "experiment":
                            "RAG vs No-RAG",
                        "questions":
                            QUESTIONS,
                        "models":
                            MODELS,
                        "top_k":
                            TOP_K,
                        "generation_settings":
                            OPTIONS,
                        "independence":
                            True,
                    },
                    "results": results,
                },
                f,
                indent=2,
                ensure_ascii=False
            )


print("\n" + "=" * 70)
print("RAG VS NO-RAG COMPLETED")
print("=" * 70)

print(f"\nResults: {len(results)}")
print(f"Saved to:\n{OUTPUT}")
print("=" * 70)
