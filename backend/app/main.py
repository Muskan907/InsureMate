
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi import Body
from typing import Optional, List, Dict
import requests
import re

from app.api.knowledge import router as knowledge_router
from app.api.retrieval import router as retrieval_router
from app.api.upload import router as upload_router


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(title="InsureMate AI")


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.62.129:5173",
        "http://192.168.62.129:5174",
        "http://192.168.62.129:5175",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(
    knowledge_router,
    prefix="/api/knowledge"
)

app.include_router(
    retrieval_router,
    prefix="/api/retrieval"
)

app.include_router(
    upload_router,
    prefix="/api/upload"
)


# =========================================================
# OLLAMA
# =========================================================

OLLAMA_URL = "http://localhost:11434/api/generate"

MODEL = "codellama:7b-instruct"


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "application": "InsureMate AI",
        "status": "running"
    }


# =========================================================
# HALLUCINATION REQUEST MODEL
# =========================================================

class HallucinationRequest(BaseModel):
    question: str
    model: str = "codellama:7b-instruct"
    top_k: int = 3

class ChatRequest(BaseModel):
    question: str
    model: str = "codellama:7b-instruct"
    history: List[Dict[str, str]] = Field(default_factory=list)


# =========================================================
# OLLAMA HELPER
# =========================================================

def call_ollama(model: str, prompt: str):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": 0,
            "options": {
                "num_ctx": 1024,
                "temperature": 0,
                "num_predict": 120
            }
        },
        timeout=180
    )

    response.raise_for_status()

    return response.json()["response"].strip()


# =========================================================
# GROUNDING CALCULATION
# =========================================================

def calculate_grounding(answer, results):

    evidence_text = " ".join(
        item.get("text", "").lower()
        for item in results
    )

    sentences = [
        sentence.strip()
        for sentence in re.split(
            r"[.!?]",
            answer
        )
        if len(sentence.strip()) > 20
    ]

    stop_words = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "are",
        "was",
        "were",
        "will",
        "have",
        "has",
        "been",
        "their",
        "they",
        "into",
        "under",
        "provided",
        "after",
        "before",
        "same",
        "which",
        "where",
        "than",
        "then",
        "also",
        "only",
        "based",
        "policy",
        "evidence",
        "insured"
    }

    supported_claims = []
    unsupported_claims = []

    for sentence in sentences:

        words = re.findall(
            r"[a-zA-Z]{4,}",
            sentence.lower()
        )

        keywords = [
            word
            for word in words
            if word not in stop_words
        ]

        if not keywords:
            continue

        matches = sum(
            1
            for word in keywords
            if word in evidence_text
        )

        ratio = matches / len(keywords)

        if ratio >= 0.35:
            supported_claims.append(sentence)
        else:
            unsupported_claims.append(sentence)

    total_claims = (
        len(supported_claims)
        + len(unsupported_claims)
    )

    if total_claims == 0:
        grounding_score = 0
    else:
        grounding_score = round(
            len(supported_claims)
            / total_claims
            * 100
        )

    if grounding_score >= 80:
        risk = "LOW"
    elif grounding_score >= 60:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    return {
        "grounding_score": grounding_score,
        "risk": risk,
        "supported_claims": supported_claims,
        "unsupported_claims": unsupported_claims
    }


# =========================================================
# MODELS API
# =========================================================

