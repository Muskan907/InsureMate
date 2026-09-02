import json
import re
from pathlib import Path


# =========================================================
# CONFIG
# =========================================================

BASE_DIR = Path(__file__).parent

INPUT_FILE = (
    BASE_DIR
    / "results"
    / "rag_controlled_10q.json"
)

OUTPUT_FILE = (
    BASE_DIR
    / "results"
    / "rag_vs_norag_scored.json"
)


# =========================================================
# GROUND TRUTH
# =========================================================
#
# Each question has facts that a correct answer should contain.
#
# We deliberately score the actual policy questions rather
# than automatically sending uncertain questions to manual review.
#

GROUND_TRUTH = {

    "Q01": {
        "required": ["48 months", "pre-existing"],
        "description": "Pre-existing diseases have a 48-month waiting period."
    },

    "Q02": {
        "must_refuse_specific": True,
        "description": (
            "The provided policy context does not specify a "
            "cataract-specific waiting period."
        )
    },

    "Q03": {
        "required": ["24 months", "biliary"],
        "description": (
            "Biliary stones have a 24-month waiting period and "
            "are not covered immediately."
        )
    },

    "Q04": {
        "required": ["24 months", "urinary"],
        "description": "Urinary-system stones have a 24-month waiting period."
    },

    "Q05": {
        "required_any": [
            ["hospitalization"],
            ["inpatient"],
        ],
        "positive_answer": True,
        "description": "Hospitalization/inpatient expenses are covered."
    },

    "Q06": {
        "required": [
            "pre-hospitalization",
            "post-hospitalization",
        ],
        "description": (
            "The policy provides pre/post-hospitalization coverage "
            "subject to policy conditions."
        )
    },

    "Q07": {
        "required_any": [
            ["spondylosis"],
            ["spondylitis"],
        ],
        "negative_or_exclusion": True,
        "description": (
            "Spondylosis/spondylitis are subject to the policy's "
            "exclusion/waiting provisions."
        )
    },

    "Q08": {
        "required_any": [
            ["100%"],
            ["sum insured"],
            ["eligible expenses"],
        ],
        "description": (
            "The answer must distinguish percentage-based benefits "
            "from general eligible-expense coverage."
        )
    },

    "Q09": {
        "required_any": [
            ["accident"],
            ["injury"],
            ["sum assured"],
            ["accidental bodily injury"],
        ],
        "description": (
            "The answer should describe actual accident-policy benefits, "
            "rather than generic insurance benefits."
        )
    },

    "Q10": {
        "required_any": [
            ["medical expenses"],
            ["medical evacuation"],
            ["emergency medical"],
        ],
        "positive_answer": True,
        "description": (
            "Travel insurance includes medical-emergency coverage "
            "during a trip, subject to policy conditions."
        )
    },
}


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize(text):
    text = text.lower()

    # Make different spellings easier to compare.
    text = text.replace("pre hospitalisation", "pre-hospitalization")
    text = text.replace("post hospitalisation", "post-hospitalization")
    text = text.replace("pre-hospitalisation", "pre-hospitalization")
    text = text.replace("post-hospitalisation", "post-hospitalization")

    return text


# =========================================================
# REFUSAL / UNKNOWN DETECTION
# =========================================================

def contains_unknown_language(text):
    text = normalize(text)

    phrases = [
        "not specified",
        "not mentioned",
        "not available",
        "cannot be determined",
        "cannot determine",
        "do not contain",
        "does not contain",
        "not provided",
        "not found",
        "insufficient information",
        "not enough information",
    ]

    return any(
        phrase in text
        for phrase in phrases
    )


# =========================================================
# POSITIVE / NEGATIVE DETECTION
# =========================================================

def contains_positive(text):
    text = normalize(text)

    phrases = [
        "yes",
        "covered",
        "will cover",
        "provides coverage",
        "coverage applies",
        "included",
    ]

    return any(
        phrase in text
        for phrase in phrases
    )


def contains_negative(text):
    text = normalize(text)

    phrases = [
        "not covered",
        "excluded",
        "exclusion",
        "not immediately",
        "cannot be determined",
        "not specified",
        "not mentioned",
    ]

    return any(
        phrase in text
        for phrase in phrases
    )


# =========================================================
# QUESTION SCORING
# =========================================================

