import json
import re
import time
from pathlib import Path

import requests


# =========================================================
# CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parents[3]

OLLAMA_URL = "http://localhost:11434/api"

EMBEDDING_MODEL = "nomic-embed-text"
GENERATION_MODEL = "codellama:7b-instruct"

TOP_K = 5

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200

OUTPUT_FILE = (
    BASE_DIR
    / "backend"
    / "evaluation"
    / "repository"
    / "repository_evaluation.json"
)


# =========================================================
# FILES TO INDEX
# =========================================================

SOURCE_FILES = [

    "backend/app/api/knowledge.py",
    "backend/app/api/retrieval.py",
    "backend/app/api/upload.py",
    "backend/app/main.py",

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

    "README.md",
]


# =========================================================
# EXCLUDED CONTENT
# =========================================================

EXCLUDED_PARTS = {
    ".git",
    "venv",
    "node_modules",
    "__pycache__",
    "dist",
}


# =========================================================
# EMBEDDINGS
# =========================================================

def generate_embedding(text):

    response = requests.post(
        f"{OLLAMA_URL}/embed",
        json={
            "model": EMBEDDING_MODEL,
            "input": text,
        },
        timeout=120,
    )

    response.raise_for_status()

    return response.json()["embeddings"][0]


# =========================================================
# COSINE SIMILARITY
# =========================================================

def cosine_similarity(a, b):

    dot = sum(
        x * y
        for x, y in zip(a, b)
    )

    magnitude_a = sum(
        x * x
        for x in a
    ) ** 0.5

    magnitude_b = sum(
        x * x
        for x in b
    ) ** 0.5

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot / (
        magnitude_a * magnitude_b
    )


# =========================================================
# CODE CHUNKING
# =========================================================

def chunk_code(text):

    lines = text.splitlines()

    chunks = []

    start = 0

    while start < len(lines):

        end = start

        char_count = 0

        while (
            end < len(lines)
            and char_count < CHUNK_SIZE
        ):

            char_count += (
                len(lines[end]) + 1
            )

            end += 1

        chunk_lines = lines[start:end]

        chunk_text = "\n".join(
            chunk_lines
        ).strip()

        if chunk_text:

            chunks.append(
                {
                    "start_line": start + 1,
                    "end_line": end,
                    "text": chunk_text,
                }
            )

        next_start = end

        if CHUNK_OVERLAP > 0:

            overlap_chars = 0

            overlap_start = end

            while (
                overlap_start > start
                and overlap_chars < CHUNK_OVERLAP
            ):

                overlap_start -= 1

                overlap_chars += (
                    len(lines[overlap_start]) + 1
                )

            next_start = overlap_start

        if next_start <= start:
            next_start = end

        start = next_start

    return chunks


# =========================================================
# BUILD REPOSITORY CORPUS
# =========================================================

def build_corpus():

    corpus = []

    for relative_path in SOURCE_FILES:

        file_path = (
            BASE_DIR / relative_path
        )

        if not file_path.exists():

            print(
                f"WARNING: Missing {relative_path}"
            )

            continue

        text = file_path.read_text(
            encoding="utf-8",
            errors="ignore",
        )

        chunks = chunk_code(text)

        for index, chunk in enumerate(
            chunks
        ):

            corpus.append(
                {
                    "chunk_id": (
                        f"{relative_path}::"
                        f"{index}"
                    ),
                    "file": relative_path,
                    "start_line": chunk[
                        "start_line"
                    ],
                    "end_line": chunk[
                        "end_line"
                    ],
                    "text": chunk["text"],
                }
            )

    return corpus


# =========================================================
# BUILD EMBEDDING INDEX
# =========================================================

def build_index(corpus):

    print(
        f"\nBuilding repository index..."
    )

    total = len(corpus)

    for i, item in enumerate(
        corpus,
        1
    ):

        print(
            f"Embedding {i}/{total} | "
            f"{item['file']} "
            f"(lines "
            f"{item['start_line']}-"
            f"{item['end_line']})"
        )

        item["embedding"] = (
            generate_embedding(
                item["text"]
            )
        )

    return corpus


# =========================================================
# RETRIEVAL
# =========================================================

def retrieve(
    question,
    corpus,
):

    query_embedding = (
        generate_embedding(
            question
        )
    )

    results = []

    for item in corpus:

        score = cosine_similarity(
            query_embedding,
            item["embedding"],
        )

        results.append(
            {
                "file": item["file"],
                "start_line": item[
                    "start_line"
                ],
                "end_line": item[
                    "end_line"
                ],
                "score": round(
                    score,
                    4,
                ),
                "text": item["text"],
            }
        )

    results.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    return results[:TOP_K]


# =========================================================
# BUILD RAG PROMPT
# =========================================================

def build_prompt(
    question,
    retrieved,
):

    context_parts = []

    for i, item in enumerate(
        retrieved,
        1,
    ):

        context_parts.append(
            f"""
[CODE EVIDENCE {i}]
File: {item['file']}
Lines: {item['start_line']}-{item['end_line']}

{item['text']}
"""
        )

    context = "\n".join(
        context_parts
    )

    return f"""
You are a repository-level software
understanding assistant.

Answer the question using ONLY the
provided InsureMate repository evidence.

Do not invent files, functions,
endpoints, dependencies, or behavior.

If the evidence is insufficient,
clearly say that the repository
evidence is insufficient.

When explaining a flow, trace the
actual files and functions shown
in the evidence.

QUESTION:
{question}

REPOSITORY EVIDENCE:
{context}

ANSWER:
"""