@app.get("/api/models")
def get_models():

    try:

        response = requests.get(
            "http://localhost:11434/api/tags",
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        return {
            "models": data.get("models", [])
        }

    except Exception as e:

        return {
            "models": [],
            "error": str(e)
        }


# =========================================================
# HALLUCINATION DETECTOR
# =========================================================

@app.post("/api/hallucination/check")
def hallucination_check(request: HallucinationRequest):

    # ---------------------------------------------------------
    # 1. RETRIEVE POLICY EVIDENCE
    # ---------------------------------------------------------

    retrieval_response = requests.post(
        "http://localhost:8000/api/retrieval/search",
        json={
            "question": request.question,
            "top_k": request.top_k
        },
        timeout=60
    )

    retrieval_response.raise_for_status()

    retrieval_data = retrieval_response.json()

    results = retrieval_data.get("results", [])

    if not results:
        return {
            "question": request.question,
            "model": request.model,
            "answer": "No relevant policy evidence was found.",
            "grounding_score": 0,
            "risk": "HIGH",
            "supported_claims": [],
            "unsupported_claims": [],
            "sources": [],
            "retrieved_chunks": [],
            "retrieval_confidence": 0
        }

    # ---------------------------------------------------------
    # 2. BUILD EVIDENCE
    # ---------------------------------------------------------

    evidence_parts = []

    for i, result in enumerate(results, 1):
        evidence_parts.append(
            f"""
EVIDENCE {i}
Document: {result.get("document", "")}
Page: {result.get("page", "")}
Chunk: {result.get("chunk_id", "")}

{result.get("text", "")}
"""
        )

    evidence = "\n".join(evidence_parts)

    # ---------------------------------------------------------
    # 3. GENERATE ANSWER
    # ---------------------------------------------------------

    prompt = f"""
You are InsureMate, an insurance policy assistant.

Answer the USER QUESTION using ONLY the POLICY EVIDENCE.

USER QUESTION:
{request.question}

POLICY EVIDENCE:
{evidence}

Rules:
- Give the answer directly.
- Use only facts from the evidence.
- Do not invent anything.
- Preserve important numbers and conditions.
- If the evidence contains the answer, answer it.
- Do not say there is insufficient information when the evidence clearly answers the question.

ANSWER:
"""

    try:
          

        answer = call_ollama(
            request.model,
            prompt
        )

    except Exception as e:
        return {
            "question": request.question,
            "model": request.model,
            "answer": f"Model generation failed: {str(e)}",
            "grounding_score": 0,
            "risk": "HIGH",
            "supported_claims": [],
            "unsupported_claims": [],
            "sources": results,
            "retrieved_chunks": results,
            "retrieval_confidence": (
                results[0].get("score", 0)
                if results else 0
            )
        }

    # ---------------------------------------------------------
    # 4. CHECK GROUNDING
    # ---------------------------------------------------------

    sentences = re.split(
        r'(?<=[.!?])\s+',
        answer
    )

    supported_claims = []
    unsupported_claims = []

    for sentence in sentences:

        sentence = sentence.strip()

        if not sentence:
            continue

        # Ignore the fallback sentence itself
        if (
            "provided policy evidence does not contain enough information"
            in sentence.lower()
        ):
            unsupported_claims.append(sentence)
            continue

        sentence_words = set(
            re.findall(
                r'\b[a-zA-Z]{4,}\b',
                sentence.lower()
            )
        )

        best_overlap = 0

        for result in results:

            evidence_words = set(
                re.findall(
                    r'\b[a-zA-Z]{4,}\b',
                    result.get("text", "").lower()
                )
            )

            if not sentence_words:
                continue

            overlap = len(
                sentence_words & evidence_words
            ) / len(sentence_words)

            best_overlap = max(
                best_overlap,
                overlap
            )

        if best_overlap >= 0.35:
            supported_claims.append(sentence)
        else:
            unsupported_claims.append(sentence)

    total_claims = (
        len(supported_claims)
        + len(unsupported_claims)
    )

    if total_claims == 0:
        grounding_score = 0
    else:
        grounding_score = round(
            len(supported_claims)
            / total_claims
            * 100
        )

    if grounding_score >= 80:
        risk = "LOW"
    elif grounding_score >= 60:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    # ---------------------------------------------------------
    # 5. RETURN RESULT
    # ---------------------------------------------------------

    return {
        "question": request.question,
        "model": request.model,
        "answer": answer,
        "grounding_score": grounding_score,
        "risk": risk,
        "supported_claims": supported_claims,
        "unsupported_claims": unsupported_claims,
        "sources": results,
        "retrieved_chunks": results,
        "retrieval_confidence": (
            results[0].get("score", 0)
            if results else 0
        )
    }

# =========================================================
# RAG CHAT
# =========================================================

@app.post("/api/chat")
def chat(
    question: str = "",
    model: str = MODEL,
    request: Optional[ChatRequest] = Body(default=None)
):
    """
    Main conversational RAG endpoint with multi-model orchestration.
    """

    if request is not None:
        question = request.question
        history = request.history or []
    else:
        history = []

    question = (question or "").strip()

    fallback = (
        "The available insurance documents do not contain enough "
        "information to answer this question."
    )

    if not question:
        return {
            "question": question,
            "model": None,
            "complexity": None,
            "models_used": [],
            "answer": "Please enter a question about your insurance policy.",
            "validation": None,
            "sources": [],
            "retrieved_chunks": []
        }

    # =====================================================
    # MULTI-MODEL PIPELINE LOG
    # =====================================================

    print("\n" + "=" * 65)
    print("INSUREMATE MULTI-MODEL PIPELINE")
    print("=" * 65)
    print(f"Question: {question}")

    # =====================================================
    # 1. RETRIEVAL
    # =====================================================

    print("\nStage 0: RAG → Retrieving relevant policy evidence")

    retrieval_question = question
    q_lower = question.lower().strip()

    # Follow-up question handling
    if history and len(q_lower.split()) <= 6:

        previous_user_questions = [
            message.get("content", "").strip()
            for message in history
            if message.get("role") == "user"
            and message.get("content", "").strip()
        ]

        if previous_user_questions:
            retrieval_question = (
                previous_user_questions[-1]
                + " "
                + question
            )

    try:
        retrieval_response = requests.post(
            "http://localhost:8000/api/retrieval/search",
            json={
                "question": retrieval_question,
                "top_k": 3
            },
            timeout=120
        )

        retrieval_response.raise_for_status()

        retrieval_data = retrieval_response.json()
        results = retrieval_data.get("results", [])

        print(f"Retrieved chunks: {len(results)}")

    except Exception as e:

        print(f"Retrieval failed: {str(e)}")
        print("=" * 65 + "\n")

        return {
            "question": question,
            "model": None,
            "complexity": None,
            "models_used": [],
            "answer": fallback,
            "validation": "RETRIEVAL_FAILED",
            "sources": [],
            "retrieved_chunks": [],
            "retrieval_confidence": 0,
            "error": str(e)
        }

    best_score = max(
        (float(item.get("score", 0)) for item in results),
        default=0
    )

    print(f"Best retrieval score: {best_score:.4f}")

    # =====================================================
    # 2. BASIC RELEVANCE CHECK
    # =====================================================

    stop_words = {
        "what", "when", "where", "which", "who", "whom", "why",
        "how", "is", "are", "was", "were", "do", "does", "did",
        "can", "could", "would", "should", "will", "the", "a",
        "an", "and", "or", "to", "of", "for", "in", "on", "at",
        "from", "with", "about", "after", "before", "under",
        "this", "that", "these", "those", "it", "its", "be",
        "been", "being", "i", "we", "you", "your", "my", "me",
        "they", "them", "their"
    }

    def normalize_term(word):
        replacements = {
            "hospitalization": "hospitalisation",
            "hospitalized": "hospitalised",
            "hospitalize": "hospitalise",
            "organization": "organisation",
            "organizations": "organisations",
            "authorized": "authorised",
            "authorization": "authorisation",
            "behavior": "behaviour",
            "center": "centre"
        }

        return replacements.get(word.lower(), word.lower())

    question_words = {
        normalize_term(word)
        for word in re.findall(
            r"\b[a-zA-Z]{4,}\b",
            retrieval_question.lower()
        )
        if word.lower() not in stop_words
    }

    evidence_text = " ".join(
        item.get("text", "").lower()
        for item in results
    )

    evidence_words = {
        normalize_term(word)
        for word in re.findall(
            r"\b[a-zA-Z]{4,}\b",
            evidence_text
        )
    }

    matched_words = question_words & evidence_words

    relevance_ratio = (
        len(matched_words) / len(question_words)
        if question_words else 1
    )

    evidence_is_relevant = (
        bool(results)
        and (
            best_score >= 0.60
            or (
                best_score >= 0.45
                and relevance_ratio >= 0.30
            )
        )
    )

    print(f"Evidence relevant: {evidence_is_relevant}")

    if not evidence_is_relevant:

        print("Pipeline stopped: No relevant evidence found")
        print("=" * 65 + "\n")

        return {
            "question": question,
            "model": None,
            "complexity": None,
            "models_used": [],
            "answer": fallback,
            "validation": "NO_RELEVANT_EVIDENCE",
            "sources": [],
            "retrieved_chunks": results,
            "retrieval_confidence": best_score
        }

    # =====================================================
    # 3. SELECT RELEVANT EVIDENCE
    # =====================================================

    focused_results = results[:3]

    # =====================================================
    # 4. BUILD POLICY CONTEXT
    # =====================================================

    context_parts = []

    for index, result in enumerate(focused_results, 1):

        context_parts.append(
            f"""
SOURCE {index}
Document: {result.get("document")}
Page: {result.get("page")}
Chunk ID: {result.get("chunk_id")}

POLICY TEXT:
{result.get("text", "")}
"""
        )

    context = "\n".join(context_parts)

    # =====================================================
    # 5. QWEN ROUTING
    # =====================================================

    print("\nStage 1: Qwen 2.5 1.5B → Analyzing question complexity")

    router_prompt = f"""
You are a routing assistant for an insurance AI system.

Classify the following user question as either SIMPLE or COMPLEX.

SIMPLE:
- Direct factual question
- One clear piece of information
- Can be answered briefly from the policy evidence

COMPLEX:
- Requires explanation, comparison, multiple conditions,
  calculations, interpretation, or combining multiple pieces
  of policy information

USER QUESTION:
{question}

Return ONLY one word:

SIMPLE

or

COMPLEX
"""

    try:

        routing_decision = call_ollama(
            "qwen2.5:1.5b",
            router_prompt
        ).strip().upper()

    except Exception as e:

        print(f"Qwen routing failed: {str(e)}")
        print("Defaulting to COMPLEX route")

        routing_decision = "COMPLEX"

    if (
        "SIMPLE" in routing_decision
        and "COMPLEX" not in routing_decision
    ):

        selected_model = "qwen2.5:1.5b"
        complexity = "simple"

    else:

        selected_model = "codellama:7b-instruct"
        complexity = "complex"

    print(f"Qwen decision: {complexity.upper()}")
    print(f"Selected generation model: {selected_model}")

    # =====================================================
    # 6. ANSWER GENERATION
    # =====================================================

    print(f"\nStage 2: {selected_model} → Generating grounded answer")

    prompt = f"""
You are InsureMate, an insurance policy assistant.

Your job is to answer the user's question using ONLY the information
provided in POLICY EVIDENCE.

IMPORTANT:
- Do NOT use any outside knowledge.
- Do NOT invent information.
- Do NOT add conditions, limits, waiting periods, or exclusions unless
  they are explicitly present in the evidence.
- Combine information from multiple evidence sections when relevant.
- If the question asks about multiple things, answer every part that is
  supported by the evidence.
- You may summarize and paraphrase the policy text.
- Preserve important numbers, durations, percentages and conditions.
- Do NOT mention "source", "chunk", "retrieval", "policy evidence",
  "document", or model names.
- Do NOT explain your reasoning.
- Return ONLY the final answer.

If some parts of the question are supported and some are not, answer the
supported parts. Do NOT reject the entire question.

Only if NONE of the evidence can answer the question, return exactly:

The available insurance documents do not contain enough information to answer this question.

CURRENT USER QUESTION:
{question}

POLICY EVIDENCE:
{context}

FINAL ANSWER:
"""

    try:

        answer = call_ollama(
            selected_model,
            prompt
        )

    except Exception as e:

        print(f"Answer generation failed: {str(e)}")
        print("=" * 65 + "\n")

        return {
            "question": question,
            "model": selected_model,
            "complexity": complexity,
            "models_used": [
                "qwen2.5:1.5b",
                selected_model
            ],
            "answer": fallback,
            "validation": "GENERATION_FAILED",
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
            "retrieval_confidence": best_score,
            "error": str(e)
        }

    answer = (answer or "").strip()

    print(f"\nGenerated answer from {selected_model}:")
    print(answer)

    if not answer:
        answer = fallback

    # =====================================================
    # 7. PHI-3 VALIDATION
    # =====================================================

    print("\nStage 3: Phi-3 Mini → Validating answer grounding")

    validator_prompt = f"""
You are a binary answer validator.

Determine whether the ANSWER contains claims that are supported by
the POLICY EVIDENCE.

POLICY EVIDENCE:
{context}

ANSWER:
{answer}

Return EXACTLY one word.

Return:

VALID

if the answer is supported by the policy evidence.

Return:

INVALID

only if the answer contains information that is clearly unsupported,
invented, or contradicts the policy evidence.

Do not explain your decision.
Do not write any other words.
"""

    try:

        validation_raw = call_ollama(
            "phi3:mini",
            validator_prompt
        )

        validation_raw = (
            validation_raw or ""
        ).strip().upper()

        print(f"Phi-3 raw validation result: {validation_raw}")

        # Strict normalization
        if validation_raw == "VALID":
            validation = "VALID"

        elif validation_raw == "INVALID":
            validation = "INVALID"

        else:
            # If Phi-3 gives an unexpected response,
            # do not automatically reject CodeLlama's answer
            validation = "VALID"

    except Exception as e:

        print(f"Phi-3 validation failed: {str(e)}")

        # Keep generated answer if validator fails
        validation = "VALID"

    print(f"Final validation decision: {validation}")

    if validation == "INVALID":

        print("Validation failed → Returning safe fallback")

        answer = fallback

    else:

        print("Validation passed → Returning generated answer")
    # =====================================================
    # 8. BUILD SOURCES
    # =====================================================

    sources = [
        {
            "document": item.get("document"),
            "page": item.get("page"),
            "chunk_id": item.get("chunk_id"),
            "score": item.get("score")
        }
        for item in results
    ]

    # =====================================================
    # 9. MODELS USED
    # =====================================================

    models_used = list(
        dict.fromkeys([
            "qwen2.5:1.5b",
            selected_model,
            "phi3:mini"
        ])
    )

    print("\nPipeline completed successfully")
    print("Models actually used:")

    for used_model in models_used:
        print(f"  ✓ {used_model}")

    print("=" * 65 + "\n")

    # =====================================================
    # 10. RETURN RESULT
    # =====================================================

    return {
        "question": question,
        "model": selected_model,
        "complexity": complexity,
        "models_used": models_used,
        "answer": answer,
        "validation": validation,
        "sources": sources,
        "retrieved_chunks": results,
        "retrieval_confidence": best_score
    }