def score_answer(question_id, answer):

    text = normalize(answer)

    truth = GROUND_TRUTH[question_id]

    # -----------------------------------------------------
    # Q02
    # -----------------------------------------------------
    #
    # Correct behavior is to NOT invent a cataract waiting
    # period because the supplied policy context does not
    # specify one.
    #
    if truth.get("must_refuse_specific"):

        if contains_unknown_language(text):

            return {
                "classification": "correct",
                "reason": (
                    "Correctly states that the provided "
                    "policy documents do not specify a "
                    "cataract-specific waiting period."
                )
            }

        return {
            "classification": "incorrect",
            "reason": (
                "Gives a specific cataract waiting period "
                "without support from the provided policy context."
            )
        }

    # -----------------------------------------------------
    # REQUIRED FACTS
    # -----------------------------------------------------

    required = truth.get("required")

    if required:

        missing = []

        for fact in required:

            if normalize(fact) not in text:
                missing.append(fact)

        if not missing:

            # For Q06 we also want both sides of the
            # pre/post question represented.
            if question_id == "Q06":

                has_pre = "pre-hospitalization" in text
                has_post = "post-hospitalization" in text

                if has_pre and has_post:
                    return {
                        "classification": "correct",
                        "reason": truth["description"]
                    }

                return {
                    "classification": "incorrect",
                    "reason": (
                        "Does not adequately address both "
                        "pre-hospitalization and post-hospitalization."
                    )
                }

            return {
                "classification": "correct",
                "reason": truth["description"]
            }

        return {
            "classification": "incorrect",
            "reason": (
                "Missing required policy facts: "
                + ", ".join(missing)
            )
        }

    # -----------------------------------------------------
    # ANY REQUIRED FACT
    # -----------------------------------------------------

    required_any = truth.get("required_any")

    if required_any:

        matched_group = None

        for group in required_any:

            if all(
                normalize(fact) in text
                for fact in group
            ):
                matched_group = group
                break

        if matched_group is None:

            return {
                "classification": "incorrect",
                "reason": (
                    "Does not contain the required policy evidence."
                )
            }

    # -----------------------------------------------------
    # POSITIVE ANSWER
    # -----------------------------------------------------

    if truth.get("positive_answer"):

        if not contains_positive(text):

            return {
                "classification": "incorrect",
                "reason": (
                    "Does not clearly state that the benefit "
                    "is covered/provided."
                )
            }

    # -----------------------------------------------------
    # NEGATIVE / EXCLUSION ANSWER
    # -----------------------------------------------------

    if truth.get("negative_or_exclusion"):

        if not contains_negative(text):

            return {
                "classification": "incorrect",
                "reason": (
                    "Does not identify the exclusion or "
                    "negative policy treatment."
                )
            }

    # -----------------------------------------------------
    # SPECIAL HANDLING FOR Q08
    # -----------------------------------------------------

    if question_id == "Q08":

        # The answer should not simply claim that all
        # eligible medical expenses are covered at 100%.
        #
        # 100% in the retrieved text refers to particular
        # schedule-of-loss percentages, not necessarily
        # universal medical-expense reimbursement.

        if (
            "up to 100%" in text
            and "eligible expenses" in text
        ):

            return {
                "classification": "incorrect",
                "reason": (
                    "Confuses a 100% schedule-of-loss benefit "
                    "with a universal percentage of eligible "
                    "medical expenses."
                )
            }

        return {
            "classification": "correct",
            "reason": (
                "Answer discusses the policy's limits/coverage "
                "without making an unsupported universal 100% claim."
            )
        }

    return {
        "classification": "correct",
        "reason": truth["description"]
    }


# =========================================================
# LOAD RESULTS
# =========================================================

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8"
) as f:

    data = json.load(f)


# =========================================================
# SCORE
# =========================================================

results = data.get(
    "results",
    []
)

scored_results = []

for result in results:

    question_id = result["question_id"]
    condition = result["condition"]
    answer = result.get("answer", "")

    if question_id not in GROUND_TRUTH:

        raise RuntimeError(
            f"No ground truth defined for {question_id}"
        )

    evaluation = score_answer(
        question_id,
        answer
    )

    scored_results.append({

        "question_id":
            question_id,

        "question":
            result["question"],

        "condition":
            condition,

        "answer":
            answer,

        "classification":
            evaluation["classification"],

        "reason":
            evaluation["reason"],

        "grounded":
            result.get(
                "grounded",
                False
            ),

        "latency_seconds":
            result.get(
                "latency_seconds"
            ),

        "retrieval_latency_seconds":
            result.get(
                "retrieval_latency_seconds"
            ),

        "average_retrieval_score":
            result.get(
                "average_retrieval_score"
            ),

        "retrieved_documents":
            result.get(
                "retrieved_documents",
                []
            )
    })


# =========================================================
# SUMMARY
# =========================================================

summary = {}

for condition in [
    "RAG",
    "NO_RAG"
]:

    condition_results = [
        r
        for r in scored_results
        if r["condition"] == condition
    ]

    correct = sum(
        r["classification"] == "correct"
        for r in condition_results
    )

    incorrect = sum(
        r["classification"] == "incorrect"
        for r in condition_results
    )

    total = len(condition_results)

    accuracy = (
        (correct / total) * 100
        if total
        else 0
    )

    grounded = sum(
        r["grounded"]
        for r in condition_results
        if condition == "RAG"
    )

    latencies = [
        r["latency_seconds"]
        for r in condition_results
        if r["latency_seconds"] is not None
    ]

    avg_latency = (
        sum(latencies) / len(latencies)
        if latencies
        else 0
    )

    summary[condition] = {

        "total_questions":
            total,

        "correct":
            correct,

        "incorrect":
            incorrect,

        "accuracy_percent":
            round(
                accuracy,
                2
            ),

        "grounded_answers":
            grounded,

        "average_latency_seconds":
            round(
                avg_latency,
                2
            )
    }


