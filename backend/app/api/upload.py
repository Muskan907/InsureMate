from pathlib import Path
import tempfile
import os

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.upload_rag_service import (
    create_upload_session,
    retrieve_uploaded,
    get_uploaded_chunks,
    get_uploaded_embeddings
)


def call_uploaded_ollama(model: str, prompt: str):
    import requests
    import time

    OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434/api"
    )

    url = f"{OLLAMA_BASE_URL}/generate"

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }

    last_error = None

    for attempt in range(2):
        try:
            response = requests.post(
                url,
                json=payload,
                timeout=180
            )

            response.raise_for_status()

            data = response.json()

            return data.get("response", "")

        except (requests.exceptions.ConnectionError,
                requests.exceptions.ChunkedEncodingError,
                requests.exceptions.Timeout) as e:

            last_error = e

            if attempt == 0:
                time.sleep(2)
                continue

            raise last_error



router = APIRouter()


class UploadChatRequest(BaseModel):
    session_id: str
    question: str
    model: str = "codellama:7b-instruct"
    top_k: int = 3


class UploadSessionRequest(BaseModel):
    session_id: str


@router.post("")
async def upload_pdf(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty"
        )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            delete=False
        ) as temp_file:
            temp_file.write(content)
            temp_path = Path(temp_file.name)

        result = create_upload_session(temp_path, file.filename)

        return {
            "success": True,
            **result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )

    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


@router.post("/chunks")
def get_uploaded_document_chunks(
    request: UploadSessionRequest
):
    try:
        chunks = get_uploaded_chunks(
            request.session_id
        )

        return {
            "session_id": request.session_id,
            "chunks": chunks,
            "total_chunks": len(chunks)
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Upload session not found"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load uploaded chunks: {str(e)}"
        )


@router.post("/embeddings")
def get_uploaded_document_embeddings(
    request: UploadSessionRequest
):
    try:
        embeddings = get_uploaded_embeddings(
            request.session_id
        )

        return {
            "session_id": request.session_id,
            "embedding_model": "nomic-embed-text",
            "embedding_dimensions": (
                len(embeddings[0]["embedding"])
                if embeddings
                else 0
            ),
            "total_chunks": len(embeddings),
            "embeddings": embeddings
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Upload session not found"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load uploaded embeddings: {str(e)}"
        )


@router.post("/retrieve")
def retrieve_uploaded_document(
    request: UploadChatRequest
):

    try:
        results = retrieve_uploaded(
            request.session_id,
            request.question,
            request.top_k
        )

        return {
            "session_id": request.session_id,
            "question": request.question,
            "results": results
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Upload session not found"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Retrieval failed: {str(e)}"
        )


@router.post("/chat")
def chat_with_uploaded_document(
    request: UploadChatRequest
):

    try:
        results = retrieve_uploaded(
            request.session_id,
            request.question,
            request.top_k
        )

        if not results:
            return {
                "session_id": request.session_id,
                "question": request.question,
                "model": request.model,
                "answer": (
                    "The uploaded document does not contain "
                    "enough information to answer this question."
                ),
                "sources": [],
                "retrieved_chunks": []
            }

        context = "\n\n".join(
            item.get("text", "")
            for item in results
        )

        prompt = f"""
You are InsureMate, an AI assistant for an uploaded insurance policy document.

Answer the CURRENT USER QUESTION using ONLY the POLICY EVIDENCE below.

CURRENT USER QUESTION:
{request.question}

POLICY EVIDENCE:
{context}

RULES:
1. Answer the current question directly.
2. Use only facts supported by the policy evidence.
3. Do not use outside knowledge.
4. Do not invent or assume information.
5. Recognize normal paraphrases and equivalent terminology.
6. Preserve important numbers, conditions, limits and requirements.
7. Pay close attention to the exact policy condition mentioned in the question.
8. If the question refers to an in-force policy, use only rules applicable to an in-force policy.
9. Do not use paid-up, Auto Cover, revival, surrender or other policy-state rules unless the question explicitly asks about that state.
10. When multiple chunks contain related information, prioritize the chunk that directly answers the question and matches its policy condition.
11. Do not combine rules from different policy states.
7. If the evidence genuinely does not contain enough information,
   say:
"The available uploaded document does not contain enough information to answer this question."
8. Do not repeat the question.
9. Do not mention chunks, retrieval, embeddings, sources or the model.
10. Do not copy large portions of the policy.
11. Keep the answer concise, preferably 1 to 3 sentences.
12. Return only the final answer.

ANSWER:
"""

        answer = call_uploaded_ollama(
            request.model,
            prompt
        )

        answer = (answer or "").strip()

        if not answer:
            answer = (
                "The available uploaded document does not contain "
                "enough information to answer this question."
            )

        sources = [
            {
                "document": item.get("document"),
                "page": item.get("page"),
                "chunk_id": item.get("chunk_id"),
                "score": item.get("score")
            }
            for item in results
        ]

        return {
            "session_id": request.session_id,
            "question": request.question,
            "model": request.model,
            "answer": answer,
            "sources": sources,
            "retrieved_chunks": results,
            "retrieval_confidence": results[0].get("score")
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Upload session not found"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Uploaded document chat failed: {str(e)}"
        )





