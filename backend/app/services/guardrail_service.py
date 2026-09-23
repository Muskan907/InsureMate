"""Input and output guardrails for InsureMate.

The guardrails are deliberately deterministic at the application boundary.
They prevent obviously unsafe/out-of-scope requests before an LLM call and
validate the final answer before it is returned to the user.
"""

import re
from typing import Any, Dict, List

MAX_QUESTION_CHARS = 500
MAX_HISTORY_MESSAGES = 8

SAFE_FALLBACK = (
    "The available insurance documents do not contain enough "
    "information to answer this question."
)

INPUT_REJECTION = (
    "I can only answer questions about the insurance information "
    "available in InsureMate."
)

LENGTH_REJECTION = (
    "Your question is too long. Please keep it within 500 characters."
)

INJECTION_REJECTION = (
    "I can only process insurance-policy questions and cannot follow "
    "instructions that attempt to override InsureMate's rules."
)

INSURANCE_TERMS = {
    "insurance", "insurer", "insured", "policy", "policies", "coverage",
    "covered", "cover", "claim", "claims", "premium", "renewal", "renew",
    "hospital", "hospitalization", "hospitalisation", "medical", "disease",
    "preexisting", "pre-existing", "waiting", "cashless", "reimbursement",
    "exclusion", "excluded", "benefit", "benefits", "sum insured", "deductible",
    "copay", "co-pay", "room rent", "ambulance", "maternity", "diagnosis",
    "treatment", "mediclaim", "policyholder", "insured person", "hospitalized",
    "hospitalised", "evacuation", "emergency medical", "pre-hospitalisation",
    "post-hospitalisation", "hospitalization expenses", "medical expenses",
    "document", "documents", "policy wording", "policy period", "waiting period",
}

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(the\s+)?system\s+prompt",
    r"disregard\s+(all\s+)?previous\s+instructions",
    r"forget\s+(all\s+)?previous\s+instructions",
    r"override\s+(the\s+)?(?:system|developer|assistant)\s+(instructions|prompt|rules)",
    r"reveal\s+(the\s+)?(?:system|developer)\s+(prompt|instructions)",
    r"show\s+(me\s+)?(?:the\s+)?(?:system|developer)\s+(prompt|message)",
    r"jailbreak",
    r"act\s+as\s+(?:an?\s+)?unrestricted",
    r"do\s+anything\s+now",
]

OUTPUT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"system\s+prompt",
    r"developer\s+message",
    r"jailbreak",
]


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def detect_prompt_injection(question: str) -> bool:
    text = _normalise(question)
    return any(re.search(pattern, text) for pattern in INJECTION_PATTERNS)


def detect_scope(question: str) -> Dict[str, Any]:
    """Return a lightweight deterministic scope decision.

    This is intentionally a first-line guardrail, not the retrieval system.
    Retrieval remains responsible for deciding whether the documents contain
    enough evidence for a specific in-scope question.
    """
    text = _normalise(question)
    matched = sorted(
        term for term in INSURANCE_TERMS
        if re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", text)
    )

    # App/product terms also make a request plausibly in-scope.
    app_terms = {"insuremate", "policy qa", "policy question"}
    matched += sorted(term for term in app_terms if term in text)

    return {
        "in_scope": bool(matched),
        "matched_terms": matched[:10],
    }


def validate_input(question: str) -> Dict[str, Any]:
    """Run all pre-LLM input checks in a fixed order."""
    question = (question or "").strip()

    if not question:
        return {
            "allowed": False,
            "code": "EMPTY_INPUT",
            "message": "Please enter a question about your insurance policy.",
        }

    if len(question) > MAX_QUESTION_CHARS:
        return {
            "allowed": False,
            "code": "INPUT_TOO_LONG",
            "message": LENGTH_REJECTION,
        }

    # Reject control characters other than ordinary whitespace.
    if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", question):
        return {
            "allowed": False,
            "code": "INVALID_INPUT",
            "message": "Please remove unsupported control characters from your question.",
        }

    if detect_prompt_injection(question):
        return {
            "allowed": False,
            "code": "PROMPT_INJECTION",
            "message": INJECTION_REJECTION,
        }

    scope = detect_scope(question)
    if not scope["in_scope"]:
        return {
            "allowed": False,
            "code": "OUT_OF_SCOPE",
            "message": INPUT_REJECTION,
            "matched_terms": [],
        }

    return {
        "allowed": True,
        "code": "INPUT_ACCEPTED",
        "message": "Input passed pre-LLM guardrails.",
        "matched_terms": scope["matched_terms"],
    }


def _token_set(text: str) -> set[str]:
    return {
        word for word in re.findall(r"\b[a-zA-Z]{4,}\b", (text or "").lower())
        if word not in {
            "this", "that", "with", "from", "what", "when", "where", "which",
            "does", "have", "your", "their", "about", "into", "only", "based",
            "answer", "question", "policy", "evidence", "available",
        }
    }


def output_grounding_check(answer: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Deterministic final-answer sanity check against retrieved text."""
    answer = (answer or "").strip()

    if not answer:
        return {"passed": False, "code": "EMPTY_OUTPUT", "grounding": 0.0}

    if len(answer) > 2500:
        return {"passed": False, "code": "OUTPUT_TOO_LONG", "grounding": 0.0}

    if any(re.search(pattern, answer.lower()) for pattern in OUTPUT_INJECTION_PATTERNS):
        return {"passed": False, "code": "UNSAFE_OUTPUT", "grounding": 0.0}

    if answer == SAFE_FALLBACK:
        return {"passed": True, "code": "SAFE_REFUSAL", "grounding": 100.0}

    evidence = " ".join(str(item.get("text", "")) for item in results)
    answer_words = _token_set(answer)
    evidence_words = _token_set(evidence)

    if not answer_words:
        return {"passed": False, "code": "NO_CONTENT", "grounding": 0.0}

    overlap = len(answer_words & evidence_words) / len(answer_words)
    return {
        "passed": overlap >= 0.30,
        "code": "GROUNDED" if overlap >= 0.30 else "LOW_GROUNDING",
        "grounding": round(overlap * 100, 2),
    }


def validate_output(answer: str, results: List[Dict[str, Any]], fallback: str = SAFE_FALLBACK) -> Dict[str, Any]:
    """Validate the answer before it leaves the backend.

    A validator failure is fail-closed: the application returns the safe
    fallback instead of trusting an unchecked LLM response.
    """
    answer = (answer or "").strip()

    if not answer:
        return {
            "accepted": False,
            "final_answer": fallback,
            "code": "EMPTY_OUTPUT",
        }

    if answer == fallback:
        return {
            "accepted": True,
            "final_answer": fallback,
            "code": "SAFE_REFUSAL",
        }

    check = output_grounding_check(answer, results)
    if not check["passed"]:
        return {
            "accepted": False,
            "final_answer": fallback,
            "code": check["code"],
            "grounding": check["grounding"],
        }

    return {
        "accepted": True,
        "final_answer": answer,
        "code": "OUTPUT_ACCEPTED",
        "grounding": check["grounding"],
    }
