from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import os
import shutil
import uuid

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.models.entities import Application, Institution, Document, DocStatus, ApplicationStatus
from app.api.applications import run_pipeline_for_document, run_pipeline_for_application
from tools.generate_showcase_documents import generate_all_showcase_dossiers

router = APIRouter(prefix="/sample-dossiers", tags=["Sample Dossiers"])

BASE_SAMPLE_DIR = str(settings.SAMPLE_DOCS_DIR)
STORAGE_DOCS = str(settings.DOCUMENTS_DIR)

class CreateWithDossierRequest(BaseModel):
    app_id: str
    institution_name: str
    category: str = "EoA Renewal"
    dossier_id: str

@router.get("")
async def list_sample_dossiers():
    """Lists available pre-generated professional sample dossiers."""
    if not os.path.exists(BASE_SAMPLE_DIR) or len(os.listdir(BASE_SAMPLE_DIR)) == 0:
        generate_all_showcase_dossiers(BASE_SAMPLE_DIR)

    dossiers = []
    for item in os.listdir(BASE_SAMPLE_DIR):
        folder_path = os.path.join(BASE_SAMPLE_DIR, item)
        if os.path.isdir(folder_path):
            files = [f for f in os.listdir(folder_path) if f.endswith(".pdf")]
            dossiers.append({
                "id": item,
                "title": item.replace("_", " "),
                "path": folder_path,
                "fileCount": len(files),
                "files": [
                    {
                        "filename": f,
                        "url": f"/api/sample-dossiers/files/{item}/{f}",
                        "name": f.replace(".pdf", "").replace("_", " ")
                    }
                    for f in sorted(files)
                ]
            })
    return dossiers

@router.get("/files/{dossier_id}/{filename}")
async def get_dossier_file(dossier_id: str, filename: str):
    file_path = os.path.join(BASE_SAMPLE_DIR, dossier_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Showcase file not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)