# =========================================================
# MODE 2 - RAG VS NO-RAG COMPARISON
# =========================================================

@router.post("/compare")
def compare_uploaded_document(
    request: UploadChatRequest
):
    """
    Compare the same question with:
    1. No RAG: LLM receives only the user question.
    2. RAG: LLM receives retrieved policy evidence.

    Existing /chat endpoint is untouched.
    """

    try:
        # -------------------------------------------------
        # 1. RETRIEVE POLICY EVIDENCE
        # -------------------------------------------------

        results = retrieve_uploaded(
            request.session_id,
            request.question,
            request.top_k
        )

        context = "\n\n".join(
            item.get("text", "")
            for item in results
        )

        # -------------------------------------------------
        # 2. NO-RAG PROMPT
        # -------------------------------------------------

        no_rag_prompt = f"""
You are an insurance AI assistant.

Answer the user's question using ONLY your general
language-model knowledge.

IMPORTANT:
- Do NOT use any uploaded document.
- Do NOT use retrieved policy evidence.
- Do NOT assume facts from a specific insurance policy.
- Answer naturally and concisely.
- If you are uncertain, clearly say that you are uncertain.

USER QUESTION:
{request.question}

ANSWER:
"""

        no_rag_answer = call_uploaded_ollama(
            request.model,
            no_rag_prompt
        )

        # -------------------------------------------------
        # 3. RAG PROMPT
        # -------------------------------------------------

        rag_prompt = f"""
You are InsureMate, an AI assistant for an uploaded
insurance policy.

Answer the user's question using ONLY the policy evidence
provided below.

RULES:
1. Use only the supplied policy evidence.
2. Do not use outside knowledge.
3. Do not invent policy facts.
4. Preserve important numbers, conditions and limits.
5. Answer clearly and concisely.
6. If the evidence genuinely does not answer the question,
   say:

"The available uploaded document does not contain enough
information to answer this question."

USER QUESTION:
{request.question}

POLICY EVIDENCE:
{context}

ANSWER:
"""

        rag_answer = call_uploaded_ollama(
            request.model,
            rag_prompt
        )

        return {
            "session_id": request.session_id,
            "question": request.question,
            "model": request.model,

            "no_rag": {
                "answer": (no_rag_answer or "").strip(),
                "sources": []
            },

            "rag": {
                "answer": (rag_answer or "").strip(),
                "sources": [
                    {
                        "document": item.get("document"),
                        "page": item.get("page"),
                        "chunk_id": item.get("chunk_id"),
                        "score": item.get("score")
                    }
                    for item in results
                ],
                "retrieved_chunks": results,
                "retrieval_confidence": (
                    results[0].get("score")
                    if results
                    else 0
                )
            }
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Upload session not found"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RAG comparison failed: {str(e)}"
        )
