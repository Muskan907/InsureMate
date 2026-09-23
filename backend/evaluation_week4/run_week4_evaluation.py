import json
import math
import re
import time
import requests
from pathlib import Path
from collections import defaultdict


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_FILE = (
    BASE_DIR
    / "backend"
    / "evaluation_week4"
    / "software_engineering_dataset.json"
)

OUTPUT_FILE = (
    BASE_DIR
    / "backend"
    / "evaluation_week4"
    / "week4_raw_results.json"
)

OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embed"

EMBEDDING_MODEL = "nomic-embed-text"

MODELS = [
    "codellama:7b-instruct",
    "phi3:mini",
    "qwen2.5:1.5b"
]

TOP_K = 5

REPO_CHUNK_SIZE = 1200
REPO_CHUNK_OVERLAP = 200


# ============================================================
# REPOSITORY FILES
# ============================================================

REPOSITORY_FILES = [
    "backend/app/main.py",
    "backend/app/api/knowledge.py",
    "backend/app/api/retrieval.py",
    "backend/app/api/upload.py",
    "backend/app/services/document_processor.py",
    "backend/app/services/embedding_service.py",
    "backend/app/services/retrieval_service.py",
    "backend/app/services/upload_rag_service.py",
    "backend/create_embeddings.py",
    "backend/test_documents.py",
    "backend/requirements.txt",
    "docker-compose.yml",
    "docker/Dockerfile.backend",
    "docker/Dockerfile.frontend",
    "frontend/src/App.jsx",
    "frontend/src/App.css",
    "frontend/src/index.css",
    "frontend/src/main.jsx",
    "frontend/package.json",
    "frontend/vite.config.js",
    "README.md"
]


# ============================================================
# LOAD DATASET
# ============================================================

with open(DATASET_FILE, "r", encoding="utf-8") as f:
    DATASET = json.load(f)


QUESTIONS = DATASET["questions"]


# ============================================================
# OLLAMA HELPERS
# ============================================================

def generate_embedding(text):
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBEDDING_MODEL,
            "input": text
        },
        timeout=120
    )

    response.raise_for_status()

    return response.json()["embeddings"][0]


def call_model(model, prompt):
    start = time.perf_counter()

    response = requests.post(
        OLLAMA_GENERATE_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": 0,
            "options": {
                "temperature": 0,
                "num_ctx": 4096,
                "num_predict": 500
            }
        },
        timeout=300
    )

    response.raise_for_status()

    elapsed = time.perf_counter() - start

    data = response.json()

    return {
        "answer": data.get("response", "").strip(),
        "latency_seconds": round(elapsed, 3),
        "prompt_tokens": data.get("prompt_eval_count"),
        "output_tokens": data.get("eval_count"),
        "total_tokens": (
            (data.get("prompt_eval_count") or 0)
            + (data.get("eval_count") or 0)
        )
    }


# ============================================================
# COSINE SIMILARITY
# ============================================================

def cosine_similarity(a, b):

    dot = sum(
        x * y
        for x, y in zip(a, b)
    )

    magnitude_a = math.sqrt(
        sum(x * x for x in a)
    )

    magnitude_b = math.sqrt(
        sum(y * y for y in b)
    )

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot / (
        magnitude_a * magnitude_b
    )


# ============================================================
# REPOSITORY CHUNKING
# ============================================================

def chunk_text(text, chunk_size=1200, overlap=200):

    lines = text.splitlines()

    chunks = []

    current_lines = []
    current_size = 0

    for line_number, line in enumerate(lines, start=1):

        line_size = len(line) + 1

        if (
            current_lines
            and current_size + line_size > chunk_size
        ):

            chunks.append({
                "text": "\n".join(current_lines),
                "start_line": line_number - len(current_lines),
                "end_line": line_number - 1
            })

            overlap_lines = []

            overlap_size = 0

            for previous_line in reversed(current_lines):

                if overlap_size + len(previous_line) > overlap:
                    break

                overlap_lines.insert(
                    0,
                    previous_line
                )

                overlap_size += len(previous_line)

            current_lines = overlap_lines
            current_size = overlap_size

        current_lines.append(line)
        current_size += line_size

    if current_lines:

        chunks.append({
            "text": "\n".join(current_lines),
            "start_line": max(
                1,
                len(lines) - len(current_lines) + 1
            ),
            "end_line": len(lines)
        })

    return chunks


