import json
import math
import uuid
from pathlib import Path

from app.services.document_processor import process_pdf
from app.services.embedding_service import generate_embedding


BASE_DIR = Path(__file__).resolve().parents[3]

UPLOAD_DIR = BASE_DIR / "data" / "uploads"

MAIN_EMBEDDINGS_FILE = (
    BASE_DIR
    / "data"
    / "embeddings"
    / "embeddings.json"
)

def add_to_main_knowledge_base(embedded_chunks):
    
    if MAIN_EMBEDDINGS_FILE.exists():
        with open(
            MAIN_EMBEDDINGS_FILE,
            "r",
            encoding="utf-8"
        ) as f:
            main_embeddings = json.load(f)
    else:
        main_embeddings = []

    existing_documents = {
        item["document"]
        for item in main_embeddings
    }

    uploaded_document = (
        embedded_chunks[0]["document"]
        if embedded_chunks
        else None
    )

    # Prevent duplicate insertion
    if uploaded_document in existing_documents:
        print(
            f"Document already exists in knowledge base: "
            f"{uploaded_document}"
        )
        return

    main_embeddings.extend(embedded_chunks)

    with open(
        MAIN_EMBEDDINGS_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            main_embeddings,
            f,
            ensure_ascii=False
        )

    print(
        f"Added {len(embedded_chunks)} chunks "
        f"to main knowledge base"
    )


def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))

    magnitude_a = math.sqrt(sum(x * x for x in a))
    magnitude_b = math.sqrt(sum(y * y for y in b))

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot / (magnitude_a * magnitude_b)


def create_upload_session(pdf_path: Path, original_filename: str = None):
    session_id = uuid.uuid4().hex

    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    saved_pdf = session_dir / (original_filename or pdf_path.name)

    if pdf_path.resolve() != saved_pdf.resolve():
        saved_pdf.write_bytes(pdf_path.read_bytes())

    chunks = process_pdf(saved_pdf)

    embedded_chunks = []

    for i, chunk in enumerate(chunks):
        embedding = generate_embedding(chunk["text"])

        embedded_chunks.append({
            **chunk,
            "embedding": embedding
        })

        print(
            f"Uploaded PDF embedding "
            f"{i + 1}/{len(chunks)} | Chunk {chunk['chunk_id']}"
        )

    embeddings_file = session_dir / "embeddings.json"

    with open(embeddings_file, "w", encoding="utf-8") as f:
        json.dump(
            embedded_chunks,
            f,
            ensure_ascii=False
        )
        
    # Add uploaded PDF to the main knowledge base
    add_to_main_knowledge_base(embedded_chunks)    

    return {
        "session_id": session_id,
        "document": saved_pdf.name,
        "chunks": len(embedded_chunks),
        "embedding_dimensions": (
            len(embedded_chunks[0]["embedding"])
            if embedded_chunks
            else 0
        )
    }


def retrieve_uploaded(session_id: str, question: str, top_k: int = 3):
    embeddings_file = (
        UPLOAD_DIR
        / session_id
        / "embeddings.json"
    )

    if not embeddings_file.exists():
        raise FileNotFoundError("Upload session not found")

    with open(embeddings_file, "r", encoding="utf-8") as f:
        documents = json.load(f)

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



def get_uploaded_embeddings(session_id: str):
    embeddings_file = (
        UPLOAD_DIR
        / session_id
        / "embeddings.json"
    )

    if not embeddings_file.exists():
        raise FileNotFoundError("Upload session not found")

    with open(embeddings_file, "r", encoding="utf-8") as f:
        documents = json.load(f)

    return [
        {
            "document": item["document"],
            "page": item["page"],
            "chunk_id": item["chunk_id"],
            "embedding": item["embedding"]
        }
        for item in documents
    ]

def get_uploaded_chunks(session_id: str):
    embeddings_file = (
        UPLOAD_DIR
        / session_id
        / "embeddings.json"
    )

    if not embeddings_file.exists():
        raise FileNotFoundError("Upload session not found")

    with open(embeddings_file, "r", encoding="utf-8") as f:
        documents = json.load(f)

    # Return chunk information without the large embedding vectors.
    return [
        {
            "document": item["document"],
            "page": item["page"],
            "chunk_id": item["chunk_id"],
            "text": item["text"]
        }
        for item in documents
    ]
