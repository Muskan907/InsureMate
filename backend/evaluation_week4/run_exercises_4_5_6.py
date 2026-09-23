"""Run and print the Week-4 Exercises 4, 5 and 6 evidence.

Exercises 4 and 5 use the already completed Week-4 evaluation artifacts.
Exercise 6 builds the real application repository index and executes five
cross-file questions against the indexed source tree.
"""
import argparse
import json
from pathlib import Path

from app.services.repository_understanding_service import (
    EXERCISE_6_CASES,
    build_index,
    evaluate_case,
)

BASE = Path(__file__).resolve().parents[2]
EVAL = BASE / "backend" / "evaluation_week4" / "week4_automated_evaluation.json"
RESOURCE = BASE / "backend" / "evaluation_week4" / "week4_resource_benchmark.json"
TESTS = BASE / "backend" / "evaluation_week4" / "week4_code_generation_tests.json"
OUT = BASE / "backend" / "evaluation_week4" / "exercise_6_repository_results.json"


def exercise4():
    data = json.loads(EVAL.read_text(encoding="utf-8"))
    resource = json.loads(RESOURCE.read_text(encoding="utf-8"))
    tests = json.loads(TESTS.read_text(encoding="utf-8"))
    print("\n" + "=" * 72)
    print("EXERCISE 4 — QUANTITATIVE MODEL ANALYSIS")
    print("=" * 72)
    for model, s in data["summary"].items():
        r = resource["summary"][model]
        print(f"{model:28} score={s['overall_score']:.2f}% | hallucination={s['hallucination_rate_percent']:.2f}% | latency={s['latency_avg_seconds']:.2f}s | RAM Δ={r['avg_ram_change_mb']:.2f}MB")
    print("\nCategory winners:")
    for category, model in data["category_winners"].items():
        print(f"  {category:30} -> {model}")
    print("\nCode-generation executable tests:")
    for t in tests:
        r = t["test_result"]
        print(f"  {t['model']:28} {t['question_id']} -> {r['status']} ({r.get('pass_rate')})")


def exercise5():
    data = json.loads(EVAL.read_text(encoding="utf-8"))
    print("\n" + "=" * 72)
    print("EXERCISE 5 — RAG TRACE")
    print("=" * 72)
    for r in data["detailed_results"]:
        if r["question_id"].startswith("RAG") and r["model"] == "qwen2.5:1.5b":
            print(f"\n{r['question_id']}: {r['question']}")
            print(f"  Retrieved policy chunks: {len(r.get('retrieved_policy', []))}")
            print(f"  Answer score: {r['category_score']:.2f}% | hallucination={r['hallucination']}")
            for c in r.get("retrieved_policy", [])[:5]:
                print(f"    - {c['document']} p.{c['page']} chunk={c['chunk_id']} score={c['score']}")
            print(f"  Answer: {r['answer'][:300]}")


def exercise6(model: str, rebuild: bool):
    print("\n" + "=" * 72)
    print("EXERCISE 6 — LIVE REPOSITORY / CODEBASE UNDERSTANDING")
    print("=" * 72)
    index = build_index(force=rebuild)
    print(f"Indexed {index['metadata']['source_file_count']} application/config files into {index['metadata']['chunk_count']} line-addressable chunks.")
    results = []
    for case in EXERCISE_6_CASES:
        print(f"\n[{case['id']}] {case['question']}")
        result = evaluate_case(case["id"], model=model, top_k=5)
        results.append(result)
        print(f"  Retrieved files: {result['files_analyzed']} | multi-file={result['multi_file']} | expected-file coverage={result['expected_file_coverage_percent']}%")
        for item in result["retrieved_chunks"]:
            print(f"    {item['file']}:{item['start_line']}-{item['end_line']} score={item['score']}")
        print("  Answer:")
        print(result["answer"])
    OUT.write_text(json.dumps({
        "experiment": "InsureMate Week 4 Exercise 6",
        "model": model,
        "cases": results,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved Exercise 6 evidence to {OUT}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="qwen2.5:1.5b")
    parser.add_argument("--rebuild", action="store_true")
    args = parser.parse_args()
    exercise4()
    exercise5()
    exercise6(args.model, args.rebuild)
