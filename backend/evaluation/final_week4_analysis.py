import json
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent
RESULTS = BASE / "results"
OUTPUT = RESULTS / "week4_final_analysis.json"


def load(name):
    path = RESULTS / name
    if not path.exists():
        print(f"WARNING: missing {name}")
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


scores = load("evaluation_scores.json")
independent = load("independent_evaluation.json")
topk = load("topk_sensitivity.json")
ablation = load("retrieval_ablation.json")
grounded = load("groundedness_analysis.json")
resource = load("resource_benchmark_rag.json")
repository = load("repository_analysis.json")


# =========================================================
# MODEL COMPARISON
# =========================================================

model_summary = scores.get("model_summary", {})


# =========================================================
# TOP-K ANALYSIS
# =========================================================

topk_results = topk.get("results", [])

topk_summary = {}

for r in topk_results:
    k = str(r.get("top_k", r.get("k", "unknown")))

    if k not in topk_summary:
        topk_summary[k] = {
            "evaluations": 0,
            "latencies": [],
            "retrieval_scores": [],
            "context_sizes": []
        }

    topk_summary[k]["evaluations"] += 1

    if r.get("latency_seconds") is not None:
        topk_summary[k]["latencies"].append(
            r["latency_seconds"]
        )

    if r.get("average_retrieval_score") is not None:
        topk_summary[k]["retrieval_scores"].append(
            r["average_retrieval_score"]
        )

    if r.get("context_characters") is not None:
        topk_summary[k]["context_sizes"].append(
            r["context_characters"]
        )


for k, s in topk_summary.items():

    s["average_latency_seconds"] = round(
        sum(s["latencies"]) / len(s["latencies"]), 3
    ) if s["latencies"] else None

    s["average_retrieval_score"] = round(
        sum(s["retrieval_scores"]) / len(s["retrieval_scores"]), 4
    ) if s["retrieval_scores"] else None

    s["average_context_characters"] = round(
        sum(s["context_sizes"]) / len(s["context_sizes"]), 1
    ) if s["context_sizes"] else None

    del s["latencies"]
    del s["retrieval_scores"]
    del s["context_sizes"]


# =========================================================
# RAG ABLATION
# =========================================================

ablation_results = ablation.get("results", [])

ablation_summary = {}

for condition in ["rag_on", "rag_off"]:

    rows = [
        r for r in ablation_results
        if r.get("condition") == condition
    ]

    latencies = [
        r.get("generation_latency_seconds")
        for r in rows
        if r.get("generation_latency_seconds") is not None
    ]

    ablation_summary[condition] = {
        "evaluations": len(rows),
        "average_generation_latency_seconds": round(
            sum(latencies) / len(latencies), 3
        ) if latencies else None
    }


# =========================================================
# GROUNDEDNESS
# =========================================================

grounded_summary = grounded.get(
    "summary",
    {}
)

grounded_labels = grounded.get(
    "overall_label_counts",
    {}
)


# =========================================================
# RESOURCE BENCHMARK
# =========================================================

resource_results = resource.get("results", [])

resource_summary = {}

for r in resource_results:

    model = r.get("model")

    if not model:
        continue

    if model not in resource_summary:
        resource_summary[model] = {
            "evaluations": 0,
            "latencies": [],
            "ram_changes_mb": []
        }

    resource_summary[model]["evaluations"] += 1

    if r.get("latency_seconds") is not None:
        resource_summary[model]["latencies"].append(
            r["latency_seconds"]
        )

    if (
        r.get("ram_before_mb") is not None
        and r.get("ram_after_mb") is not None
    ):
        resource_summary[model]["ram_changes_mb"].append(
            r["ram_after_mb"] - r["ram_before_mb"]
        )


for model, s in resource_summary.items():

    s["average_latency_seconds"] = round(
        sum(s["latencies"]) / len(s["latencies"]), 3
    ) if s["latencies"] else None

    s["average_ram_change_mb"] = round(
        sum(s["ram_changes_mb"]) /
        len(s["ram_changes_mb"]), 1
    ) if s["ram_changes_mb"] else None

    del s["latencies"]
    del s["ram_changes_mb"]


# =========================================================
# REPOSITORY ANALYSIS
# =========================================================

repository_summary = repository.get(
    "summary",
    {}
)

repository_files = repository.get(
    "file_distribution",
    {}
)


# =========================================================
# INDEPENDENT EVALUATION
# =========================================================

independent_results = independent.get(
    "results",
    []
)

independent_summary = {
    "total_results": len(independent_results),
    "successful": sum(
        1 for r in independent_results
        if r.get("status") == "success"
    ),
    "models": sorted(
        set(
            r.get("model")
            for r in independent_results
            if r.get("model")
        )
    )
}


# =========================================================
# FINAL FINDINGS
# =========================================================

best_accuracy_model = None
best_accuracy = None

best_latency_model = None
best_latency = None

lowest_hallucination_model = None
lowest_hallucination = None


for model, stats in model_summary.items():

    accuracy = stats.get(
        "accuracy_percent"
    )

    latency = stats.get(
        "average_latency_seconds"
    )

    hallucination = stats.get(
        "hallucination_rate_percent"
    )

    if accuracy is not None:
        if best_accuracy is None or accuracy > best_accuracy:
            best_accuracy = accuracy
            best_accuracy_model = model

    if latency is not None:
        if best_latency is None or latency < best_latency:
            best_latency = latency
            best_latency_model = model

    if hallucination is not None:
        if (
            lowest_hallucination is None
            or hallucination < lowest_hallucination
        ):
            lowest_hallucination = hallucination
            lowest_hallucination_model = model


