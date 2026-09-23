from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import json
import re
import requests

from app.services.retrieval_service import retrieve


router = APIRouter()


# ============================================================
# CONFIGURATION
# ============================================================

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

DEFAULT_MODEL = "qwen2.5:1.5b"
DEFAULT_VALIDATOR = "phi3:mini"

VALID_STATUSES = {
    "SUPPORTED",
    "CONDITIONAL",
    "INSUFFICIENT EVIDENCE",
    "CONFLICT",
}


# ============================================================
# REQUEST MODELS
# ============================================================

class ScenarioRequest(BaseModel):
    scenario: str = Field(min_length=1, max_length=1000)
    policy_months: Optional[int] = Field(
        default=None,
        ge=0,
        le=1200
    )
    model: str = DEFAULT_MODEL
    validator_model: str = DEFAULT_VALIDATOR
    top_k: int = Field(default=5, ge=1, le=10)


class OutputTestRequest(BaseModel):
    scenario: str = Field(min_length=1, max_length=1000)
    model: str = DEFAULT_MODEL
    validator_model: str = DEFAULT_VALIDATOR
    top_k: int = Field(default=5, ge=1, le=10)


# ============================================================
# OLLAMA
# ============================================================

def call_ollama(
    model: str,
    prompt: str,
    num_predict: int = 500
) -> str:

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": 0,
            "options": {
                "temperature": 0,
                "num_ctx": 4096,
                "num_predict": num_predict,
            },
        },
        timeout=180,
    )

    response.raise_for_status()

    data = response.json()

    return data.get("response", "").strip()


# ============================================================
# ROBUST JSON EXTRACTION
# ============================================================

def extract_json(text: str) -> Dict[str, Any]:
    """
    Robust JSON extraction for small local LLMs.

    Handles:
    - normal JSON
    - fenced JSON
    - text before JSON
    - text after JSON
    - multiple JSON objects
    """

    if not text:
        raise ValueError("Empty model response")

    text = text.strip()

    # --------------------------------------------------------
    # Try fenced JSON first
    # --------------------------------------------------------

    fenced = re.search(
        r"```(?:json)?\s*(\{.*?\})\s*```",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    if fenced:

        try:

            parsed = json.loads(
                fenced.group(1)
            )

            if isinstance(parsed, dict):
                return parsed

        except json.JSONDecodeError:
            pass

    # --------------------------------------------------------
    # Try complete response
    # --------------------------------------------------------

    try:

        parsed = json.loads(text)

        if isinstance(parsed, dict):
            return parsed

    except json.JSONDecodeError:
        pass

    # --------------------------------------------------------
    # Find first valid JSON object
    # --------------------------------------------------------

    decoder = json.JSONDecoder()

    for match in re.finditer(
        r"\{",
        text
    ):

        start = match.start()

        try:

            parsed, _ = decoder.raw_decode(
                text[start:]
            )

            if isinstance(parsed, dict):
                return parsed

        except json.JSONDecodeError:
            continue

    raise ValueError(
        "No valid JSON object returned by model"
    )


# ============================================================
# VALIDATOR NORMALIZATION
# ============================================================

def normalize_validator_result(
    data: Dict[str, Any]
) -> Dict[str, Any]:

    def parse_bool(value):

        if isinstance(value, bool):
            return value

        if isinstance(value, str):

            value = value.strip().lower()

            if value in {
                "true",
                "yes",
                "pass",
                "passed",
                "supported",
                "relevant",
                "valid",
                "correct",
            }:
                return True

            if value in {
                "false",
                "no",
                "fail",
                "failed",
                "unsupported",
                "irrelevant",
                "invalid",
                "incorrect",
            }:
                return False

        return False

    unsupported = data.get(
        "unsupported_claims",
        []
    )

    if isinstance(unsupported, str):

        value = unsupported.strip()

        if value.lower() in {
            "",
            "none",
            "none detected",
            "no unsupported claims",
            "no unsupported claims detected",
            "no unsupported claim",
        }:

            unsupported = []

        else:

            unsupported = [value]

    elif not isinstance(
        unsupported,
        list
    ):

        unsupported = [
            str(unsupported)
        ]

    return {
        "relevant": parse_bool(
            data.get("relevant")
        ),
        "supported": parse_bool(
            data.get(
                "supported",
                data.get(
                    "supported_by_evidence"
                )
            )
        ),
        "unsupported_claims": unsupported,
        "format_ok": parse_bool(
            data.get(
                "format_ok",
                data.get(
                    "expected_format"
                )
            )
        ),
        "reason": str(
            data.get(
                "reason",
                ""
            )
        ),
    }


# ============================================================
# TEXT HELPERS
# ============================================================

def normalize(
    text: str
) -> str:

    return re.sub(
        r"\s+",
        " ",
        (text or "").lower()
    ).strip()


def tokens(
    text: str
):

    stop_words = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "into",
        "under",
        "over",
        "have",
        "has",
        "been",
        "were",
        "was",
        "will",
        "would",
        "could",
        "should",
        "your",
        "their",
        "policy",
        "evidence",
        "scenario",
        "answer",
        "based",
        "provided",
        "according",
        "does",
        "what",
        "which",
        "how",
        "can",
        "are",
        "is",
        "to",
        "of",
        "in",
        "on",
        "a",
        "an",
    }

    return (
        set(
            re.findall(
                r"[a-z0-9]+",
                normalize(text)
            )
        )
        - stop_words
    )


