import os
import sys
from pathlib import Path

# Ensure backend and project root directories are in sys.path
_backend_dir = Path(__file__).resolve().parent.parent
_root_dir = _backend_dir.parent
for _p in [str(_backend_dir), str(_root_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.api import dashboard, applications, misc, admin, sample_dossiers, regulatory, auth
from app.services.regulatory_kb import init_regulatory_kb
import asyncio

app = FastAPI(
    title="PRAMITI API",
    description="Verifiable Evidence Intelligence for AICTE Approval Process (SIH PS 26261)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.DOCUMENTS_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=str(settings.DOCUMENTS_DIR)), name="files")

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        def _check_and_add_cols(connection):
            try:
                cursor = connection.connection.cursor()
                cursor.execute("PRAGMA table_info(applications)")
                existing_cols = {row[1] for row in cursor.fetchall()}
                for col, ctype in [
                    ("decision", "VARCHAR(100)"),
                    ("decision_remarks", "TEXT"),
                    ("decision_by", "VARCHAR(100)"),
                    ("decision_at", "DATETIME")
                ]:
                    if col not in existing_cols:
                        cursor.execute(f"ALTER TABLE applications ADD COLUMN {col} {ctype}")
            except Exception:
                pass
        await conn.run_sync(_check_and_add_cols)
    # Asynchronously initialize PageIndex Regulatory Knowledge Base
    asyncio.create_task(asyncio.to_thread(init_regulatory_kb))

app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(misc.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(sample_dossiers.router, prefix="/api")
app.include_router(regulatory.router, prefix="/api")

@app.get("/api/health")
@app.get("/api/status")
async def api_status():
    return {
        "system": "PRAMITI AICTE Scrutiny Engine",
        "status": "online",
        "regulatory_version": "APH 2025-26",
        "mode": "Zero-Mock Data Driven"
    }

# Serve frontend build if available
frontend_dist = settings.ROOT_PATH / "frontend" / "dist"
if (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "system": "PRAMITI AICTE Scrutiny Engine",
            "status": "online",
            "regulatory_version": "APH 2025-26",
            "mode": "Zero-Mock Data Driven",
            "note": "Frontend build not detected in frontend/dist. Run 'npm run build' in frontend directory."
        }
