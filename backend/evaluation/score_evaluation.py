import json
import re
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent
RESULTS_FILE = BASE_DIR / "results" / "independent_evaluation.json"
OUTPUT_FILE = BASE_DIR / "results" / "evaluation_scores.json"

MODELS = [
    "codellama:7b-instruct",
    "qwen2.5:1.5b",
    "phi3:mini",
]

# =========================================================
# GROUND TRUTH
# =========================================================

GROUND_TRUTH = {

    "Q01": {
        "keywords": ["48"],
        "expected_behavior": "answer"
    },

    "Q02": {
        "keywords": ["24"],
        "expected_behavior": "answer"
    },

    "Q03": {
        "keywords": ["24", "not immediately"],
        "expected_behavior": "answer"
    },

    "Q04": {
        "keywords": ["24"],
        "expected_behavior": "answer"
    },

    "Q05": {
        "keywords": [],
        "expected_behavior": "contextual_answer"
    },

    "Q06": {
        "keywords": ["yes", "hospital"],
        "expected_behavior": "answer"
    },

    "Q07": {
        "keywords": ["pre-hospital", "post-hospital"],
        "expected_behavior": "answer"
    },

    "Q08": {
        "keywords": ["spondylosis", "spondylitis"],
        "expected_behavior": "contextual_answer"
    },

    "Q09": {
        "keywords": ["100"],
        "expected_behavior": "answer"
    },

    "Q10": {
        "keywords": ["24"],
        "expected_behavior": "answer"
    },

    "Q11": {
        "keywords": ["24"],
        "expected_behavior": "cross_document"
    },

    "Q12": {
        "keywords": [
            "group_health_insurance.pdf",
            "health_companion_insurance.pdf"
        ],
        "expected_behavior": "cross_document"
    },

    "Q13": {
        "keywords": [],
        "expected_behavior": "contextual_answer"
    },

    "Q14": {
        "keywords": ["yes", "medical"],
        "expected_behavior": "answer"
    },

    "Q15": {
        "keywords": ["accident", "death", "injury"],
        "expected_behavior": "answer"
    },

    "Q16": {
        "keywords": ["24"],
        "expected_behavior": "contextual_answer"
    },

    "Q17": {
        "keywords": [
            "claim",
            "documents",
            "hospital"
        ],
        "expected_behavior": "contextual_answer"
    },

    "Q18": {
        "keywords": [],
        "expected_behavior": "refuse_or_clarify"
    },

    "Q19": {
        "keywords": [],
        "expected_behavior": "refuse_or_clarify"
    },

    "Q20": {
        "keywords": [],
        "expected_behavior": "refuse_or_scope"
    },

    "Q21": {
        "keywords": [],
        "expected_behavior": "refuse_or_scope"
    },

    "Q22": {
        "keywords": [],
        "expected_behavior": "uncertain"
    },

    "Q23": {
        "keywords": ["limited", "sum insured"],
        "expected_behavior": "answer"
    },

    "Q24": {
        "keywords": ["lic", "jan suraksha"],
        "expected_behavior": "answer"
    },

    "Q25": {
        "keywords": ["accidentcare", "accident"],
        "expected_behavior": "answer"
    },
}


# =========================================================
# HELPERS
# =========================================================

def normalize(text):
    text = (text or "").lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def contains_keyword(answer, keyword):
    return normalize(keyword) in normalize(answer)


def refusal_signal(answer):
    text = normalize(answer)

    signals = [
        "not enough information",
        "cannot be determined",
        "cannot determine",
        "not mentioned",
        "does not contain enough",
        "unable to answer",
        "cannot answer",
        "not provided",
        "insufficient information",
    ]

    return any(signal in text for signal in signals)


def evaluate_correctness(question_id, answer):

    truth = GROUND_TRUTH.get(question_id)

    if not truth:
        return 0.0, "no_ground_truth"

    expected = truth["expected_behavior"]
    text = normalize(answer)

    # -----------------------------------------
    # Refusal / ambiguity questions
    # -----------------------------------------

    if expected in {
        "refuse_or_clarify",
        "refuse_or_scope"
    }:
        return (
            1.0 if refusal_signal(answer) else 0.0,
            "appropriate_refusal"
            if refusal_signal(answer)
            else "unsupported_answer"
        )

    # -----------------------------------------
    # Keyword based evaluation
    # -----------------------------------------

    keywords = truth["keywords"]

    if keywords:
        matches = sum(
            1 for k in keywords
            if contains_keyword(answer, k)
        )

        score = matches / len(keywords)

        if score == 1:
            return 1.0, "correct"

        if score >= 0.5:
            return score, "partially_correct"

        return 0.0, "incorrect"

    # -----------------------------------------
    # Contextual answer
    # -----------------------------------------

    if expected == "contextual_answer":
        if refusal_signal(answer):
            return 0.0, "insufficient_answer"

        if len(text) > 30:
            return 0.5, "manual_review_required"

        return 0.0, "weak_answer"

    # -----------------------------------------
    # Cross document
    # -----------------------------------------

    if expected == "cross_document":
        if len(text) > 40:
            return 0.5, "manual_review_required"

        return 0.0, "weak_answer"

    # -----------------------------------------
    # Uncertain / evidence based
    # -----------------------------------------

    if expected == "uncertain":
        if refusal_signal(answer):
            return 1.0, "appropriately_uncertain"

        return 0.0, "overclaim"

    return 0.0, "manual_review_required"