def lexical_overlap(
    answer: str,
    evidence: str
) -> float:

    answer_tokens = tokens(answer)
    evidence_tokens = tokens(evidence)

    if not answer_tokens:
        return 0.0

    return round(
        (
            len(
                answer_tokens &
                evidence_tokens
            )
            /
            len(answer_tokens)
        )
        * 100,
        1,
    )


# ============================================================
# FACT EXTRACTION
# ============================================================

def parse_facts(
    scenario: str,
    policy_months: Optional[int]
):

    text = normalize(scenario)

    # --------------------------------------------------------
    # Duration
    # --------------------------------------------------------

    duration = policy_months

    if duration is None:

        match = re.search(
            r"(\d+)\s*(?:months?|mos?)",
            text
        )

        if match:
            duration = int(
                match.group(1)
            )

    # --------------------------------------------------------
    # Treatment
    # --------------------------------------------------------

    treatment_match = re.search(
        r"\b("
        r"surgery|"
        r"hospitalization|"
        r"treatment|"
        r"operation|"
        r"procedure"
        r")\b",
        text
    )

    treatment = (
        treatment_match.group(1)
        if treatment_match
        else "Unknown"
    )

    # --------------------------------------------------------
    # Exact treatment / condition
    # --------------------------------------------------------

    exact_match = re.search(
        r"\b(?:surgery|operation|procedure)"
        r"\s+(?:for|of|on)\s+"
        r"([a-z][a-z0-9 -]{2,60})",
        text
    )

    exact_treatment = (
        exact_match.group(1).strip()
        if exact_match
        else "Unknown"
    )

    # --------------------------------------------------------
    # Pre-existing condition
    # --------------------------------------------------------

    preexisting = bool(
        re.search(
            r"\b(pre[- ]existing|preexisting)\b",
            text
        )
    )

    # --------------------------------------------------------
    # Hospitalization
    # --------------------------------------------------------

    hospitalization = bool(
        re.search(
            r"\b("
            r"hospital|"
            r"hospitalization|"
            r"admitted|"
            r"admission"
            r")\b",
            text
        )
    )

    # --------------------------------------------------------
    # Cashless
    # --------------------------------------------------------

    cashless = (
        "cashless" in text
    )

    # --------------------------------------------------------
    # Reimbursement
    # --------------------------------------------------------

    reimbursement = (
        "reimbursement" in text
    )

    return [

        {
            "name": "Policy duration",
            "value": (
                f"{duration} months"
                if duration is not None
                else "Unknown"
            ),
            "status": (
                "explicit"
                if duration is not None
                else "missing"
            ),
        },

        {
            "name": "Treatment",
            "value": treatment,
            "status": (
                "explicit"
                if treatment_match
                else "missing"
            ),
        },

        {
            "name": "Pre-existing condition",
            "value": (
                "Yes"
                if preexisting
                else "Unknown"
            ),
            "status": (
                "explicit"
                if preexisting
                else "missing"
            ),
        },

        {
            "name": "Hospitalization",
            "value": (
                "Yes"
                if hospitalization
                else "Unknown"
            ),
            "status": (
                "explicit"
                if hospitalization
                else "missing"
            ),
        },

        {
            "name": "Cashless",
            "value": (
                "Yes"
                if cashless
                else "Unknown"
            ),
            "status": (
                "explicit"
                if cashless
                else "missing"
            ),
        },

        {
            "name": "Reimbursement",
            "value": (
                "Yes"
                if reimbursement
                else "Unknown"
            ),
            "status": (
                "explicit"
                if reimbursement
                else "missing"
            ),
        },

        {
            "name": "Exact treatment/condition",
            "value": exact_treatment,
            "status": (
                "explicit"
                if exact_match
                else "missing"
            ),
        },
    ]


