import json
from pathlib import Path

from app.services.document_processor import process_all_documents
from app.services.embedding_service import generate_embeddings


OUTPUT_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "embeddings"
    / "embeddings.json"
)


print("\n==============================")
print("INSUREMATE EMBEDDING PIPELINE")
print("==============================\n")


print("Step 1: Loading documents...")

chunks = process_all_documents()

print(f"Loaded {len(chunks)} chunks.\n")


print("Step 2: Generating embeddings...")

embedded_chunks = generate_embeddings(chunks)


OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)


with open(OUTPUT_FILE, "w", encoding="utf-8") as f:

    json.dump(
        embedded_chunks,
        f,
        ensure_ascii=False
    )


print("\n==============================")
print("EMBEDDING COMPLETE")
print("==============================")

print(f"Total vectors: {len(embedded_chunks)}")

print(f"Saved to: {OUTPUT_FILE}")

print(
    f"Embedding dimensions: "
    f"{len(embedded_chunks[0]['embedding'])}"
)