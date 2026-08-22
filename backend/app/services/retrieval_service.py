import json
import math
from pathlib import Path

from app.services.embedding_service import generate_embedding


BASE_DIR = Path(__file__).resolve().parents[3]

EMBEDDINGS_FILE = (
    BASE_DIR
    / "data"
    / "embeddings"
    / "embeddings.json"
)


def load_embeddings():
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def cosine_similarity(a, b):

    dot_product = sum(
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

    return dot_product / (
        magnitude_a * magnitude_b
    )


def retrieve(
    question: str,
    top_k: int = 5
):

    documents = load_embeddings()

    query_embedding = generate_embedding(question)

    results = []

    for item in documents:

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

    return results[:top_k]