findings = {

    "best_accuracy": {
        "model": best_accuracy_model,
        "accuracy_percent": best_accuracy
    },

    "lowest_latency": {
        "model": best_latency_model,
        "latency_seconds": best_latency
    },

    "lowest_hallucination": {
        "model": lowest_hallucination_model,
        "hallucination_rate_percent":
            lowest_hallucination
    },

    "quality_latency_tradeoff": (
        "The highest-accuracy model is not the lowest-latency "
        "model, demonstrating a quality-latency trade-off."
        if best_accuracy_model != best_latency_model
        else
        "The highest-accuracy model is also the lowest-latency "
        "model under the measured conditions."
    ),

    "rag_finding": (
        "The RAG ablation compares policy-grounded responses "
        "with responses generated without retrieved policy "
        "context. Policy-specific questions provide evidence "
        "of the effect of retrieval on answer grounding."
    ),

    "topk_finding": (
        "Increasing Top-K increases the amount of retrieved "
        "context. The measured results should be interpreted "
        "together with latency and retrieval similarity rather "
        "than assuming that larger K is automatically better."
    ),

    "repository_finding": (
        "Repository-level RAG was evaluated using questions "
        "requiring understanding across multiple files and "
        "components."
    )

}


# =========================================================
# FINAL JSON
# =========================================================

final = {

    "title":
        "InsureMate Week 4 Final Evaluation",

    "scope": {
        "application":
            "InsureMate",
        "production_application_modified":
            False,
        "multi_model_orchestration_modified":
            False
    },

    "exercises": {

        "exercise_1_multiple_models": {
            "status": "completed",
            "models": model_summary,
            "independent_evaluations":
                independent_summary
        },

        "exercise_2_evaluation_dataset": {
            "status": "completed",
            "questions":
                25
        },

        "exercise_3_quantitative_evaluation": {
            "status": "completed",
            "metrics": [
                "accuracy",
                "hallucination_rate",
                "average_latency",
                "retrieval_confidence",
                "resource_usage"
            ]
        },

        "exercise_4_result_analysis": {
            "status": "completed",
            "findings":
                findings
        },

        "exercise_5_rag_pipeline": {
            "status": "completed",
            "rag_ablation":
                ablation_summary,
            "topk_sensitivity":
                topk_summary,
            "groundedness":
                {
                    "summary":
                        grounded_summary,
                    "labels":
                        grounded_labels
                }
        },

        "exercise_6_repository_understanding": {
            "status": "completed",
            "summary":
                repository_summary,
            "retrieved_file_distribution":
                repository_files
        }

    },

    "model_comparison":
        model_summary,

    "resource_benchmark":
        resource_summary,

    "topk_sensitivity":
        topk_summary,

    "rag_ablation":
        ablation_summary,

    "groundedness":
        {
            "summary":
                grounded_summary,
            "labels":
                grounded_labels
        },

    "repository_rag":
        {
            "summary":
                repository_summary,
            "file_distribution":
                repository_files
        },

    "final_findings":
        findings

}


with open(
    OUTPUT,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        final,
        f,
        indent=2,
        ensure_ascii=False
    )


# =========================================================
# PRINT
# =========================================================

print("=" * 75)
print("INSUREMATE WEEK 4 - FINAL ANALYSIS")
print("=" * 75)

print("\nMODEL COMPARISON")

for model, stats in model_summary.items():

    print(f"\n{model}")

    print(
        f"  Accuracy: "
        f"{stats.get('accuracy_percent')}%"
    )

    print(
        f"  Hallucination: "
        f"{stats.get('hallucination_rate_percent')}%"
    )

    print(
        f"  Avg latency: "
        f"{stats.get('average_latency_seconds')}s"
    )

    print(
        f"  Retrieval confidence: "
        f"{stats.get('average_retrieval_confidence')}"
    )


print("\nBEST RESULTS")

print(
    f"Best accuracy: "
    f"{best_accuracy_model} "
    f"({best_accuracy}%)"
)

print(
    f"Lowest latency: "
    f"{best_latency_model} "
    f"({best_latency}s)"
)

print(
    f"Lowest hallucination: "
    f"{lowest_hallucination_model} "
    f"({lowest_hallucination}%)"
)


print("\nTOP-K")

for k, stats in topk_summary.items():

    print(
        f"K={k}: "
        f"latency={stats['average_latency_seconds']}s, "
        f"retrieval={stats['average_retrieval_score']}, "
        f"context={stats['average_context_characters']} chars"
    )


print("\nRAG ABLATION")

for condition, stats in ablation_summary.items():

    print(
        f"{condition}: "
        f"{stats['evaluations']} evaluations, "
        f"avg latency="
        f"{stats['average_generation_latency_seconds']}s"
    )


print("\nREPOSITORY RAG")

print(
    f"Questions: "
    f"{repository_summary.get('questions')}"
)

print(
    f"Retrieved chunks: "
    f"{repository_summary.get('retrieved_chunks')}"
)

print(
    f"Average retrieval score: "
    f"{repository_summary.get('average_retrieval_score')}"
)


print("\n" + "=" * 75)
print("FINAL ANALYSIS SAVED")
print("=" * 75)

print(f"\n{OUTPUT}")
