import requests

import os

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434/api"
)

OLLAMA_EMBED_URL = f"{OLLAMA_BASE_URL}/embed"
EMBEDDING_MODEL = "nomic-embed-text"


def generate_embedding(text: str):
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBEDDING_MODEL,
            "input": text
        },
        timeout=120
    )

    response.raise_for_status()

    data = response.json()

    return data["embeddings"][0]


def generate_embeddings(chunks):

    results = []

    for i, chunk in enumerate(chunks):

        embedding = generate_embedding(chunk["text"])

        results.append({
            **chunk,
            "embedding": embedding
        })

        print(
            f"Embedded {i + 1}/{len(chunks)} "
            f"| {chunk['document']} "
            f"| Chunk {chunk['chunk_id']}"
        )

    return results