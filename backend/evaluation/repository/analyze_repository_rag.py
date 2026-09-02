import json
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent

INPUT = BASE / "repository_evaluation.json"
OUTPUT = BASE / "repository_analysis.json"

with open(INPUT, encoding="utf-8") as f:
    data = json.load(f)

results = data["results"]

print("=" * 70)
print("INSUREMATE - REPOSITORY RAG ANALYSIS")
print("=" * 70)

all_scores = []
file_counts = Counter()

for r in results:
    for chunk in r.get("retrieved_chunks", []):
        score = chunk.get("score")

        if score is not None:
            all_scores.append(score)

        file_name = chunk.get(
            "file",
            chunk.get("document", "unknown")
        )

        file_counts[file_name] += 1


# ---------------------------------------------------------
# RETRIEVAL STATISTICS
# ---------------------------------------------------------

total_chunks = len(all_scores)

average_score = (
    sum(all_scores) / total_chunks
    if total_chunks
    else 0
)

top_score = (
    max(all_scores)
    if all_scores
    else 0
)

lowest_score = (
    min(all_scores)
    if all_scores
    else 0
)


print("\nRetrieval statistics")

print(
    f"Questions evaluated: {len(results)}"
)

print(
    f"Retrieved chunks: {total_chunks}"
)

print(
    f"Average similarity score: "
    f"{average_score:.4f}"
)

print(
    f"Highest similarity score: "
    f"{top_score:.4f}"
)

print(
    f"Lowest similarity score: "
    f"{lowest_score:.4f}"
)


# ---------------------------------------------------------
# FILE DISTRIBUTION
# ---------------------------------------------------------

print("\nRetrieved file distribution")

for file_name, count in file_counts.most_common():

    percentage = (
        count / total_chunks * 100
        if total_chunks
        else 0
    )

    print(
        f"{file_name:<55} "
        f"{count:>3} "
        f"({percentage:.1f}%)"
    )


# ---------------------------------------------------------
# QUESTION LEVEL ANALYSIS
# ---------------------------------------------------------

print("\nQuestion-level retrieval")

question_analysis = []

for r in results:

    chunks = r.get(
        "retrieved_chunks",
        []
    )

    scores = [
        c.get("score")
        for c in chunks
        if c.get("score") is not None
    ]

    files = [
        c.get(
            "file",
            c.get("document", "unknown")
        )
        for c in chunks
    ]

    avg = (
        sum(scores) / len(scores)
        if scores
        else 0
    )

    top = (
        max(scores)
        if scores
        else 0
    )

    item = {
        "question_id":
            r["question_id"],

        "question":
            r["question"],

        "average_score":
            round(avg, 4),

        "top_score":
            round(top, 4),

        "retrieved_files":
            files,

        "answer":
            r.get("answer", ""),
    }

    question_analysis.append(item)

    print(
        f"\n{r['question_id']} "
        f"| avg={avg:.4f} "
        f"| top={top:.4f}"
    )

    print(
        "Files:"
    )

    for f in files:
        print(
            f"  - {f}"
        )


# ---------------------------------------------------------
# SAVE
# ---------------------------------------------------------

analysis = {
    "summary": {
        "questions": len(results),
        "retrieved_chunks": total_chunks,
        "average_retrieval_score":
            round(average_score, 4),
        "highest_retrieval_score":
            round(top_score, 4),
        "lowest_retrieval_score":
            round(lowest_score, 4),
    },

    "file_distribution":
        dict(file_counts),

    "question_analysis":
        question_analysis,
}


with open(
    OUTPUT,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        analysis,
        f,
        indent=2,
        ensure_ascii=False
    )


print(
    "\n" + "=" * 70
)

print(
    "ANALYSIS COMPLETED"
)

print(
    "=" * 70
)

print(
    f"\nSaved to:\n{OUTPUT}"
)
