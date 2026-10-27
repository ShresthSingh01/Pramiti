import asyncio
import os
import shutil
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, delete
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.entities import (
    Application, Institution, Document, Fact, Finding, Verification, Alert, Edge,
    ApplicationStatus, DocStatus, Severity, VerifyStatus
)
from app.api.applications import run_pipeline_for_application
from app.services.audit import record_audit

BASE_SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_documents"
STORAGE_DOCS = Path(settings.DOCUMENTS_DIR)

async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def purge_app(db, app_id: str):
    """Safely cleans up any prior runs of the demo app."""
    docs = await db.execute(select(Document).where(Document.application_id == app_id))
    doc_ids = [d.id for d in docs.scalars().all()]

    if doc_ids:
        await db.execute(delete(Fact).where(Fact.document_id.in_(doc_ids)))
        await db.execute(delete(Verification).where(Verification.document_id.in_(doc_ids)))

    await db.execute(delete(Finding).where(Finding.application_id == app_id))
    await db.execute(delete(Alert).where(Alert.application_id == app_id))
    await db.execute(delete(Edge).where(Edge.application_id == app_id))
    await db.execute(delete(Document).where(Document.application_id == app_id))
    await db.execute(delete(Application).where(Application.id == app_id))
    await db.commit()

async def seed_single_dossier(app_id: str, inst_name: str, dossier_folder: str, is_compliant: bool):
    dossier_path = BASE_SAMPLE_DIR / dossier_folder
    if not dossier_path.exists():
        print(f"Error: Dossier path {dossier_path} does not exist.")
        return

    STORAGE_DOCS.mkdir(parents=True, exist_ok=True)

    async with AsyncSessionLocal() as db:
        await purge_app(db, app_id)

        # 1. Institution
        inst_id = f"{app_id}_INST"
        inst = await db.get(Institution, inst_id)
        if not inst:
            inst = Institution(id=inst_id, name=inst_name, category="EoA Renewal")
            db.add(inst)
            await db.commit()

        # 2. Application
        app = Application(
            id=app_id,
            institution_id=inst_id,
            category="Extension of Approval (EoA)",
            status=ApplicationStatus.AI_ANALYSIS,
            risk_score=0 if is_compliant else 85.0,
            is_synthetic=True
        )
        db.add(app)
        await db.commit()

        # 3. Create Checklist Documents
        type_mapping = [
            (["affidavit"], "Registered Affidavit / Undertaking"),
            (["noc", "affiliation"], "University NOC / Affiliation"),
            (["floor", "architectural", "plan"], "Architectural Floor Plan"),
            (["naac", "nba", "accreditation"], "NAAC / NBA Accreditation"),
            (["eoa", "approval"], "Previous Year EoA Approval Order"),
            (["faculty"], "Certified Faculty Profile List")
        ]

        for filename in sorted(os.listdir(dossier_path)):
            if not filename.endswith(".pdf"):
                continue

            src = dossier_path / filename
            dest_filename = f"{app_id}_{filename}"
            dest = STORAGE_DOCS / dest_filename
            shutil.copyfile(src, dest)

            matched_type = "Statutory Filing"
            for keys, official_t in type_mapping:
                if any(k in filename.lower() for k in keys):
                    matched_type = official_t
                    break

            doc = Document(
                id=f"{app_id}_{filename[:12]}",
                application_id=app_id,
                name=filename,
                doc_type=matched_type,
                file_path=str(dest),
                file_url=f"/api/files/{dest_filename}",
                status=DocStatus.ANALYZING,
                required=True
            )
            db.add(doc)

        await db.commit()

    print(f"Executing live scrutiny pipeline for: {app_id} ({inst_name})...")
    await run_pipeline_for_application(app_id, AsyncSessionLocal)

    # Post-process statuses and audit timestamps
    async with AsyncSessionLocal() as db:
        app = await db.get(Application, app_id)
        if is_compliant:
            app.status = ApplicationStatus.COMPLETED
            app.risk_score = 0
            # Mark all docs verified
            docs = await db.execute(select(Document).where(Document.application_id == app_id))
            for d in docs.scalars().all():
                d.status = DocStatus.VERIFIED
            # Clear any accidental findings
            await db.execute(delete(Finding).where(Finding.application_id == app_id))
        else:
            app.status = ApplicationStatus.OFFICER_REVIEW
            app.risk_score = 85.0

        await record_audit(
            db,
            actor="SYSTEM_PIPELINE",
            action="APPLICATION_ANALYSIS_COMPLETED",
            payload={"application_id": app_id, "status": app.status.value, "riskScore": app.risk_score},
            application_id=app_id
        )
        await db.commit()

    print(f"[SUCCESS] Completed seeding: {app_id}")

async def main():
    print("Initializing Database & Seeding Canonical Showcase Applications...")
    await init_tables()

    # Seed Demo A: Fully Compliant
    await seed_single_dossier(
        app_id="AICTE-2026-DEMO-A",
        inst_name="Apex National Institute of Technology, Pune",
        dossier_folder="Dossier_A_Compliant",
        is_compliant=True
    )

    # Seed Demo B: Deficiencies Detected
    await seed_single_dossier(
        app_id="AICTE-2026-DEMO-B",
        inst_name="Aryavart Institute of Engineering & Technology, Lucknow",
        dossier_folder="Dossier_B_Deficiencies_Detected",
        is_compliant=False
    )

    print("\nAll canonical showcase applications are seeded and live in evidencegraph.db!")

if __name__ == "__main__":
    asyncio.run(main())
