"""
Regulatory Knowledge & AICTE Handbook Scrutiny Endpoints.
Powered by PageIndex Local SDK and Local SLM.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.regulatory_kb import (
    query_handbook, is_kb_ready, init_regulatory_kb, get_kb_metadata
)

router = APIRouter(prefix="/regulatory", tags=["Regulatory Knowledge Base"])

class HandbookQueryRequest(BaseModel):
    question: str

class HandbookQueryResponse(BaseModel):
    available: bool
    question: str
    answer: str
    node_title: Optional[str] = None
    page: Optional[int] = None
    doc_name: Optional[str] = None
    engine: Optional[str] = None
    sources: List[Dict[str, Any]] = []

@router.get("/status")
async def get_regulatory_status():
    """Returns status of PageIndex AICTE Handbook knowledge base."""
    meta = get_kb_metadata()
    if not meta["ready"]:
        init_regulatory_kb()
        meta = get_kb_metadata()

    return {
        "ready": meta["ready"],
        "doc_name": meta["doc_name"],
        "page_count": meta["page_count"],
        "node_count": meta["node_count"],
        "engine": "PageIndex Local SDK (Flash Hierarchical Tree Search)",
        "air_gapped": True,
        "data_leaves_device": False
    }

@router.post("/query", response_model=HandbookQueryResponse)
async def query_aicte_handbook(req: HandbookQueryRequest):
    """
    Search and reason across the AICTE Approval Process Handbook (APH)
    using PageIndex hierarchical tree search.
    """
    if not req.question or len(req.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Query string is too short.")

    res = query_handbook(req.question.strip())
    return res

@router.get("/quick-checks")
async def get_quick_checks():
    """
    Returns standard statutory thresholds from the handbook for instant officer review.
    """
    queries = [
        ("Land Area Norms (Rural vs Metro)", "What is the minimum land area required for technical institutions in rural vs metro cities?"),
        ("Instructional Built-Up Area", "What is the minimum built-up instructional area required for undergraduate engineering intake?"),
        ("Student to Faculty Ratio (SFR)", "What is the required faculty cadre ratio and student to faculty ratio for degree engineering?"),
        ("Affiliation Continuity", "What is the statutory requirement for active university affiliation and NOC?"),
        ("E-Stamping & Affidavit", "What are the stamp duty and deponent requirements for statutory affidavits?")
    ]

    results = []
    for title, q in queries:
        res = query_handbook(q)
        results.append({
            "title": title,
            "question": q,
            "answer": res.get("answer"),
            "page": res.get("page"),
            "section": res.get("node_title"),
            "engine": res.get("engine")
        })

    meta = get_kb_metadata()
    return {
        "handbook": meta.get("doc_name") or "AICTE Handbook",
        "checks": results
    }