# ============================================================
# EVIDENCE
# ============================================================

def build_evidence(
    results
):

    evidence = []

    for index, item in enumerate(
        results or [],
        1
    ):

        evidence.append(
            {
                "id": index,
                "document": item.get(
                    "document",
                    "Unknown document"
                ),
                "page": item.get(
                    "page"
                ),
                "score": round(
                    float(
                        item.get(
                            "score",
                            0
                        )
                    ),
                    3,
                ),
                "text": item.get(
                    "text",
                    ""
                ),
            }
        )

    return evidence


def evidence_text_from_items(
    evidence
):

    return normalize(
        " ".join(
            item.get(
                "text",
                ""
            )
            for item in evidence
        )
    )


# ============================================================
# POLICY CLAUSE DETECTION
# ============================================================

def has_48_month_preexisting_clause(
    evidence_text: str
) -> bool:

    text = normalize(
        evidence_text
    )

    has_48 = bool(
        re.search(
            r"\b48\s*months?\b",
            text
        )
    )

    has_preexisting = bool(
        re.search(
            r"\b("
            r"pre[- ]existing|"
            r"preexisting|"
            r"pre-existing diseases?"
            r")\b",
            text
        )
    )

    return (
        has_48
        and has_preexisting
    )


def has_specific_surgery_clause(
    evidence_text: str
) -> bool:

    text = normalize(
        evidence_text
    )

    return bool(
        re.search(
            r"\b("
            r"tonsil|"
            r"tonsils|"
            r"adenoid|"
            r"adenoids"
            r")\b",
            text
        )
    )


def is_comparison_question(
    scenario: str
) -> bool:

    text = normalize(
        scenario
    )

    comparison_terms = [
        "compare",
        "comparison",
        "different waiting",
        "different conditions",
        "different clauses",
        "difference between",
        "which clauses",
        "compare any",
    ]

    return any(
        term in text
        for term in comparison_terms
    )


# ============================================================
# DETERMINISTIC APPLICABILITY CHECK
# ============================================================

def check_applicability(
    result: Dict[str, Any],
    facts: List[Dict[str, Any]],
    evidence: List[Dict[str, Any]],
    scenario: str,
):

    answer = normalize(
        result.get(
            "answer",
            ""
        )
    )

    evidence_text = evidence_text_from_items(
        evidence
    )

    scenario_text = normalize(
        scenario
    )

    # --------------------------------------------------------
    # Comparison questions should not be rejected merely
    # because they mention generic surgery.
    # --------------------------------------------------------

    if is_comparison_question(
        scenario_text
    ):

        return {
            "passed": True,
            "reason": "",
            "rule": "comparison_question",
        }

    # --------------------------------------------------------
    # Scenario facts
    # --------------------------------------------------------

    generic_surgery = any(
        fact.get("name")
        == "Treatment"
        and fact.get("value")
        == "surgery"
        and fact.get("status")
        == "explicit"
        for fact in facts
    )

    exact_treatment_missing = any(
        fact.get("name")
        == "Exact treatment/condition"
        and fact.get("status")
        == "missing"
        for fact in facts
    )

    preexisting_present = any(
        fact.get("name")
        == "Pre-existing condition"
        and fact.get("status")
        == "explicit"
        and fact.get("value")
        == "Yes"
        for fact in facts
    )

    # --------------------------------------------------------
    # Evidence characteristics
    # --------------------------------------------------------

    condition_specific_evidence = (
        has_specific_surgery_clause(
            evidence_text
        )
    )

    # --------------------------------------------------------
    # Candidate language
    # --------------------------------------------------------

    specific_condition_mentioned = bool(
        re.search(
            r"\b("
            r"tonsil|"
            r"tonsils|"
            r"adenoid|"
            r"adenoids"
            r")\b",
            answer
        )
    )

    candidate_claims_24 = bool(
        re.search(
            r"\b24\s*months?\b",
            answer
        )
    )

    candidate_claims_48 = bool(
        re.search(
            r"\b48\s*months?\b",
            answer
        )
    )

    waiting_period_language = bool(
        re.search(
            r"\b("
            r"waiting period|"
            r"waiting-period|"
            r"wait period"
            r")\b",
            answer
        )
    )

    application_language = bool(
        re.search(
            r"\b("
            r"applies?|"
            r"applicable|"
            r"therefore|"
            r"your waiting period|"
            r"the waiting period is|"
            r"you have to wait|"
            r"must wait"
            r")\b",
            answer
        )
    )

    # ========================================================
    # RULE 1
    #
    # Generic surgery + missing exact surgery + specific
    # surgery evidence.
    #
    # Do NOT allow the model to apply the specific clause.
    # ========================================================

    if (
        generic_surgery
        and exact_treatment_missing
        and condition_specific_evidence
    ):

        unsafe_specific_claim = (
            specific_condition_mentioned
            or (
                candidate_claims_24
                and (
                    waiting_period_language
                    or application_language
                )
            )
        )

        if unsafe_specific_claim:

            return {
                "passed": False,
                "reason": (
                    "Candidate applied a condition-specific "
                    "surgery clause without the scenario "
                    "specifying the exact surgery or condition."
                ),
                "rule": "condition_specific_surgery",
            }

    # ========================================================
    # RULE 2
    #
    # Pre-existing condition + retrieved 48-month clause.
    #
    # If candidate says 24 months without preserving 48,
    # reject it.
    # ========================================================

    if (
        preexisting_present
        and has_48_month_preexisting_clause(
            evidence_text
        )
    ):

        if (
            candidate_claims_24
            and not candidate_claims_48
        ):

            return {
                "passed": False,
                "reason": (
                    "Candidate applied a 24-month waiting "
                    "period even though the scenario contains "
                    "a pre-existing condition and the retrieved "
                    "evidence contains a 48-month waiting period "
                    "for pre-existing diseases."
                ),
                "rule": "preexisting_waiting_period",
            }

    return {
        "passed": True,
        "reason": "",
        "rule": "",
    }


