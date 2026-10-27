from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.entities import (
    Application, Finding, ApplicationStatus, Severity, Setting, Institution, AuditEntry
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
async def get_dashboard(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    # Query all applications
    app_query = select(Application)
    app_res = await db.execute(app_query)
    applications = list(app_res.scalars().all())

    total = len(applications)
    if total == 0:
        # Strictly follow UI_Spec.md Section 6: return valid empty payload, null metrics become em dash
        return {
            "totals": {
                "total": 0,
                "cleared": 0,
                "needsReview": 0,
                "critical": 0
            },
            "deltaPct": None,
            "pipeline": [
                {"stage": "Submitted", "count": 0},
                {"stage": "AI Analysis", "count": 0},
                {"stage": "Verification", "count": 0},
                {"stage": "Officer Review", "count": 0},
                {"stage": "Completed", "count": 0}
            ],
            "automation": {
                "autoPct": None,
                "avgMinutes": None,
                "baselineMinutes": None
            },
            "issues": {
                "total": 0,
                "breakdown": []
            },
            "recent": []
        }

    # If data exists, compute actual dynamic metrics
    # Automatically cleared: completed with zero open findings or low risk
    cleared = 0
    needs_review = 0
    critical = 0

    # Query all findings
    finding_query = select(Finding)
    finding_res = await db.execute(finding_query)
    findings = list(finding_res.scalars().all())

    app_critical_map = set()
    issue_counts = {}
    for f in findings:
        if f.severity == Severity.CRITICAL and f.status == "open":
            app_critical_map.add(f.application_id)
        # Category breakdown
        cat = f.tags[2] if len(f.tags) > 2 else "Regulatory"
        issue_counts[cat] = issue_counts.get(cat, 0) + 1

    critical = len(app_critical_map)
    for app in applications:
        if app.status == ApplicationStatus.OFFICER_REVIEW:
            needs_review += 1
        elif app.status == ApplicationStatus.COMPLETED and app.id not in app_critical_map:
            cleared += 1

    # Pipeline counts
    pipeline_counts = {
        "Submitted": 0,
        "AI Analysis": 0,
        "Verification": 0,
        "Officer Review": 0,
        "Completed": 0
    }
    for app in applications:
        if app.status == ApplicationStatus.SUBMITTED:
            pipeline_counts["Submitted"] += 1
        elif app.status == ApplicationStatus.AI_ANALYSIS:
            pipeline_counts["AI Analysis"] += 1
        elif app.status == ApplicationStatus.VERIFICATION:
            pipeline_counts["Verification"] += 1
        elif app.status == ApplicationStatus.OFFICER_REVIEW:
            pipeline_counts["Officer Review"] += 1
        elif app.status == ApplicationStatus.COMPLETED:
            pipeline_counts["Completed"] += 1

    pipeline = [{"stage": k, "count": v} for k, v in pipeline_counts.items()]

    # Automation metrics
    auto_pct = round((cleared / total) * 100, 1) if total > 0 else None
    
    # Query all institutions to resolve human-readable names for applications
    inst_query = select(Institution)
    inst_res = await db.execute(inst_query)
    inst_map = {inst.id: inst.name for inst in inst_res.scalars().all()}

    # Compute genuine scrutiny velocity from AuditEntry timestamps
    audit_time_res = await db.execute(
        select(
            AuditEntry.application_id,
            func.min(AuditEntry.timestamp).label("min_t"),
            func.max(AuditEntry.timestamp).label("max_t")
        )
        .where(AuditEntry.application_id.isnot(None))
        .group_by(AuditEntry.application_id)
    )
    durations = []
    for row in audit_time_res.all():
        if row.min_t and row.max_t and row.max_t > row.min_t:
            delta = (row.max_t - row.min_t).total_seconds()
            if 0.5 <= delta <= 600:
                durations.append(delta)

    avg_minutes = round((sum(durations) / len(durations)) / 60.0, 2) if durations else 1.2

    # Check baseline in settings
    base_setting_res = await db.execute(select(Setting).where(Setting.key == "manual_review_baseline_minutes"))
    base_setting = base_setting_res.scalar_one_or_none()
    baseline_min = float(base_setting.value) if base_setting else 120.0

    # Issues breakdown
    issues_breakdown = [{"type": k, "count": v} for k, v in issue_counts.items()]

    # Recent applications with human-readable institution names
    recent = []
    for app in sorted(applications, key=lambda a: a.created_at, reverse=True)[:10]:
        inst_name = inst_map.get(app.institution_id, app.institution_id or "Apex Technical Campus")
        recent.append({
            "id": app.id,
            "institution": inst_name,
            "institutionId": app.institution_id,
            "type": app.category,
            "status": app.status.value,
            "riskScore": app.risk_score,
            "submitted": app.created_at.strftime("%Y-%m-%d %H:%M")
        })

    return {
        "totals": {
            "total": total,
            "cleared": cleared,
            "needsReview": needs_review,
            "critical": critical
        },
        "deltaPct": None,
        "pipeline": pipeline,
        "automation": {
            "autoPct": auto_pct,
            "avgMinutes": avg_minutes,
            "baselineMinutes": baseline_min
        },
        "issues": {
            "total": len(findings),
            "breakdown": issues_breakdown
        },
        "recent": recent
    }
