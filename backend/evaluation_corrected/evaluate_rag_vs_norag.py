import json
from pathlib import Path


BASE = Path("/home/student/InsureMate")

INPUT = (
    BASE
    / "backend/evaluation/results/rag_vs_norag.json"
)

OUTPUT = (
    BASE
    / "backend/evaluation_corrected/results/"
    / "rag_vs_norag_corrected.json"
)


# ============================================================
# GROUND TRUTH FOR THE 8 RAG EXPERIMENT QUESTIONS
# ============================================================
#
# These are the questions actually used by the RAG experiment.
#
# We score only questions where the expected answer can be
# determined reliably from the policy evidence.
#
# Other questions are retained and reported as manual review.
# ============================================================

GROUND_TRUTH = {

    "Q02": {
        "required": ["24 months"],
        "description":
            "Specific waiting-period conditions are subject "
            "to a 24-month waiting period."
    },

    "Q04": {
        "required": ["24 months"],
        "description":
            "Stones in the urinary system have a 24-month "
            "specific waiting period."
    },

    "Q06": {
        "required": [],
        "description":
            "Hospitalization coverage requires policy-grounded "
            "interpretation.",
        "manual": True
    },

    "Q08": {
        "required": ["spondylosis"],
        "description":
            "The policy specifically discusses treatment of "
            "spondylosis / spondylitis.",
        "manual": True
    },

    "Q10": {
        "required": [],
        "description":
            "Important waiting periods require multiple facts.",
        "manual": True
    },

    "Q11": {
        "required": ["waiting"],
        "description":
            "Cross-document comparison requires multiple "
            "policy documents.",
        "manual": True
    },

    "Q18": {
        "required": [],
        "description":
            "Ambiguous treatment-coverage question.",
        "manual": True
    },

    "Q20": {
        "required": [],
        "description":
            "Bitcoin is outside the insurance knowledge base.",
        "out_of_scope": True
    }
}


REFUSAL_WORDS = [
    "cannot",
    "can't",
    "do not have",
    "don't have",
    "not mentioned",
    "not available",
    "no information",
    "cannot determine",
    "unable to determine",
    "outside the knowledge base",
    "outside my knowledge",
    "outside the scope"
]


def normalize(text):
    return " ".join(
        str(text).lower().split()
    )


def is_refusal(answer):

    answer = normalize(answer)

    return any(
        phrase in answer
        for phrase in REFUSAL_WORDS
    )


def classify(result):

    qid = result["question_id"]

    truth = GROUND_TRUTH.get(qid)

    if truth is None:
        return "manual_review"

    answer = normalize(result.get("answer", ""))

    # --------------------------------------------------------
    # OUT OF SCOPE
    # --------------------------------------------------------

    if truth.get("out_of_scope"):

        if is_refusal(answer):
            return "correct"

        return "incorrect"

    # --------------------------------------------------------
    # MANUAL
    # --------------------------------------------------------

    if truth.get("manual"):
        return "manual_review"

    # --------------------------------------------------------
    # FACTUAL
    # --------------------------------------------------------

    required = truth.get("required", [])

    for phrase in required:

        if phrase.lower() in answer:
            return "correct"

    return "incorrect"


def average(values):

    values = [
        v for v in values
        if isinstance(v, (int, float))
    ]

    if not values:
        return None

    return round(
        sum(values) / len(values),
        3
    )