def build_repository_index():

    print("\nBuilding repository index...")

    index = []

    for relative_path in REPOSITORY_FILES:

        file_path = BASE_DIR / relative_path

        if not file_path.exists():
            print(
                f"WARNING: Missing {relative_path}"
            )
            continue

        try:
            text = file_path.read_text(
                encoding="utf-8",
                errors="ignore"
            )
        except Exception as exc:
            print(
                f"WARNING: Could not read {relative_path}: {exc}"
            )
            continue

        chunks = chunk_text(
            text,
            REPO_CHUNK_SIZE,
            REPO_CHUNK_OVERLAP
        )

        for chunk in chunks:

            print(
                f"Embedding {relative_path} "
                f"lines {chunk['start_line']}-"
                f"{chunk['end_line']}"
            )

            embedding = generate_embedding(
                chunk["text"]
            )

            index.append({
                "file": relative_path,
                "start_line": chunk["start_line"],
                "end_line": chunk["end_line"],
                "text": chunk["text"],
                "embedding": embedding
            })

    print(
        f"Repository index created: {len(index)} chunks"
    )

    return index


# ============================================================
# REPOSITORY RETRIEVAL
# ============================================================

def retrieve_repository_context(
    question,
    repository_index
):

    query_embedding = generate_embedding(question)

    results = []

    for item in repository_index:

        score = cosine_similarity(
            query_embedding,
            item["embedding"]
        )

        results.append({
            "file": item["file"],
            "start_line": item["start_line"],
            "end_line": item["end_line"],
            "text": item["text"],
            "score": round(score, 4)
        })

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results[:TOP_K]


# ============================================================
# POLICY RETRIEVAL
# ============================================================

def load_policy_embeddings():

    embedding_file = (
        BASE_DIR
        / "data"
        / "embeddings"
        / "embeddings.json"
    )

    with open(
        embedding_file,
        "r",
        encoding="utf-8"
    ) as f:

        return json.load(f)


def retrieve_policy_context(
    question,
    policy_documents
):

    query_embedding = generate_embedding(
        question
    )

    results = []

    for item in policy_documents:

        score = cosine_similarity(
            query_embedding,
            item["embedding"]
        )

        results.append({
            "document": item["document"],
            "page": item["page"],
            "chunk_id": item["chunk_id"],
            "text": item["text"],
            "score": round(score, 4)
        })

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results[:TOP_K]


# ============================================================
# PROMPT BUILDERS
# ============================================================

def build_repository_prompt(
    question,
    context
):

    evidence = "\n\n".join(
        [
            (
                f"FILE: {item['file']}\n"
                f"LINES: {item['start_line']}-"
                f"{item['end_line']}\n"
                f"{item['text']}"
            )
            for item in context
        ]
    )

    return f"""
You are evaluating your understanding of the InsureMate software repository.

Answer the question using ONLY the repository evidence provided below.

IMPORTANT RULES:
1. Do not invent files.
2. Do not invent functions.
3. Do not invent endpoints.
4. Do not invent dependencies.
5. Do not assume behaviour that is not supported by the evidence.
6. If the evidence is insufficient, explicitly say so.
7. Be precise and concise.

QUESTION:
{question}

REPOSITORY EVIDENCE:
{evidence}

ANSWER:
""".strip()


def build_rag_prompt(
    question,
    context
):

    evidence = "\n\n".join(
        [
            (
                f"DOCUMENT: {item['document']}\n"
                f"PAGE: {item['page']}\n"
                f"CHUNK: {item['chunk_id']}\n"
                f"{item['text']}"
            )
            for item in context
        ]
    )

    return f"""
You are InsureMate, an insurance policy assistant.

Answer ONLY using the policy evidence below.

IMPORTANT:
1. Do not invent policy information.
2. Do not use outside knowledge.
3. If the evidence does not answer the question, say that the available policy evidence is insufficient.
4. Do not guess.
5. Give a concise answer.

QUESTION:
{question}

POLICY EVIDENCE:
{evidence}

ANSWER:
""".strip()


