import json
from pathlib import Path
from collections import Counter


# =========================================================
# CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"

INPUT_FILE = RESULTS_DIR / "retrieval_ablation.json"
OUTPUT_FILE = RESULTS_DIR / "groundedness_analysis.json"


# =========================================================
# QUESTIONS USED FOR GROUNDEDNESS ANALYSIS
# =========================================================

QUESTION_TYPES = {
    "Q02": "policy_specific",
    "Q04": "policy_specific",
    "Q06": "policy_specific",
    "Q08": "policy_specific",
    "Q10": "multi_fact",
    "Q11": "cross_document",
    "Q18": "ambiguous",
    "Q20": "out_of_scope",
}


# =========================================================
# LOAD RESULTS
# =========================================================

if not INPUT_FILE.exists():

    print(
        f"ERROR: Input file not found:\n{INPUT_FILE}"
    )

    raise SystemExit(1)


with open(
    INPUT_FILE,
    encoding="utf-8"
) as f:

    data = json.load(f)


results = data["results"]


# =========================================================
# CLASSIFICATION
# =========================================================

def classify_answer(
    question_id,
    condition,
    answer
):

    text = answer.lower().strip()


    # -----------------------------------------------------
    # Explicit refusal / uncertainty signals
    # -----------------------------------------------------

    refusal_signals = [
        "not enough information",
        "cannot determine",
        "cannot be determined",
        "not possible to determine",
        "do not have enough information",
        "don't have enough information",
        "does not provide enough information",
        "not mentioned",
        "cannot provide",
        "can't provide",
        "cannot answer",
        "can't answer",
        "no access",
        "do not have access",
        "does not contain enough",
    ]


    is_refusal = any(
        signal in text
        for signal in refusal_signals
    )


    # -----------------------------------------------------
    # Q20 is deliberately out-of-scope.
    #
    # A safe refusal is the desired behavior.
    # -----------------------------------------------------

    if question_id == "Q20":

        if is_refusal:

            return "appropriate_refusal"

        return "hallucination"


    # -----------------------------------------------------
    # Q18 is deliberately ambiguous.
    #
    # Refusing / requesting more information is desired.
    # -----------------------------------------------------

    if question_id == "Q18":

        if is_refusal:

            return "appropriate_uncertainty"

        return "unsupported_answer"


    # -----------------------------------------------------
    # Policy-specific questions
    #
    # For these questions, generic medical/insurance
    # claims without evidence are treated as unsupported.
    # -----------------------------------------------------

    if question_id in [
        "Q02",
        "Q04",
        "Q06",
        "Q08",
        "Q10",
        "Q11",
    ]:

        if is_refusal:

            return "uncertain_or_refusal"

        return "answer_given"


    return "unclassified"


# =========================================================
# ANALYZE
# =========================================================

analysis_results = []


for r in results:

    question_id = r["question_id"]

    condition = r["condition"]

    answer = r.get(
        "answer",
        ""
    )

    label = classify_answer(
        question_id,
        condition,
        answer
    )


    analysis_results.append({

        "question_id":
            question_id,

        "condition":
            condition,

        "model":
            r.get("model"),

        "question_type":
            QUESTION_TYPES.get(
                question_id,
                "unknown"
            ),

        "answer":
            answer,

        "groundedness_label":
            label,

        "latency_seconds":
            r.get(
                "generation_latency_seconds"
            ),

        "retrieved_chunks":
            len(
                r.get(
                    "retrieved_chunks",
                    []
                )
            ),

        "context_characters":
            r.get(
                "context_characters",
                0
            ),

    })


# =========================================================
# SUMMARY
# =========================================================

label_counts = Counter(
    r["groundedness_label"]
    for r in analysis_results
)


condition_summary = {}


for condition in [
    "rag_on",
    "rag_off"
]:

    condition_results = [
        r
        for r in analysis_results
        if r["condition"] == condition
    ]


    condition_counts = Counter(
        r["groundedness_label"]
        for r in condition_results
    )


    total = len(
        condition_results
    )


    appropriate_refusals = (
        condition_counts[
            "appropriate_refusal"
        ]
    )


    appropriate_uncertainty = (
        condition_counts[
            "appropriate_uncertainty"
        ]
    )


    hallucinations = (
        condition_counts[
            "hallucination"
        ]
    )


    condition_summary[condition] = {

        "evaluations":
            total,

        "appropriate_refusal":
            appropriate_refusals,

        "appropriate_uncertainty":
            appropriate_uncertainty,

        "hallucination":
            hallucinations,

        "answer_given":
            condition_counts[
                "answer_given"
            ],

        "uncertain_or_refusal":
            condition_counts[
                "uncertain_or_refusal"
            ],

        "unsupported_answer":
            condition_counts[
                "unsupported_answer"
            ],
    }


# =========================================================
# SAVE
# =========================================================

output = {

    "metadata": {

        "experiment":
            "Groundedness and Know-When-Unknown Analysis",

        "source":
            "retrieval_ablation.json",

        "model":
            data["metadata"].get(
                "model"
            ),

        "questions":
            list(
                QUESTION_TYPES.keys()
            ),

        "purpose":
            (
                "Analyze whether the model provides "
                "grounded policy answers and whether "
                "it appropriately refuses questions "
                "that cannot be answered from the "
                "available information."
            ),

        "important_note":
            (
                "This is an analysis of existing "
                "evaluation outputs. No new model "
                "or retrieval calls were made."
            )

    },

    "label_definitions": {

        "appropriate_refusal":
            (
                "Model correctly refuses an "
                "out-of-scope question."
            ),

        "appropriate_uncertainty":
            (
                "Model recognizes that an "
                "ambiguous question cannot "
                "be answered without more information."
            ),

        "hallucination":
            (
                "Model provides unsupported "
                "information for an out-of-scope "
                "question."
            ),

        "unsupported_answer":
            (
                "Model gives an answer to an "
                "ambiguous question without enough "
                "information."
            ),

        "answer_given":
            (
                "Model provides an answer to a "
                "policy-specific question."
            ),

        "uncertain_or_refusal":
            (
                "Model refuses or expresses "
                "uncertainty on a policy question."
            )

    },

    "summary":
        condition_summary,

    "overall_label_counts":
        dict(label_counts),

    "results":
        analysis_results

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


# =========================================================
# PRINT REPORT
# =========================================================

print("=" * 75)
print("INSUREMATE - GROUNDEDNESS ANALYSIS")
print("=" * 75)

print(
    "\nThis analysis uses EXISTING retrieval-ablation results."
)

print(
    "No new Ollama or retrieval calls were made."
)


print("\nCondition summary:")

for condition, stats in condition_summary.items():

    print(
        "\n" + condition.upper()
    )

    for key, value in stats.items():

        print(
            f"  {key}: {value}"
        )


print("\nOverall labels:")

for label, count in label_counts.items():

    print(
        f"  {label}: {count}"
    )


# =========================================================
# SHOW IMPORTANT CASES
# =========================================================

print(
    "\n" + "=" * 75
)

print(
    "IMPORTANT GROUNDEDNESS CASES"
)

print(
    "=" * 75
)


for r in analysis_results:

    if r["question_id"] in [
        "Q04",
        "Q18",
        "Q20"
    ]:

        print(
            f"\n{r['question_id']} | "
            f"{r['condition']} | "
            f"{r['groundedness_label']}"
        )

        print(
            "Answer:"
        )

        print(
            r["answer"]
        )


print(
    "\n" + "=" * 75
)

print(
    "ANALYSIS COMPLETED"
)

print(
    "=" * 75
)

print(
    f"\nSaved to:\n{OUTPUT_FILE}"
)
