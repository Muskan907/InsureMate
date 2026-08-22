# from fastapi import APIRouter
# import json
# from pathlib import Path

# router = APIRouter()

# BASE_DIR = Path(__file__).resolve().parents[3]

# EMBEDDINGS_FILE = (
#     BASE_DIR
#     / "data"
#     / "embeddings"
#     / "embeddings.json"
# )


# def load_data():
#     with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
#         return json.load(f)


# @router.get("/documents")
# def get_documents():

#     data = load_data()

#     documents = {}

#     for item in data:

#         name = item["document"]

#         if name not in documents:
#             documents[name] = {
#                 "name": name,
#                 "chunks": 0
#             }

#         documents[name]["chunks"] += 1

#     return {
#         "total_documents": len(documents),
#         "total_chunks": len(data),
#         "documents": list(documents.values())
#     }


# @router.get("/chunks")
# def get_chunks(
#     document: str | None = None,
#     limit: int = 1000
# ):
#     data = load_data()

#     if document:
#         data = [
#             item
#             for item in data
#             if item["document"] == document
#         ]

#     chunks = []

#     for item in data[:limit]:

#         chunks.append({
#             "document": item["document"],
#             "page": item["page"],
#             "chunk_id": item["chunk_id"],
#             "text": item["text"],
#             "characters": len(item["text"]),
#         })

#     return {
#         "total": len(data),
#         "chunks": chunks
#     }


# @router.get("/embeddings")
# def get_embeddings(
#     document: str | None = None,
#     chunk_id: int | None = None
# ):

#     data = load_data()

#     if document:
#         data = [
#             item for item in data
#             if item["document"] == document
#         ]

#     if chunk_id is not None:
#         data = [
#             item for item in data
#             if item["chunk_id"] == chunk_id
#         ]

#     results = []

#     for item in data[:50]:

#         results.append({
#             "document": item["document"],
#             "page": item["page"],
#             "chunk_id": item["chunk_id"],
#             "embedding": item["embedding"],
#             "dimensions": len(item["embedding"])
#         })

#     return {
#         "embeddings": results
#     }

from fastapi import APIRouter
import json
from pathlib import Path

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[3]

EMBEDDINGS_FILE = (
    BASE_DIR
    / "data"
    / "embeddings"
    / "embeddings.json"
)


def load_data():
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/documents")
def get_documents():

    data = load_data()

    documents = {}

    for item in data:

        name = item["document"]

        if name not in documents:
            documents[name] = {
                "name": name,
                "chunks": 0
            }

        documents[name]["chunks"] += 1

    return {
        "total_documents": len(documents),
        "total_chunks": len(data),
        "documents": list(documents.values())
    }


@router.get("/chunks")
def get_chunks(
    document: str | None = None
):

    data = load_data()

    if document:
        data = [
            item
            for item in data
            if item["document"] == document
        ]

    chunks = []

    for index, item in enumerate(data):

        text = item["text"]

        chunks.append({
            "document": item["document"],
            "page": item["page"],
            "chunk_id": item["chunk_id"],
            "text": text,
            "characters": len(text),

            # Chunking configuration
            "chunk_size": 800,
            "overlap": 150,
            "step_size": 650,

            # Approximate character range
            "start_character": index * 650,
            "end_character": (index * 650) + len(text)
        })

    return {
        "total": len(chunks),
        "chunk_size": 800,
        "overlap": 150,
        "step_size": 650,
        "chunks": chunks
    }


@router.get("/embeddings")
def get_embeddings(
    document: str | None = None,
    chunk_id: int | None = None
):

    data = load_data()

    if document:
        data = [
            item
            for item in data
            if item["document"] == document
        ]

    if chunk_id is not None:
        data = [
            item
            for item in data
            if item["chunk_id"] == chunk_id
        ]

    results = []

    for item in data:

        results.append({
            "document": item["document"],
            "page": item["page"],
            "chunk_id": item["chunk_id"],
            "embedding": item["embedding"],
            "dimensions": len(item["embedding"])
        })

    return {
        "embeddings": results
    }