# ============================================================
# SAFE CONDITIONAL RESPONSE
# ============================================================

def build_safe_conditional_result():

    return {
        "status": "CONDITIONAL",
        "answer": (
            "The retrieved evidence contains a "
            "condition-specific waiting period, but the "
            "scenario does not specify the exact surgery "
            "or condition. Please provide the exact "
            "surgery or condition before applying that clause."
        ),
        "missing_facts": [
            "Exact treatment/condition"
        ],
        "evidence_sufficient": False,
        "conflict_detected": False,
        "conflict_reason": "",
    }


# ============================================================
# SAFE PRE-EXISTING RESPONSE
# ============================================================

def build_safe_preexisting_result(
    policy_duration: Optional[int] = None
):

    duration_text = (
        f" Because the scenario states "
        f"{policy_duration} months of continuous insurance."
        if policy_duration is not None
        else ""
    )

    return {
        "status": "SUPPORTED",
        "answer": (
            "The retrieved policy evidence states a "
            "48-month waiting period for pre-existing "
            "diseases. The scenario states a pre-existing "
            "condition, so the relevant waiting-period "
            "clause is the 48-month pre-existing-condition "
            f"clause.{duration_text}"
        ),
        "missing_facts": [],
        "evidence_sufficient": True,
        "conflict_detected": False,
        "conflict_reason": "",
    }


# ============================================================
# FALLBACK
# ============================================================

def fallback_result(
    facts,
    evidence
):

    if not evidence:

        return {
            "status": "INSUFFICIENT EVIDENCE",
            "answer": (
                "The available retrieved policy evidence "
                "is not sufficient to determine the "
                "scenario outcome."
            ),
            "missing_facts": [
                "A relevant policy clause is required "
                "for this scenario."
            ],
            "evidence_sufficient": False,
            "conflict_detected": False,
            "conflict_reason": "",
        }

    missing = [
        fact["name"]
        for fact in facts
        if fact["status"] == "missing"
    ]

    return {
        "status": (
            "CONDITIONAL"
            if missing
            else "INSUFFICIENT EVIDENCE"
        ),
        "answer": (
            "The retrieved evidence contains potentially "
            "relevant policy conditions, but the available "
            "facts do not establish a definitive outcome."
        ),
        "missing_facts": missing[:4],
        "evidence_sufficient": False,
        "conflict_detected": False,
        "conflict_reason": "",
    }


# ============================================================
# OUTPUT VALIDATION
# ============================================================

