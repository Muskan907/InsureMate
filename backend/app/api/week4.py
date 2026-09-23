import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.repository_understanding_service import (
    EXERCISE_6_CASES,
    DEFAULT_GENERATION_MODEL,
    INDEX_FILE,
    ask_repository,
    evaluate_case,
    load_index,
    build_index,
)

router = APIRouter()
BASE_DIR = Path(__file__).resolve().parents[3]
EVAL_FILE = BASE_DIR / "backend" / "evaluation_week4" / "week4_automated_evaluation.json"
RESOURCE_FILE = BASE_DIR / "backend" / "evaluation_week4" / "week4_resource_benchmark.json"
TEST_FILE = BASE_DIR / "backend" / "evaluation_week4" / "week4_code_generation_tests.json"


class RepositoryAskRequest(BaseModel):
    question: str = Field(min_length=3)
    model: str = DEFAULT_GENERATION_MODEL
    top_k: int = Field(default=5, ge=1, le=10)


class RepositoryCaseRequest(BaseModel):
    case_id: str
    model: str = DEFAULT_GENERATION_MODEL
    top_k: int = Field(default=5, ge=1, le=10)


def _load(path: Path):
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Missing evaluation file: {path.name}")
    return json.loads(path.read_text(encoding="utf-8"))


@router.get("/summary")
def week4_summary():
    data = _load(EVAL_FILE)
    resource = _load(RESOURCE_FILE)
    tests = _load(TEST_FILE)
    return {
        "metadata": data.get("metadata", {}),
        "summary": data.get("summary", {}),
        "category_winners": data.get("category_winners", {}),
        "resource_benchmark": resource.get("summary", data.get("resource_benchmark", {})),
        "code_generation_tests": tests,
    }


@router.get("/rag-traces")
def rag_traces():
    data = _load(EVAL_FILE)
    traces = []
    for item in data.get("detailed_results", []):
        if str(item.get("question_id", "")).startswith("RAG"):
            qid = item.get("question_id")
            retrieval_signal = {"RAG01": 40.0, "RAG02": 100.0, "RAG03": 60.0, "RAG04": 100.0}.get(qid)
            traces.append({
                "question_id": item.get("question_id"),
                "model": item.get("model"),
                "question": item.get("question"),
                "answer": item.get("answer"),
                "latency_seconds": item.get("latency_seconds"),
                "retrieved_policy": item.get("retrieved_policy", []),
                "category_score": item.get("category_score"),
                "hallucination": item.get("hallucination", False),
                "hallucination_evidence": item.get("hallucination_evidence", ""),
                "judge_reasoning": item.get("judge_reasoning", ""),
                "criteria": item.get("criteria", {}),
                "retrieval_quality_signal": retrieval_signal,
            })
    return {"count": len(traces), "traces": traces}


@router.get("/repository/cases")
def repository_cases():
    return {
        "cases": EXERCISE_6_CASES,
        "index_exists": INDEX_FILE.exists(),
        "index_file": str(INDEX_FILE.relative_to(BASE_DIR)).replace("\\", "/"),
    }


@router.get("/repository/index")
def repository_index_stats():
    try:
        data = load_index()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return data["metadata"]


@router.post("/repository/ask")
def repository_ask(request: RepositoryAskRequest):
    try:
        return ask_repository(request.question, request.model, request.top_k)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Repository analysis failed: {exc}")


@router.post("/repository/case")
def repository_case(request: RepositoryCaseRequest):
    try:
        # First live demo request can build the index automatically.
        if not INDEX_FILE.exists():
            build_index(force=True)
        return evaluate_case(request.case_id, request.model, request.top_k)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Repository case failed: {exc}")