@router.post("/create-and-ingest")
async def create_application_with_dossier(
    req: CreateWithDossierRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates an application and ingests all documents from the chosen showcase dossier,
    immediately initiating real-time OCR, verification, and regulatory rule engine scrutiny.
    """
    app_id = req.app_id
    inst_name = req.institution_name
    category = req.category
    dossier_id = req.dossier_id

    dossier_dir = os.path.join(BASE_SAMPLE_DIR, dossier_id)
    if not os.path.exists(dossier_dir):
        raise HTTPException(status_code=404, detail=f"Dossier {dossier_id} not found")

    # 1. Create or get Institution
    inst_id = f"{app_id}_INST"
    inst = await db.get(Institution, inst_id)
    if not inst:
        inst = Institution(id=inst_id, name=inst_name, category=category)
        db.add(inst)
        await db.commit()

    # 2. Create Application
    app = await db.get(Application, app_id)
    if not app:
        app = Application(
            id=app_id,
            institution_id=inst_id,
            category=category,
            status=ApplicationStatus.SUBMITTED,
            is_synthetic=True
        )
        db.add(app)
        await db.commit()

    # 3. Create 6 checklist items
    required_docs = [
        "Registered Affidavit / Undertaking",
        "University NOC / Affiliation",
        "Architectural Floor Plan",
        "NAAC / NBA Accreditation",
        "Previous Year EoA Approval Order",
        "Certified Faculty Profile List"
    ]
    for rd in required_docs:
        existing = await db.execute(select(Document).where(Document.application_id == app_id, Document.doc_type == rd))
        if not existing.scalar_one_or_none():
            d = Document(
                id=f"{app_id}_{rd[:4].strip()}",
                application_id=app_id,
                name=rd,
                doc_type=rd,
                status=DocStatus.MISSING,
                required=True
            )
            db.add(d)
    await db.commit()

    # 4. Ingest and trigger pipeline
    type_mapping = [
        (["affidavit"], "Registered Affidavit / Undertaking"),
        (["noc", "affiliation"], "University NOC / Affiliation"),
        (["floor", "architectural", "plan"], "Architectural Floor Plan"),
        (["naac", "nba", "accreditation"], "NAAC / NBA Accreditation"),
        (["eoa", "approval"], "Previous Year EoA Approval Order"),
        (["faculty"], "Certified Faculty Profile List")
    ]

    os.makedirs(STORAGE_DOCS, exist_ok=True)
    loaded_count = 0

    for filename in os.listdir(dossier_dir):
        if not filename.endswith(".pdf"):
            continue

        src_path = os.path.join(dossier_dir, filename)
        dest_filename = f"{app_id}_{filename}"
        dest_path = os.path.join(STORAGE_DOCS, dest_filename)
        shutil.copyfile(src_path, dest_path)

        matched_type = None
        fname_lower = filename.lower()
        for keywords, official_name in type_mapping:
            if any(k in fname_lower for k in keywords):
                matched_type = official_name
                break

        if matched_type:
            res = await db.execute(select(Document).where(Document.application_id == app_id, Document.doc_type == matched_type))
            doc = res.scalars().first()
            if not doc:
                doc = Document(
                    id=f"{app_id}_{uuid.uuid4().hex[:8]}",
                    application_id=app_id,
                    name=filename,
                    doc_type=matched_type,
                    status=DocStatus.ANALYZING,
                    required=True
                )
                db.add(doc)
            doc.file_path = dest_path
            doc.file_url = f"/api/files/{dest_filename}"
            doc.name = filename
            doc.status = DocStatus.ANALYZING
            loaded_count += 1

    app.status = ApplicationStatus.AI_ANALYSIS
    await db.commit()

    # Run batch pipeline once across all application documents (prevents SQLite lock contention)
    background_tasks.add_task(run_pipeline_for_application, app_id, AsyncSessionLocal)

    return {
        "app_id": app_id,
        "message": f"Successfully ingested {loaded_count} professional documents. Scrutiny pipeline running.",
        "status": "processing"
    }

@router.post("/load-into-app")
async def load_dossier_into_application(
    app_id: str = Query(...),
    dossier_id: str = Query(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests all files from the selected sample dossier into the specified application,
    triggering OCR, verification, rule engine, and evidence graph computation.
    """
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    dossier_dir = os.path.join(BASE_SAMPLE_DIR, dossier_id)
    if not os.path.exists(dossier_dir):
        raise HTTPException(status_code=404, detail="Sample dossier not found on server")

    type_mapping = [
        (["affidavit"], "Registered Affidavit / Undertaking"),
        (["noc", "affiliation"], "University NOC / Affiliation"),
        (["floor", "architectural", "plan"], "Architectural Floor Plan"),
        (["naac", "nba", "accreditation"], "NAAC / NBA Accreditation"),
        (["eoa", "approval"], "Previous Year EoA Approval Order"),
        (["faculty"], "Certified Faculty Profile List")
    ]

    os.makedirs(STORAGE_DOCS, exist_ok=True)
    loaded_count = 0

    for filename in os.listdir(dossier_dir):
        if not filename.endswith(".pdf"):
            continue
        
        src_path = os.path.join(dossier_dir, filename)
        dest_filename = f"{app_id}_{filename}"
        dest_path = os.path.join(STORAGE_DOCS, dest_filename)
        shutil.copyfile(src_path, dest_path)

        matched_type = None
        fname_lower = filename.lower()
        for keywords, official_name in type_mapping:
            if any(k in fname_lower for k in keywords):
                matched_type = official_name
                break

        if matched_type:
            res = await db.execute(select(Document).where(Document.application_id == app_id, Document.doc_type == matched_type))
            doc = res.scalars().first()
            if not doc:
                doc = Document(
                    id=f"{app_id}_{uuid.uuid4().hex[:8]}",
                    application_id=app_id,
                    name=filename,
                    doc_type=matched_type,
                    status=DocStatus.ANALYZING,
                    required=True
                )
                db.add(doc)
            doc.file_path = dest_path
            doc.file_url = f"/api/files/{dest_filename}"
            doc.name = filename
            doc.status = DocStatus.ANALYZING
            loaded_count += 1

    app.status = ApplicationStatus.AI_ANALYSIS
    await db.commit()

    # Run batch pipeline once across all application documents (prevents SQLite lock contention)
    background_tasks.add_task(run_pipeline_for_application, app_id, AsyncSessionLocal)

    return {"message": f"Successfully ingested {loaded_count} regulatory documents into {app_id}. Ingestion pipeline triggered."}
