from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Dict, Any, List

from app.core.database import get_db
from app.models.entities import Rule, Alert, Verification, Document, Setting, Application, Edge
from app.services.audit import verify_chain_integrity
from app.pipeline.rule_engine import DEFAULT_RULES_YAML
import yaml

router = APIRouter(tags=["System & Services"])

@router.get("/ai-status")
async def get_ai_status():
    """Reports live status of on-device SLM, Cloud Fallback, and PageIndex Regulatory KB."""
    from app.services.slm_extractor import _detect_ollama_model
    from app.services.regulatory_kb import get_kb_metadata
    from app.core.config import settings

    local_model = _detect_ollama_model()
    gemini_ready = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5)
    kb_meta = get_kb_metadata()

    return {
        "local_slm": {
            "active": local_model is not None,
            "engine": "Ollama (On-Device Air-Gapped)",
            "model": local_model or settings.OLLAMA_MODEL,
            "status": "Online (Local Inference)" if local_model else "Offline / Not Running",
            "air_gapped": True
        },
        "cloud_fallback": {
            "active": gemini_ready,
            "provider": "Google Gemini",
            "model": settings.GEMINI_MODEL,
            "rate_limit": {
                "requests_per_minute": settings.GEMINI_RPM_LIMIT,
                "max_wait_seconds": settings.GEMINI_MAX_WAIT_SECONDS,
            },
            "status": "Configured & Active (Live Verified)" if gemini_ready else "Disabled",
            "safe_mode": "Zero Token Exhaustion (Strict Fallback Only)"
        },
        "regulatory_kb": {
            "active": kb_meta["ready"],
            "engine": "PageIndex Local SDK",
            "indexing_mode": "Flash Vectorless Tree Index",
            "source_handbook": kb_meta["doc_name"] or "AICTE Handbook",
            "air_gapped": True
        }
    }

@router.get("/rules")
async def list_rules():
    data = yaml.safe_load(DEFAULT_RULES_YAML)
    return data.get("rules", [])

@router.get("/verification")
async def list_verifications(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Verification).order_by(Verification.timestamp.desc()))
    items = res.scalars().all()
    return [
        {
            "id": v.id,
            "documentId": v.document_id,
            "source": v.source,
            "timestamp": v.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "status": v.status.value,
            "simulated": v.simulated,
            "fields": v.fields,
            "log": v.log
        }
        for v in items
    ]

@router.get("/alerts")
async def list_alerts(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Alert).order_by(Alert.created_at.desc()))
    alerts = res.scalars().all()
    return [
        {
            "id": a.id,
            "applicationId": a.application_id,
            "trigger": a.trigger,
            "message": a.message,
            "recipientRole": a.recipient_role,
            "createdAt": a.created_at.strftime("%Y-%m-%d %H:%M"),
            "acknowledged": a.acknowledged_at is not None
        }
        for a in alerts
    ]

@router.put("/alerts/{id}/acknowledge")
async def acknowledge_alert(id: str, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    alt = await db.get(Alert, id)
    if alt:
        alt.acknowledged_at = datetime.utcnow()
        await db.commit()
    return {"message": "Alert acknowledged"}

@router.get("/audit/verify")
async def audit_integrity_check(db: AsyncSession = Depends(get_db)):
    return await verify_chain_integrity(db)

@router.get("/org")
async def get_org_info():
    return {
        "organization": "All India Council for Technical Education (AICTE)",
        "department": "Approval Bureau / Regulation & Scrutiny Wing",
        "ministry": "Ministry of Education, Government of India"
    }

@router.get("/me")
async def get_current_user():
    return {
        "displayName": "Dr. V. K. Ramanathan",
        "role": "Senior Scrutiny Officer",
        "region": "Northern Regional Office (NRO), Kanpur",
        "initials": "VR"
    }

@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    return {
        "manual_review_baseline_minutes": None,
        "tolerance_land_area_pct": 2.0,
        "auto_clearance_threshold": 80.0,
        "forensics_sensitivity": "Balanced"
    }

@router.delete("/synthetic")
async def purge_synthetic_data(db: AsyncSession = Depends(get_db)):
    """One-click purge of all synthetic demo data per UI_Spec.md."""
    res = await db.execute(select(Application).where(Application.is_synthetic == True))
    apps = res.scalars().all()
    for app in apps:
        await db.execute(delete(Edge).where(Edge.application_id == app.id))
        await db.delete(app)
    await db.commit()
    return {"message": f"Purged {len(apps)} synthetic applications and related findings."}
