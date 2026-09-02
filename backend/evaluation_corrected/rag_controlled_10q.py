import json
import time
from pathlib import Path

import requests


# ============================================================
# INSUREMATE WEEK 4
# CONTROLLED RAG VS NO-RAG EXPERIMENT
# ============================================================

OLLAMA_URL = "http://localhost:11434/api/generate"

RETRIEVAL_URL = (
    "http://localhost:8000/api/retrieval/search"
)

MODEL = "codellama:7b-instruct"


# ============================================================
# EXACTLY 10 POLICY/PDF QUESTIONS
# ============================================================

QUESTIONS = [
    {
        "id": "Q01",
        "question":
            "What is the waiting period for pre-existing diseases?"
    },
    {
        "id": "Q02",
        "question":
            "What is the waiting period for cataract treatment?"
    },
    {
        "id": "Q03",
        "question":
            "Are stones in the biliary system covered immediately?"
    },
    {
        "id": "Q04",
        "question":
            "What is the waiting period for stones in the urinary system?"
    },
    {
        "id": "Q05",
        "question":
            "Does the policy cover hospitalization expenses?"
    },
    {
        "id": "Q06",
        "question":
            "Are pre-hospitalization and post-hospitalization expenses covered?"
    },
    {
        "id": "Q07",
        "question":
            "What does the policy say about spondylosis or spondylitis?"
    },
    {
        "id": "Q08",
        "question":
            "What percentage of eligible expenses is covered under the policy?"
    },
    {
        "id": "Q09",
        "question":
            "What benefits are provided under the accident insurance policy?"
    },
    {
        "id": "Q10",
        "question":
            "Does travel insurance cover medical emergencies during a trip?"
    },
]


# ============================================================
# OUTPUT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

RESULTS_DIR = BASE_DIR / "results"

RESULTS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

OUTPUT_FILE = (
    RESULTS_DIR
    / "rag_controlled_10q.json"
)


# ============================================================
# GENERATION SETTINGS
# SAME SETTINGS AS TOP-K EXPERIMENT
# ============================================================

OLLAMA_OPTIONS = {
    "temperature": 0,
    "num_ctx": 2048,
    "num_predict": 256,
}


MAX_CHARS_PER_CHUNK = 1500
MAX_TOTAL_CONTEXT_CHARS = 4000


# ============================================================
# RETRIEVAL
# ============================================================

def retrieve(question):

    start = time.perf_counter()

    response = requests.post(
        RETRIEVAL_URL,

        json={
            "question": question,
            "top_k": 5
        },

        timeout=120
    )

    response.raise_for_status()

    latency = (
        time.perf_counter()
        - start
    )

    data = response.json()

    chunks = data.get(
        "results",
        []
    )

    return chunks, latency


# ============================================================
# CONTEXT
# ============================================================

def prepare_context(chunks):

    parts = []

    for i, chunk in enumerate(
        chunks,
        start=1
    ):

        text = chunk.get(
            "text",
            ""
        ).strip()

        text = text[
            :MAX_CHARS_PER_CHUNK
        ]

        document = chunk.get(
            "document",
            chunk.get(
                "file",
                "unknown"
            )
        )

        page = chunk.get(
            "page",
            "?"
        )

        parts.append(
            f"[Context {i}]\n"
            f"Document: {document}\n"
            f"Page: {page}\n"
            f"{text}"
        )

    context = "\n\n".join(parts)

    return context[
        :MAX_TOTAL_CONTEXT_CHARS
    ]


# ============================================================
# RAG PROMPT
# ============================================================

def build_rag_prompt(
    question,
    context
):

    return f"""You are an insurance policy assistant.

Answer the question using ONLY the policy
context provided below.

If the answer cannot be determined from the
provided context, clearly say that the available
policy documents do not contain enough information.

Do not invent or assume policy terms, waiting
periods, coverage amounts, exclusions, or
conditions.

POLICY CONTEXT:

{context}

QUESTION:

{question}

ANSWER:
"""


# ============================================================
# NO-RAG PROMPT
# ============================================================

def build_no_rag_prompt(question):

    return f"""You are an insurance policy assistant.

Answer the following question as accurately as
possible.

Do NOT use any retrieved policy context.

If you are not certain about a policy-specific
fact, say that you are not certain rather than
inventing a policy term.

Do not fabricate waiting periods, coverage
amounts, exclusions, or conditions.

QUESTION:

{question}

ANSWER:
"""


# ============================================================
# OLLAMA
# ============================================================

def run_model(prompt):

    start = time.perf_counter()

    response = requests.post(

        OLLAMA_URL,

        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,

            "keep_alive": "0",

            "options": OLLAMA_OPTIONS
        },

        timeout=600
    )

    response.raise_for_status()

    data = response.json()

    latency = (
        time.perf_counter()
        - start
    )

    return (
        data.get(
            "response",
            ""
        ).strip(),
        latency,
        data
    )


# ============================================================
# RUN EXPERIMENT
# ============================================================