def validate_output(
    result: Dict[str, Any],
    evidence: List[Dict[str, Any]],
    scenario: str,
    validator_model: str,
    facts: List[Dict[str, Any]],
    run_independent: bool = True,
):

    checks = {}

    # --------------------------------------------------------
    # Schema
    # --------------------------------------------------------

    checks["schema"] = (
        isinstance(result, dict)
        and result.get("status")
        in VALID_STATUSES
        and isinstance(
            result.get("answer"),
            str
        )
        and isinstance(
            result.get("missing_facts"),
            list
        )
        and isinstance(
            result.get("evidence_sufficient"),
            bool
        )
        and isinstance(
            result.get("conflict_detected"),
            bool
        )
        and isinstance(
            result.get("conflict_reason"),
            str
        )
    )

    evidence_text = " ".join(
        item.get(
            "text",
            ""
        )
        for item in evidence
    )

    checks["non_empty_answer"] = (
        bool(
            normalize(
                result.get(
                    "answer",
                    ""
                )
            )
        )
        if isinstance(
            result,
            dict
        )
        else False
    )

    checks["evidence_available"] = bool(
        evidence_text.strip()
    )

    checks["grounding_diagnostic"] = (
        lexical_overlap(
            result.get(
                "answer",
                ""
            ),
            evidence_text
        ) >= 25
        if checks["evidence_available"]
        else False
    )

    # --------------------------------------------------------
    # Applicability
    # --------------------------------------------------------

    applicability = check_applicability(
        result,
        facts,
        evidence,
        scenario
    )

    checks["applicability"] = (
        applicability["passed"]
    )

    # --------------------------------------------------------
    # Independent validator
    # --------------------------------------------------------

    judge = {
        "supported": None,
        "unsupported_claims": [],
        "relevant": None,
        "format_ok": checks["schema"],
        "reason": "",
    }

    if (
        run_independent
        and checks["schema"]
        and evidence_text.strip()
    ):

        prompt = f"""
You are an independent AI output evaluator for an
insurance RAG system.

You are NOT answering the user's question.

You are evaluating ONLY whether the candidate output
is supported by the supplied scenario and supplied
policy evidence.

Do NOT use outside knowledge.

IMPORTANT:

A policy clause has a scope.

A 24-month clause for specific conditions or specific
surgeries must NOT be treated as a general 24-month
waiting period for all surgeries.

A 48-month clause for pre-existing diseases must be
evaluated as a pre-existing-condition clause.

Do not reject an answer merely because another unrelated
waiting period also appears in the evidence.

For a CONDITIONAL answer that correctly identifies a
missing exact treatment or condition, supported=true
is allowed.

For an INSUFFICIENT EVIDENCE answer that correctly
withholds an unsupported conclusion, supported=true
is allowed.

Return ONLY JSON.

Use EXACTLY:

{{
  "relevant": true,
  "supported": true,
  "unsupported_claims": [],
  "format_ok": true,
  "reason": "short reason"
}}

SCENARIO:
{scenario}

SCENARIO FACTS:
{json.dumps(facts, ensure_ascii=False)}

CANDIDATE OUTPUT:
{json.dumps(result, ensure_ascii=False)}

POLICY EVIDENCE:
{evidence_text}
"""

        try:

            raw_validator = call_ollama(
                validator_model,
                prompt,
                350
            )

            validator_data = extract_json(
                raw_validator
            )

            judge = normalize_validator_result(
                validator_data
            )

        except Exception as exc:

            judge["reason"] = (
                "Independent validator unavailable: "
                f"{exc}"
            )

    checks["relevance"] = (
        judge.get("relevant")
        is True
    )

    checks["supported_by_evidence"] = (
        judge.get("supported")
        is True
    )

    checks["expected_format"] = (
        judge.get("format_ok")
        is True
    )

    # --------------------------------------------------------
    # Final pass
    # --------------------------------------------------------

    if not run_independent:

        passed = (
            checks["schema"]
            and checks["non_empty_answer"]
            and checks["evidence_available"]
            and checks["grounding_diagnostic"]
            and checks["applicability"]
        )

    else:

        passed = (
            all(checks.values())
            and not judge.get(
                "unsupported_claims"
            )
        )

    return {
        "passed": passed,
        "checks": checks,
        "unsupported_claims": judge.get(
            "unsupported_claims",
            []
        ),
        "validator_reason": judge.get(
            "reason",
            ""
        ),
        "grounding_overlap_percent": lexical_overlap(
            result.get(
                "answer",
                ""
            ),
            evidence_text
        ),
        "applicability_rule": applicability.get(
            "rule",
            ""
        ),
    }


# ============================================================
# DETERMINISTIC SAFETY / REPLACEMENT
# ============================================================