def evaluate_hallucination(question_id, answer):

    text = normalize(answer)

    # Strong hallucination indicators for questions
    # where the model should not invent information.

    if question_id in {"Q18", "Q19", "Q20", "Q21", "Q22"}:

        if refusal_signal(answer):
            return 0

        # Claims presented as definite answers are risky
        return 1

    if question_id == "Q23":

        if (
            "unlimited" in text
            and "no" not in text
            and "not" not in text
            and "limited" not in text
        ):
            return 1

        return 0

    return 0


# =========================================================
# LOAD RESULTS
# =========================================================

with open(RESULTS_FILE, encoding="utf-8") as f:
    data = json.load(f)

results = data["results"]

print("=" * 70)
print("INSUREMATE WEEK 4 - QUANTITATIVE EVALUATION")
print("=" * 70)

print(f"\nLoaded results: {len(results)}")


# =========================================================
# SCORE EACH RESULT
# =========================================================

scored_results = []

for result in results:

    qid = result["question_id"]
    model = result["model"]
    answer = result.get("answer", "")

    correctness, correctness_label = evaluate_correctness(
        qid,
        answer
    )

    hallucination = evaluate_hallucination(
        qid,
        answer
    )

    chunks = result.get(
        "retrieved_chunks",
        []
    )

    # =====================================================
    # RETRIEVAL METRICS
    # =====================================================

    # The independent evaluator stores similarity scores
    # inside retrieved_chunks[].score.
    retrieval_scores = [
        float(chunk.get("score", 0))
        for chunk in chunks
        if chunk.get("score") is not None
    ]

    if retrieval_scores:
        retrieval_confidence = (
            sum(retrieval_scores)
            / len(retrieval_scores)
        )
    else:
        retrieval_confidence = 0.0

    scored = dict(result)

    scored["correctness_score"] = correctness
    scored["correctness_label"] = correctness_label

    scored["hallucination"] = hallucination

    scored["retrieved_chunk_count"] = len(chunks)

    scored["retrieval_score"] = (
        retrieval_confidence
        if retrieval_confidence is not None
        else 0
    )

    scored_results.append(scored)


# =========================================================
# MODEL SUMMARY
# =========================================================

summary = {}

for model in MODELS:

    model_results = [
        r for r in scored_results
        if r["model"] == model
    ]

    total = len(model_results)

    if total == 0:
        continue

    accuracy = (
        sum(r["correctness_score"] for r in model_results)
        / total
        * 100
    )

    hallucination_rate = (
        sum(r["hallucination"] for r in model_results)
        / total
        * 100
    )

    avg_latency = (
        sum(
            r["latency_seconds"]
            for r in model_results
        )
        / total
    )

    avg_retrieval = (
        sum(
            r["retrieval_score"]
            for r in model_results
        )
        / total
    )

    summary[model] = {
        "evaluations": total,
        "accuracy_percent": round(accuracy, 2),
        "hallucination_rate_percent": round(
            hallucination_rate,
            2
        ),
        "average_latency_seconds": round(
            avg_latency,
            2
        ),
        "average_retrieval_confidence": round(
            avg_retrieval,
            4
        )
    }


# =========================================================
# PRINT SUMMARY
# =========================================================

print("\n" + "=" * 70)
print("MODEL COMPARISON")
print("=" * 70)

print(
    f"\n{'Model':<25}"
    f"{'Accuracy':>12}"
    f"{'Hallucination':>17}"
    f"{'Avg Latency':>15}"
    f"{'Retrieval':>14}"
)

print("-" * 85)

for model, stats in summary.items():

    print(
        f"{model:<25}"
        f"{stats['accuracy_percent']:>11.2f}%"
        f"{stats['hallucination_rate_percent']:>16.2f}%"
        f"{stats['average_latency_seconds']:>14.2f}s"
        f"{stats['average_retrieval_confidence']:>14.4f}"
    )


# =========================================================
# SAVE
# =========================================================

output = {
    "metadata": {
        "source": str(RESULTS_FILE),
        "total_results": len(scored_results),
        "models": MODELS,
        "evaluation_type": "independent_model_evaluation"
    },
    "model_summary": summary,
    "results": scored_results
}

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        indent=2,
        ensure_ascii=False
    )

print("\n" + "=" * 70)
print("SCORING COMPLETED")
print("=" * 70)

print("\nSaved to:")
print(OUTPUT_FILE)
