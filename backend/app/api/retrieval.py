from fastapi import APIRouter
from pydantic import BaseModel

from app.services.retrieval_service import retrieve


router = APIRouter()


class RetrievalRequest(BaseModel):
    question: str
    top_k: int = 5


@router.post("/search")
def search_documents(request: RetrievalRequest):

    results = retrieve(
        request.question,
        request.top_k
    )

    return {
        "question": request.question,
        "results": results
    }