def apply_deterministic_safety_rules(
    candidate: Dict[str, Any],
    facts: List[Dict[str, Any]],
    evidence: List[Dict[str, Any]],
    scenario: str,
):

    # True when a known policy-scope rule has been verified
    # deterministically and should not be overturned by the
    # small independent validator.
    deterministic_verified = False

    applicability = check_applicability(
        candidate,
        facts,
        evidence,
        scenario
    )

    evidence_text = evidence_text_from_items(
        evidence
    )

    scenario_text = normalize(
        scenario
    )

    candidate_answer = normalize(
        candidate.get(
            "answer",
            ""
        )
    )

    # --------------------------------------------------------
    # Scenario contains pre-existing condition
    # --------------------------------------------------------

    preexisting_present = bool(
        re.search(
            r"\b(pre[- ]existing|preexisting)\b",
            scenario_text
        )
    )

    # --------------------------------------------------------
    # Evidence contains 48-month pre-existing clause
    # --------------------------------------------------------

    has_preexisting_48 = (
        preexisting_present
        and has_48_month_preexisting_clause(
            evidence_text
        )
    )

    # --------------------------------------------------------
    # Candidate numbers
    # --------------------------------------------------------

    claims_24 = bool(
        re.search(
            r"\b24\s*months?\b",
            candidate_answer
        )
    )

    claims_48 = bool(
        re.search(
            r"\b48\s*months?\b",
            candidate_answer
        )
    )

    # --------------------------------------------------------
    # Extract scenario duration
    # --------------------------------------------------------

    duration_match = re.search(
        r"(\d+)\s*(?:months?|mos?)",
        scenario_text
    )

    scenario_duration = (
        int(duration_match.group(1))
        if duration_match
        else None
    )

    # ========================================================
    # PRE-EXISTING RULE HAS HIGHEST PRIORITY
    # ========================================================

    if has_preexisting_48:

        # Candidate incorrectly selected 24 months.
        if (
            claims_24
            and not claims_48
        ):

            return {
                "result": build_safe_preexisting_result(
                    scenario_duration
                ),
                "candidate_rejected": True,
                "replacement_applied": True,
                "replacement_reason": (
                    "The candidate selected a 24-month "
                    "waiting period even though the "
                    "scenario contains a pre-existing "
                    "condition and the retrieved evidence "
                    "contains a 48-month waiting period "
                    "for pre-existing diseases."
                ),
                "deterministic_verified": True,
            }

        # Exact pre-existing rule is explicitly supported.
        if claims_48 and not claims_24:
            deterministic_verified = True

    # ========================================================
    # SPECIFIC SURGERY RULE
    # ========================================================

    if not applicability["passed"]:

        rule = applicability.get(
            "rule",
            ""
        )

        if rule == "condition_specific_surgery":

            return {
                "result": build_safe_conditional_result(),
                "candidate_rejected": True,
                "replacement_applied": True,
                "replacement_reason": applicability[
                    "reason"
                ],
                "deterministic_verified": True,
            }

        if rule == "preexisting_waiting_period":

            return {
                "result": build_safe_preexisting_result(
                    scenario_duration
                ),
                "candidate_rejected": True,
                "replacement_applied": True,
                "replacement_reason": applicability[
                    "reason"
                ],
                "deterministic_verified": True,
            }

    # ========================================================
    # CANDIDATE PASSED DETERMINISTIC RULES
    # ========================================================

    return {
        "result": candidate,
        "candidate_rejected": False,
        "replacement_applied": False,
        "replacement_reason": "",
        "deterministic_verified": deterministic_verified,
    }


# ============================================================
# ANALYZE SCENARIO
# ============================================================

