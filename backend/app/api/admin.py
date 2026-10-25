from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import shutil

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.models.entities import Application, Institution, Document, DocStatus, ApplicationStatus
from app.api.applications import run_pipeline_for_document
from app.pipeline.doc_generator import generate_professional_documents

router = APIRouter(prefix="/admin", tags=["Admin Tools"])

@router.post("/generate-synthetic")
async def generate_synthetic_application(
    app_id: str = Query(...),
    institution_name: str = Query(...),
    inject_defects: bool = Query(True),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    # 1. Generate real PDFs
    temp_dir = str(settings.STORAGE_DIR / "synthetic" / app_id)
    docs_created = generate_professional_documents(temp_dir, institution_name, has_anomalies=inject_defects)

    dest_dir = str(settings.DOCUMENTS_DIR)
    os.makedirs(dest_dir, exist_ok=True)

    mapping = [
        ("Registered Affidavit / Undertaking", docs_created.get("affidavit")),
        ("University NOC / Affiliation", docs_created.get("noc")),
        ("Architectural Floor Plan", docs_created.get("floorplan")),
        ("NAAC / NBA Accreditation", docs_created.get("accreditation")),
        ("Previous Year EoA Approval Order", docs_created.get("eoa")),
        ("Certified Faculty Profile List", docs_created.get("faculty")),
    ]

    for doc_type, src_path in mapping:
        if src_path and os.path.exists(src_path):
            filename = os.path.basename(src_path)
            dest_path = os.path.join(dest_dir, f"{app_id}_{filename}")
            shutil.copyfile(src_path, dest_path)

            # Look up doc in checklist
            res = await db.execute(select(Document).where(Document.application_id == app_id, Document.doc_type == doc_type))
            doc = res.scalar_one_or_none()
            if doc:
                doc.file_path = dest_path
                doc.file_url = f"/api/files/{os.path.basename(dest_path)}"
                doc.name = filename
                await db.commit()

                # Dispatch validation pipeline
                background_tasks.add_task(run_pipeline_for_document, doc.id, app_id, AsyncSessionLocal)

    return {"message": "Synthetic documents generated and queued for AI scrutiny."}