def build_general_code_prompt(question):

    return f"""
You are evaluating an AI model on a software-engineering task.

Answer the following task accurately.

Use Python/FastAPI code where requested.

Rules:
1. Do not invent project files.
2. Keep the answer focused on the task.
3. For code generation, provide complete executable code.
4. For explanation questions, explain the actual concept clearly.
5. If something cannot be determined, say so.

TASK:
{question}

ANSWER:
""".strip()


# ============================================================
# RUN ONE QUESTION
# ============================================================

def run_question(
    question,
    model,
    repository_index,
    policy_documents
):

    category = question["category"]
    question_text = question["question"]

    repository_context = []
    policy_context = []

    if category == "RAG based Question":

        policy_context = retrieve_policy_context(
            question_text,
            policy_documents
        )

        prompt = build_rag_prompt(
            question_text,
            policy_context
        )

    elif category in [
        "Code Retrieval",
        "Dependency Understanding"
    ]:

        repository_context = retrieve_repository_context(
            question_text,
            repository_index
        )

        prompt = build_repository_prompt(
            question_text,
            repository_context
        )

    else:

        repository_context = retrieve_repository_context(
            question_text,
            repository_index
        )

        evidence_prompt = build_repository_prompt(
            question_text,
            repository_context
        )

        prompt = evidence_prompt

    result = call_model(
        model,
        prompt
    )

    return {
        "question_id": question["id"],
        "category": category,
        "task_type": question["task_type"],
        "question": question_text,
        "model": model,
        "answer": result["answer"],
        "latency_seconds": result["latency_seconds"],
        "prompt_tokens": result["prompt_tokens"],
        "output_tokens": result["output_tokens"],
        "total_tokens": result["total_tokens"],
        "retrieved_repository": repository_context,
        "retrieved_policy": policy_context
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("INSUREMATE WEEK 4 MODEL EVALUATION")
    print("=" * 70)

    print(
        f"\nQuestions: {len(QUESTIONS)}"
    )

    print(
        f"Models: {len(MODELS)}"
    )

    print(
        f"Total evaluations: "
        f"{len(QUESTIONS) * len(MODELS)}"
    )

    print(
        "\nGeneration settings:"
    )

    print("temperature = 0")
    print("num_ctx = 4096")
    print("num_predict = 500")

    repository_index = build_repository_index()

    policy_documents = load_policy_embeddings()

    all_results = []

    for model in MODELS:

        print("\n" + "=" * 70)
        print(f"MODEL: {model}")
        print("=" * 70)

        for index, question in enumerate(
            QUESTIONS,
            start=1
        ):

            print(
                f"\n[{index}/{len(QUESTIONS)}] "
                f"{question['id']} | "
                f"{question['category']}"
            )

            print(
                question["question"]
            )

            try:

                result = run_question(
                    question,
                    model,
                    repository_index,
                    policy_documents
                )

                all_results.append(
                    result
                )

                print(
                    f"Latency: "
                    f"{result['latency_seconds']}s"
                )

                print(
                    f"Tokens: "
                    f"{result['total_tokens']}"
                )

            except Exception as exc:

                print(
                    f"ERROR: {exc}"
                )

                all_results.append({
                    "question_id": question["id"],
                    "category": question["category"],
                    "task_type": question["task_type"],
                    "question": question["question"],
                    "model": model,
                    "answer": "",
                    "error": str(exc),
                    "latency_seconds": None,
                    "prompt_tokens": None,
                    "output_tokens": None,
                    "total_tokens": None,
                    "retrieved_repository": [],
                    "retrieved_policy": []
                })

    output = {
        "experiment": "InsureMate Week 4",
        "models": MODELS,
        "questions": len(QUESTIONS),
        "total_evaluations": len(all_results),
        "settings": {
            "temperature": 0,
            "num_ctx": 4096,
            "num_predict": 500,
            "embedding_model": EMBEDDING_MODEL,
            "repository_top_k": TOP_K,
            "repository_chunk_size": REPO_CHUNK_SIZE,
            "repository_chunk_overlap": REPO_CHUNK_OVERLAP
        },
        "results": all_results
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

    print("\n" + "=" * 70)
    print("EVALUATION COMPLETE")
    print("=" * 70)

    print(
        f"\nSaved results to:\n{OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()