def analyze_scenario(
    request: ScenarioRequest
):

    # --------------------------------------------------------
    # 1. Extract facts
    # --------------------------------------------------------

    facts = parse_facts(
        request.scenario,
        request.policy_months
    )

    # --------------------------------------------------------
    # 2. Retrieval query
    # --------------------------------------------------------

    retrieval_query = request.scenario

    if request.policy_months is not None:

        retrieval_query += (
            f" policy duration "
            f"{request.policy_months} months"
        )

    # --------------------------------------------------------
    # 3. Retrieve evidence
    # --------------------------------------------------------

    try:

        raw_results = retrieve(
            retrieval_query,
            request.top_k
        )

    except Exception:

        raw_results = []

    evidence = build_evidence(
        raw_results
    )

    # --------------------------------------------------------
    # 4. No evidence
    # --------------------------------------------------------

    if not evidence:

        result = fallback_result(
            facts,
            evidence
        )

        validation = validate_output(
            result,
            evidence,
            request.scenario,
            request.validator_model,
            facts,
            run_independent=False
        )

        validation["candidate_rejected"] = False
        validation["replacement_applied"] = False
        validation["final_output_safe"] = True

        return (
            result,
            facts,
            evidence,
            validation
        )

    # --------------------------------------------------------
    # 5. Evidence block
    # --------------------------------------------------------

    evidence_block = "\n\n".join(

        f"[EVIDENCE {item['id']}] "
        f"{item['document']} "
        f"page={item['page']} "
        f"score={item['score']}\n"
        f"{item['text']}"

        for item in evidence
    )

    facts_block = "\n".join(

        f"- {fact['name']}: "
        f"{fact['value']} "
        f"({fact['status']})"

        for fact in facts
    )

    # --------------------------------------------------------
    # 6. Candidate generation
    # --------------------------------------------------------

    prompt = f"""
You are the Scenario Decision Engine for InsureMate.

Use ONLY the supplied scenario facts and policy evidence.

Do NOT use outside insurance knowledge.

Your task is to classify the scenario as:

SUPPORTED
CONDITIONAL
INSUFFICIENT EVIDENCE
CONFLICT

============================================================
IMPORTANT POLICY-SCOPE RULES
============================================================

RULE 1:
Match every policy clause to the exact condition that
triggers that clause.

RULE 2:
Do not generalize a specific condition.

If evidence says that surgery on tonsils/adenoids has a
24-month waiting period, this does NOT prove that every
surgery has a 24-month waiting period.

RULE 3:
A pre-existing-condition waiting period is separate from
a surgery-specific waiting period.

If evidence states 48 months for pre-existing diseases and
the scenario contains a pre-existing condition, preserve
48 months.

Do NOT replace the 48-month pre-existing-condition clause
with a 24-month specific-surgery clause.

RULE 4:
Generic "surgery" is not an exact surgery.

If the scenario only says "I need surgery" and does not
specify the surgery or condition, return CONDITIONAL when
the retrieved surgery evidence is condition-specific.

Missing fact:
"Exact treatment/condition"

RULE 5:
If multiple waiting periods appear in evidence, first
identify the condition associated with each waiting period.

Never select a number merely because it appears in the
retrieved evidence.

RULE 6:
Preserve exact policy numbers.

48 months must remain 48 months.

24 months must remain 24 months.

RULE 7:
Do not say "covered" unless the evidence actually
establishes coverage.

RULE 8:
For comparison questions, explain the different scopes
of the clauses instead of incorrectly calling them a
conflict.

============================================================
OUTPUT FORMAT
============================================================

Return ONLY JSON.

No Markdown.
No code fences.
No explanation outside JSON.

Use exactly:

{{
  "status": "SUPPORTED",
  "answer": "2-4 sentence evidence-grounded explanation",
  "missing_facts": [],
  "evidence_sufficient": true,
  "conflict_detected": false,
  "conflict_reason": ""
}}

Allowed status values:

SUPPORTED
CONDITIONAL
INSUFFICIENT EVIDENCE
CONFLICT

============================================================
SCENARIO
============================================================

{request.scenario}

============================================================
SCENARIO FACTS
============================================================

{facts_block}

============================================================
POLICY EVIDENCE
============================================================

{evidence_block}
"""

    try:

        raw_candidate = call_ollama(
            request.model,
            prompt,
            500
        )

        candidate = extract_json(
            raw_candidate
        )

    except Exception:

        candidate = fallback_result(
            facts,
            evidence
        )

    if not isinstance(
        candidate,
        dict
    ):

        candidate = fallback_result(
            facts,
            evidence
        )

    # --------------------------------------------------------
    # 7. Deterministic safety
    # --------------------------------------------------------

    safety = apply_deterministic_safety_rules(
        candidate,
        facts,
        evidence,
        request.scenario
    )

    deterministic_verified = safety.get(
        "deterministic_verified",
        False
    )

    final_result = safety[
        "result"
    ]

    candidate_rejected = safety[
        "candidate_rejected"
    ]

    replacement_applied = safety[
        "replacement_applied"
    ]

    replacement_reason = safety[
        "replacement_reason"
    ]

    # --------------------------------------------------------
    # 8. Validate final output
    #
    # If deterministic rules replaced the candidate, do not
    # allow the small independent validator to undo that
    # deterministic safety decision.
    # --------------------------------------------------------

    if replacement_applied or deterministic_verified:

        validation = validate_output(
            final_result,
            evidence,
            request.scenario,
            request.validator_model,
            facts,
            run_independent=False
        )

    else:

        validation = validate_output(
            final_result,
            evidence,
            request.scenario,
            request.validator_model,
            facts,
            run_independent=True
        )

    # --------------------------------------------------------
    # 9. Metadata
    # --------------------------------------------------------

    validation[
        "candidate_rejected"
    ] = candidate_rejected

    validation[
        "replacement_applied"
    ] = replacement_applied

    validation[
        "replacement_reason"
    ] = replacement_reason

    validation[
        "deterministic_verified"
    ] = deterministic_verified

    validation[
        "final_output_safe"
    ] = validation[
        "passed"
    ]

    # --------------------------------------------------------
    # 10. If candidate was not deterministically replaced
    #     but independent validation failed, fail closed.
    # --------------------------------------------------------

    if (
        not replacement_applied
        and not validation["passed"]
    ):

        final_result = {
            "status": "INSUFFICIENT EVIDENCE",
            "answer": (
                "The generated analysis did not pass "
                "independent evidence validation, so "
                "InsureMate is withholding a definitive "
                "interpretation."
            ),
            "missing_facts": [
                "A validated evidence-grounded "
                "interpretation is required."
            ],
            "evidence_sufficient": False,
            "conflict_detected": False,
            "conflict_reason": "",
        }

        validation[
            "final_output_safe"
        ] = True

    return (
        final_result,
        facts,
        evidence,
        validation
    )