def main():

    print("=" * 75)
    print(
        "INSUREMATE WEEK 4 - CONTROLLED RAG VS NO-RAG"
    )
    print("=" * 75)

    print()
    print("Model:", MODEL)
    print("Questions:", len(QUESTIONS))
    print("RAG Top-K: 5")
    print("Total evaluations:", len(QUESTIONS) * 2)

    print()
    print(
        "Important: the SAME 10 policy questions "
        "are used for RAG and No-RAG."
    )

    results = []

    total = len(QUESTIONS) * 2
    current = 0


    for item in QUESTIONS:

        qid = item["id"]
        question = item["question"]

        print()
        print("-" * 75)
        print(qid, "|", question)
        print("-" * 75)


        # ====================================================
        # RETRIEVE ONCE
        # ====================================================

        try:

            chunks, retrieval_latency = retrieve(
                question
            )

        except Exception as e:

            print(
                "Retrieval error:",
                e
            )

            raise


        context = prepare_context(
            chunks
        )


        scores = [

            c.get("score")

            for c in chunks

            if isinstance(
                c.get("score"),
                (int, float)
            )
        ]


        average_score = (

            sum(scores) / len(scores)

            if scores

            else None
        )


        top_score = (

            max(scores)

            if scores

            else None
        )


        documents = list(
            dict.fromkeys(

                c.get(
                    "document",
                    c.get(
                        "file",
                        "unknown"
                    )
                )

                for c in chunks
            )
        )


        print(
            "Retrieved chunks:",
            len(chunks)
        )

        print(
            "Average retrieval score:",
            round(
                average_score,
                4
            )
            if average_score is not None
            else "N/A"
        )


        # ====================================================
        # RAG
        # ====================================================

        current += 1

        print()
        print(
            f"[{current}/{total}] RAG"
        )


        rag_prompt = build_rag_prompt(
            question,
            context
        )


        rag_answer, rag_latency, rag_raw = (
            run_model(rag_prompt)
        )


        results.append({

            "question_id":
                qid,

            "question":
                question,

            "model":
                MODEL,

            "condition":
                "RAG",

            "answer":
                rag_answer,

            "latency_seconds":
                round(
                    rag_latency,
                    3
                ),

            "retrieval_latency_seconds":
                round(
                    retrieval_latency,
                    3
                ),

            "prompt_tokens":
                rag_raw.get(
                    "prompt_eval_count"
                ),

            "generated_tokens":
                rag_raw.get(
                    "eval_count"
                ),

            "total_tokens":
                (
                    (
                        rag_raw.get(
                            "prompt_eval_count"
                        ) or 0
                    )
                    +
                    (
                        rag_raw.get(
                            "eval_count"
                        ) or 0
                    )
                ),

            "retrieved_chunks":
                chunks,

            "retrieved_documents":
                documents,

            "average_retrieval_score":
                round(
                    average_score,
                    4
                )
                if average_score is not None
                else None,

            "top_retrieval_score":
                round(
                    top_score,
                    4
                )
                if top_score is not None
                else None,

            "context_characters":
                len(context),

            "status":
                "success"
        })


        print(
            "RAG completed in",
            round(
                rag_latency,
                2
            ),
            "seconds"
        )


        # ====================================================
        # NO-RAG
        # ====================================================

        current += 1

        print()
        print(
            f"[{current}/{total}] NO-RAG"
        )


        no_rag_prompt = build_no_rag_prompt(
            question
        )


        no_rag_answer, no_rag_latency, no_rag_raw = (
            run_model(no_rag_prompt)
        )


        results.append({

            "question_id":
                qid,

            "question":
                question,

            "model":
                MODEL,

            "condition":
                "NO_RAG",

            "answer":
                no_rag_answer,

            "latency_seconds":
                round(
                    no_rag_latency,
                    3
                ),

            "retrieval_latency_seconds":
                0,

            "prompt_tokens":
                no_rag_raw.get(
                    "prompt_eval_count"
                ),

            "generated_tokens":
                no_rag_raw.get(
                    "eval_count"
                ),

            "total_tokens":
                (
                    (
                        no_rag_raw.get(
                            "prompt_eval_count"
                        ) or 0
                    )
                    +
                    (
                        no_rag_raw.get(
                            "eval_count"
                        ) or 0
                    )
                ),

            "retrieved_chunks":
                [],

            "retrieved_documents":
                [],

            "average_retrieval_score":
                None,

            "top_retrieval_score":
                None,

            "context_characters":
                0,

            "status":
                "success"
        })


        print(
            "No-RAG completed in",
            round(
                no_rag_latency,
                2
            ),
            "seconds"
        )


    # ========================================================
    # SAVE
    # ========================================================

    output = {

        "metadata": {

            "experiment":
                "Controlled RAG vs No-RAG",

            "model":
                MODEL,

            "questions":
                len(QUESTIONS),

            "total_evaluations":
                len(results),

            "rag_top_k":
                5,

            "temperature":
                0,

            "same_questions":
                True,

            "same_model":
                True,

            "only_variable":
                "retrieved policy context"
        },

        "results":
            results
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


    print()
    print("=" * 75)
    print("CONTROLLED RAG VS NO-RAG COMPLETED")
    print("=" * 75)

    print()
    print("Evaluations:", len(results))

    print()
    print("Saved to:")
    print(OUTPUT_FILE)

    print("=" * 75)


if __name__ == "__main__":
    main()