# =========================================================
# GENERATE ANSWER
# =========================================================

def generate_answer(prompt):

    start = time.perf_counter()

    response = requests.post(
        f"{OLLAMA_URL}/generate",
        json={
            "model": GENERATION_MODEL,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "0",
            "options": {
                "temperature": 0,
                "num_ctx": 4096,
                "num_predict": 400,
            },
        },
        timeout=600,
    )

    response.raise_for_status()

    latency = (
        time.perf_counter()
        - start
    )

    return (
        response.json()
        .get("response", "")
        .strip(),
        round(latency, 3),
    )


# =========================================================
# EVALUATION QUESTIONS
# =========================================================

QUESTIONS = [

    {
        "id": "R01",
        "question":
            "What happens after a user uploads a policy PDF?"
    },

    {
        "id": "R02",
        "question":
            "Which backend components are involved in processing an uploaded PDF?"
    },

    {
        "id": "R03",
        "question":
            "How does InsureMate convert policy documents into embeddings?"
    },

    {
        "id": "R04",
        "question":
            "How does the retrieval system find the most relevant chunks?"
    },

    {
        "id": "R05",
        "question":
            "Which endpoint is used to retrieve policy evidence?"
    },

    {
        "id": "R06",
        "question":
            "Trace the flow of a user question from the frontend to the final answer."
    },

    {
        "id": "R07",
        "question":
            "Which files are involved in the RAG pipeline?"
    },

    {
        "id": "R08",
        "question":
            "What happens when a PDF is uploaded that already exists in the knowledge base?"
    },

    {
        "id": "R09",
        "question":
            "How are uploaded documents kept separate using upload sessions?"
    },

    {
        "id": "R10",
        "question":
            "Which components would need to change if the embedding model were replaced?"
    },

]


# =========================================================
# MAIN
# =========================================================

print("=" * 70)
print("INSUREMATE WEEK 4 - REPOSITORY LEVEL RAG")
print("=" * 70)

print(
    f"\nGeneration model: {GENERATION_MODEL}"
)

print(
    f"Embedding model: {EMBEDDING_MODEL}"
)

print(
    f"Source files: {len(SOURCE_FILES)}"
)

print(
    f"Questions: {len(QUESTIONS)}"
)


# ---------------------------------------------------------
# BUILD CORPUS
# ---------------------------------------------------------

corpus = build_corpus()

print(
    f"\nRepository chunks created: "
    f"{len(corpus)}"
)


# ---------------------------------------------------------
# BUILD EMBEDDINGS
# ---------------------------------------------------------

corpus = build_index(
    corpus
)


# ---------------------------------------------------------
# RUN QUESTIONS
# ---------------------------------------------------------

results = []

for question_data in QUESTIONS:

    question_id = question_data[
        "id"
    ]

    question = question_data[
        "question"
    ]

    print(
        "\n" + "-" * 70
    )

    print(
        f"{question_id}: {question}"
    )

    print(
        "-" * 70
    )

    retrieval_start = (
        time.perf_counter()
    )

    retrieved = retrieve(
        question,
        corpus,
    )

    retrieval_latency = (
        time.perf_counter()
        - retrieval_start
    )

    print(
        f"\nRetrieved {len(retrieved)} "
        f"repository chunks"
    )

    for i, item in enumerate(
        retrieved,
        1,
    ):

        print(
            f"{i}. "
            f"{item['file']} "
            f"lines "
            f"{item['start_line']}-"
            f"{item['end_line']} "
            f"| score "
            f"{item['score']}"
        )

    prompt = build_prompt(
        question,
        retrieved,
    )

    answer, generation_latency = (
        generate_answer(prompt)
    )

    print(
        "\nANSWER:"
    )

    print(answer)

    results.append(
        {
            "question_id": question_id,
            "question": question,
            "model": GENERATION_MODEL,
            "retrieval_latency_seconds":
                round(
                    retrieval_latency,
                    3,
                ),
            "generation_latency_seconds":
                generation_latency,
            "retrieved_chunks":
                retrieved,
            "answer":
                answer,
        }
    )


# ---------------------------------------------------------
# SAVE
# ---------------------------------------------------------

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True,
)

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8",
) as f:

    json.dump(
        {
            "metadata": {
                "evaluation":
                    "Repository-level RAG",
                "generation_model":
                    GENERATION_MODEL,
                "embedding_model":
                    EMBEDDING_MODEL,
                "source_files":
                    SOURCE_FILES,
                "questions":
                    QUESTIONS,
                "chunk_count":
                    len(corpus),
            },
            "results":
                results,
        },
        f,
        indent=2,
        ensure_ascii=False,
    )


print(
    "\n" + "=" * 70
)

print(
    "REPOSITORY RAG EVALUATION COMPLETED"
)

print(
    "=" * 70
)

print(
    f"\nSaved to:\n{OUTPUT_FILE}"
)