# =========================================================
# PAIRWISE COMPARISON
# =========================================================

pairwise = []

question_ids = sorted(
    {
        r["question_id"]
        for r in scored_results
    }
)

for question_id in question_ids:

    rag = next(
        r
        for r in scored_results
        if r["question_id"] == question_id
        and r["condition"] == "RAG"
    )

    norag = next(
        r
        for r in scored_results
        if r["question_id"] == question_id
        and r["condition"] == "NO_RAG"
    )

    rag_status = rag["classification"]
    norag_status = norag["classification"]

    if (
        rag_status == "correct"
        and norag_status == "incorrect"
    ):
        winner = "RAG"

    elif (
        rag_status == "incorrect"
        and norag_status == "correct"
    ):
        winner = "NO_RAG"

    elif (
        rag_status == "correct"
        and norag_status == "correct"
    ):
        winner = "BOTH"

    else:
        winner = "BOTH INCORRECT"

    pairwise.append({

        "question_id":
            question_id,

        "question":
            rag["question"],

        "rag_classification":
            rag_status,

        "no_rag_classification":
            norag_status,

        "winner":
            winner,

        "rag_answer":
            rag["answer"],

        "no_rag_answer":
            norag["answer"],

        "rag_reason":
            rag["reason"],

        "no_rag_reason":
            norag["reason"]
    })


rag_wins = sum(
    x["winner"] == "RAG"
    for x in pairwise
)

norag_wins = sum(
    x["winner"] == "NO_RAG"
    for x in pairwise
)

both = sum(
    x["winner"] == "BOTH"
    for x in pairwise
)

both_incorrect = sum(
    x["winner"] == "BOTH INCORRECT"
    for x in pairwise
)


# =========================================================
# FINAL OUTPUT
# =========================================================

output = {

    "title":
        "InsureMate Controlled RAG vs No-RAG Evaluation",

    "methodology": {

        "model":
            "codellama:7b-instruct",

        "questions":
            10,

        "same_questions":
            True,

        "same_model":
            True,

        "rag_top_k":
            5,

        "temperature":
            0,

        "scoring":
            (
                "Question-specific policy ground truth. "
                "Answers are scored against required policy facts. "
                "Out-of-context refusal is correct only when the "
                "policy documents genuinely do not specify the answer."
            )
    },

    "summary":
        summary,

    "pairwise_summary": {

        "rag_wins":
            rag_wins,

        "no_rag_wins":
            norag_wins,

        "both_correct":
            both,

        "both_incorrect":
            both_incorrect,

        "rag_win_rate_percent":
            round(
                (rag_wins / len(pairwise)) * 100,
                2
            )
            if pairwise
            else 0
    },

    "pairwise_comparison":
        pairwise,

    "detailed_results":
        scored_results
}


# =========================================================
# SAVE
# =========================================================

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

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


# =========================================================
# PRINT
# =========================================================

print("=" * 72)
print("INSUREMATE WEEK 4 - FINAL RAG VS NO-RAG EVALUATION")
print("=" * 72)

print()

for condition in [
    "RAG",
    "NO_RAG"
]:

    s = summary[condition]

    print(condition)

    print(
        f"  Questions:       {s['total_questions']}"
    )

    print(
        f"  Correct:         {s['correct']}"
    )

    print(
        f"  Incorrect:       {s['incorrect']}"
    )

    print(
        f"  Accuracy:        {s['accuracy_percent']}%"
    )

    print(
        f"  Grounded:        {s['grounded_answers']}"
    )

    print(
        f"  Avg latency:     "
        f"{s['average_latency_seconds']} seconds"
    )

    print()


print("=" * 72)
print("PAIRWISE COMPARISON")
print("=" * 72)

for item in pairwise:

    print(
        f"{item['question_id']}: "
        f"RAG={item['rag_classification']} | "
        f"NO-RAG={item['no_rag_classification']} | "
        f"WINNER={item['winner']}"
    )


print()

print(
    f"RAG wins:          {rag_wins}"
)

print(
    f"No-RAG wins:       {norag_wins}"
)

print(
    f"Both correct:      {both}"
)

print(
    f"Both incorrect:    {both_incorrect}"
)

print(
    f"RAG win rate:      "
    f"{output['pairwise_summary']['rag_win_rate_percent']}%"
)

print()

print("=" * 72)

print(
    f"Saved to:\n{OUTPUT_FILE}"
)

print("=" * 72)