def main():

    print("=" * 72)
    print("INSUREMATE WEEK 4 - CORRECTED RAG VS NO-RAG EVALUATION")
    print("=" * 72)

    with open(INPUT, encoding="utf-8") as f:
        data = json.load(f)

    results = data["results"]

    evaluated = []

    for result in results:

        classification = classify(result)

        evaluated.append({
            "question_id":
                result["question_id"],

            "question":
                result["question"],

            "model":
                result["model"],

            "condition":
                result["condition"],

            "answer":
                result.get("answer", ""),

            "classification":
                classification,

            "latency_seconds":
                result.get("latency_seconds"),

            "retrieval_latency_seconds":
                result.get(
                    "retrieval_latency_seconds"
                ),

            "prompt_tokens":
                result.get("prompt_tokens"),

            "generated_tokens":
                result.get("generated_tokens"),

            "total_tokens":
                result.get("total_tokens"),

            "retrieved_chunks":
                result.get(
                    "retrieved_chunks",
                    []
                )
        })


    # ========================================================
    # CONDITION SUMMARY
    # ========================================================

    summary = {}

    for condition in ["RAG", "NO_RAG"]:

        rows = [
            r for r in evaluated
            if normalize(r["condition"])
            == normalize(condition)
        ]

        correct = sum(
            r["classification"] == "correct"
            for r in rows
        )

        incorrect = sum(
            r["classification"] == "incorrect"
            for r in rows
        )

        manual = sum(
            r["classification"] == "manual_review"
            for r in rows
        )

        scored = correct + incorrect

        accuracy = (
            round(
                correct / scored * 100,
                2
            )
            if scored
            else None
        )

        summary[condition] = {

            "total_evaluations":
                len(rows),

            "correct":
                correct,

            "incorrect":
                incorrect,

            "manual_review":
                manual,

            "scored_questions":
                scored,

            "accuracy_percent":
                accuracy,

            "average_latency_seconds":
                average([
                    r["latency_seconds"]
                    for r in rows
                ]),

            "average_retrieval_latency_seconds":
                average([
                    r["retrieval_latency_seconds"]
                    for r in rows
                ]),

            "average_prompt_tokens":
                average([
                    r["prompt_tokens"]
                    for r in rows
                ]),

            "average_generated_tokens":
                average([
                    r["generated_tokens"]
                    for r in rows
                ])
        }


    # ========================================================
    # RAG-SPECIFIC RETRIEVAL ANALYSIS
    # ========================================================

    rag_rows = [
        r for r in evaluated
        if normalize(r["condition"]) == "rag"
    ]

    retrieval_cases = []

    for r in rag_rows:

        chunks = r.get(
            "retrieved_chunks",
            []
        )

        scores = [
            c.get("score")
            for c in chunks
            if isinstance(
                c.get("score"),
                (int, float)
            )
        ]

        retrieval_cases.append({

            "question_id":
                r["question_id"],

            "classification":
                r["classification"],

            "retrieved_chunk_count":
                len(chunks),

            "average_retrieval_score":
                average(scores),

            "top_retrieval_score":
                max(scores)
                if scores
                else None,

            "documents":
                list(dict.fromkeys(
                    c.get("document", "unknown")
                    for c in chunks
                ))
        })


    # ========================================================
    # DIFFERENCE CASES
    # ========================================================

    differences = []

    question_ids = sorted(
        set(
            r["question_id"]
            for r in evaluated
        )
    )

    for qid in question_ids:

        rag = next(
            (
                r for r in evaluated
                if r["question_id"] == qid
                and normalize(r["condition"])
                == "rag"
            ),
            None
        )

        norag = next(
            (
                r for r in evaluated
                if r["question_id"] == qid
                and normalize(r["condition"])
                == "no_rag"
            ),
            None
        )

        if not rag or not norag:
            continue

        if (
            rag["classification"]
            != norag["classification"]
        ):

            differences.append({

                "question_id":
                    qid,

                "rag_classification":
                    rag["classification"],

                "no_rag_classification":
                    norag["classification"],

                "rag_answer":
                    rag["answer"],

                "no_rag_answer":
                    norag["answer"]
            })


    # ========================================================
    # SAVE
    # ========================================================

    output = {

        "title":
            "InsureMate Week 4 Corrected RAG vs No-RAG Evaluation",

        "methodology": {

            "same_application":
                True,

            "same_model":
                True,

            "same_questions":
                True,

            "only_changed_variable":
                "retrieved policy context",

            "out_of_scope_refusal":
                "counted as correct",

            "manual_review":
                "excluded from automatic accuracy",

            "purpose":
                "Measure whether retrieved policy evidence "
                "improves grounded answer quality."
        },

        "summary":
            summary,

        "retrieval_analysis":
            retrieval_cases,

        "rag_vs_no_rag_differences":
            differences,

        "all_evaluations":
            evaluated
    }


    with open(
        OUTPUT,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            output,
            f,
            indent=2,
            ensure_ascii=False
        )


    # ========================================================
    # PRINT RESULTS
    # ========================================================

    print()

    for condition, s in summary.items():

        print(condition)

        print(
            "  Total evaluations:",
            s["total_evaluations"]
        )

        print(
            "  Correct:",
            s["correct"]
        )

        print(
            "  Incorrect:",
            s["incorrect"]
        )

        print(
            "  Manual review:",
            s["manual_review"]
        )

        print(
            "  Scored:",
            s["scored_questions"]
        )

        print(
            "  Accuracy:",
            f'{s["accuracy_percent"]}%'
        )

        print(
            "  Avg latency:",
            f'{s["average_latency_seconds"]} s'
        )

        print()

    print("=" * 72)
    print("RAG VS NO-RAG DIFFERENCES")
    print("=" * 72)

    for d in differences:

        print(
            d["question_id"],
            "| RAG:",
            d["rag_classification"],
            "| NO-RAG:",
            d["no_rag_classification"]
        )

    print()

    print("Saved to:")
    print(OUTPUT)

    print("=" * 72)


if __name__ == "__main__":
    main()