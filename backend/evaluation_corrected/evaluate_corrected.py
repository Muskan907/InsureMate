#!/usr/bin/env python3
"""
InsureMate corrected evaluation.

Reads:
  ../evaluation/results/independent_evaluation.json

Writes:
  results/corrected_scores.json

Important:
- Existing backend/evaluation is never modified.
- Conservative scoring is used.
- Questions marked manual_review are excluded from automatic accuracy.
- The evaluator distinguishes correct refusal from incorrect refusal.
"""
import json, re
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent
INPUT = BASE.parent / "evaluation" / "results" / "independent_evaluation.json"
RUBRIC_FILE = BASE / "dataset_corrected.json"
OUTPUT = BASE / "results" / "corrected_scores.json"

def norm(s):
    return re.sub(r"\s+", " ", (s or "").lower()).strip()

def is_refusal(answer):
    a = norm(answer)
    patterns = [
        "cannot be determined",
        "can't be determined",
        "cannot determine",
        "not enough information",
        "do not contain enough information",
        "does not contain enough information",
        "unable to determine",
        "not possible to determine",
        "insufficient information",
        "not enough context",
    ]
    return any(p in a for p in patterns)

def has_any(answer, terms):
    a = norm(answer)
    return any(norm(t) in a for t in terms)

def has_all(answer, terms):
    a = norm(answer)
    return all(norm(t) in a for t in terms)

def yes_answer(answer):
    a = norm(answer)
    if re.search(r"\b(no|not|cannot|can't)\b", a[:120]):
        return False
    return bool(re.search(r"\byes\b", a[:180]))

def evaluate_row(row, rule):
    answer = row.get("answer", "")
    mode = rule["mode"]

    if mode == "manual_review":
        return "manual_review", rule.get("note", "")

    if mode == "refusal":
        return ("correct", "Appropriate refusal/clarification.") if is_refusal(answer) else ("incorrect", "Question requires refusal/clarification, but model gave a substantive claim.")

    if mode == "yes_no":
        if yes_answer(answer) and rule["expected"] == "yes":
            if has_any(answer, rule.get("required_any", [])):
                return "correct", "Supported positive answer with relevant policy concepts."
        return "incorrect", "Expected a supported yes/no answer."

    if mode == "negative_claim":
        a = norm(answer)
        negative = (
            "no" in a or "not unlimited" in a or
            "maximum" in a or "limit" in a or
            "sum insured" in a or "policy schedule" in a
        )
        return ("correct", "Rejects unlimited coverage and/or identifies limits.") if negative else ("incorrect", "Did not reject the unsupported unlimited-coverage claim.")

    if mode == "keywords":
        if has_any(answer, rule.get("required_any", [])) and has_all(answer, rule.get("required_all", [])):
            return "correct", "Contains required evidence concepts."
        return "incorrect", "Missing required evidence concepts."

    if mode == "documents":
        docs = [norm(d) for d in rule.get("required_docs", [])]
        answer_n = norm(answer)
        # Allow exact filename, filename without extension, or distinctive basename.
        matched = 0
        for d in docs:
            variants = {d, d.removesuffix(".pdf"), d.replace(".pdf", "")}
            if any(v in answer_n for v in variants):
                matched += 1
        return ("correct", "Identifies the required policy document(s).") if matched == len(docs) else ("incorrect", "Required document name(s) were not identified precisely.")

    return "manual_review", "Unknown rubric mode."

def main():
    if not INPUT.exists():
        raise SystemExit(f"Input not found: {INPUT}")

    data = json.loads(INPUT.read_text(encoding="utf-8"))
    rubric = json.loads(RUBRIC_FILE.read_text(encoding="utf-8"))["rubric"]

    rows = data.get("results", [])
    by_q = defaultdict(list)
    for row in rows:
        by_q[row["question_id"]].append(row)

    evaluated = []
    for qid, qrows in sorted(by_q.items()):
        rule = rubric.get(qid, {"mode":"manual_review", "note":"No rubric."})
        for row in qrows:
            verdict, reason = evaluate_row(row, rule)
            evaluated.append({
                "question_id": qid,
                "model": row.get("model"),
                "question": row.get("question"),
                "verdict": verdict,
                "reason": reason,
                "answer": row.get("answer"),
                "latency_seconds": row.get("latency_seconds"),
                "retrieval_latency_seconds": row.get("retrieval_latency_seconds"),
            })

    stats = defaultdict(lambda: {"correct":0, "incorrect":0, "manual_review":0})
    for r in evaluated:
        stats[r["model"]][r["verdict"]] += 1

    summary = {}
    for model, s in stats.items():
        scored = s["correct"] + s["incorrect"]
        summary[model] = {
            **s,
            "scored_questions": scored,
            "accuracy_excluding_manual_review": round(s["correct"] / scored, 4) if scored else None,
        }

    out = {
        "title": "InsureMate Corrected Independent Evaluation",
        "method": "Conservative evidence-based rubric. Manual-review questions are excluded from automatic accuracy.",
        "input": str(INPUT),
        "summary_by_model": summary,
        "question_results": evaluated,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
    json.dumps(out, indent=2, ensure_ascii=False),
    encoding="utf-8"
    )

    print("=" * 72)
    print("INSUREMATE CORRECTED EVALUATION")
    print("=" * 72)
    for model, s in summary.items():
        print(f"\n{model}")
        print(f"  Correct:       {s['correct']}")
        print(f"  Incorrect:     {s['incorrect']}")
        print(f"  Manual review: {s['manual_review']}")
        print(f"  Accuracy*:     {s['accuracy_excluding_manual_review']}")
    print("\n* Manual-review questions are excluded.")
    print(f"\nSaved to: {OUTPUT}")

if __name__ == "__main__":
    main()