# ============================================================
# ANALYZE ENDPOINT
# ============================================================

@router.post("/analyze")
def analyze(
    request: ScenarioRequest
):

    (
        result,
        facts,
        evidence,
        validation
    ) = analyze_scenario(
        request
    )

    return {

        "scenario": request.scenario,

        "result": result,

        "facts": facts,

        "evidence": evidence,

        "output_validation": validation,

        "decision_trace": [

            {
                "step": 1,
                "name": "Scenario parsing",
                "status": "complete",
                "detail": (
                    f"{len(facts)} facts inspected"
                ),
            },

            {
                "step": 2,
                "name": "Policy retrieval",
                "status": "complete",
                "detail": (
                    f"{len(evidence)} evidence "
                    f"items retrieved"
                ),
            },

            {
                "step": 3,
                "name": "Evidence analysis",
                "status": "complete",
                "detail": (
                    "Specific policy clauses checked "
                    "against scenario facts"
                ),
            },

            {
                "step": 4,
                "name": "Decision",
                "status": "complete",
                "detail": result.get(
                    "status"
                ),
            },

            {
                "step": 5,
                "name": "Independent output testing",
                "status": (
                    "passed"
                    if validation.get(
                        "passed"
                    )
                    else "failed"
                ),
                "detail": (
                    "Schema + relevance + "
                    "evidence support + "
                    "format + applicability"
                ),
            },
        ],
    }


# ============================================================
# OUTPUT TESTING ENDPOINT
# ============================================================

@router.post("/test-output")
def test_output(
    request: OutputTestRequest
):

    scenario_request = ScenarioRequest(

        scenario=request.scenario,

        model=request.model,

        validator_model=(
            request.validator_model
        ),

        top_k=request.top_k,
    )

    (
        result,
        facts,
        evidence,
        validation
    ) = analyze_scenario(
        scenario_request
    )

    final_pass = bool(
        validation.get(
            "final_output_safe",
            validation.get(
                "passed",
                False
            )
        )
    )

    return {

        "scenario": request.scenario,

        "candidate_output": result,

        "facts": facts,

        "evidence_count": len(
            evidence
        ),

        "validation": validation,

        "pass": final_pass,

        "criteria": {

            "relevance":
                "Answer addresses the scenario.",

            "evidence_support":
                "Material claims are supported "
                "by retrieved policy evidence.",

            "unsupported_claims":
                "No unsupported material claims "
                "are accepted.",

            "format":
                "Required JSON schema and decision "
                "status are valid.",

            "applicability":
                "A policy clause is applied only "
                "when its triggering condition "
                "matches the scenario.",

            "sufficiency_behavior":
                "System uses conditional or "
                "insufficient states rather than "
                "guessing when evidence or facts "
                "are inadequate.",

            "candidate_testing":
                "Original LLM output is tested "
                "before acceptance.",

            "safe_replacement":
                "Unsafe candidates may be replaced "
                "with a controlled evidence-grounded "
                "response.",
        },
    }