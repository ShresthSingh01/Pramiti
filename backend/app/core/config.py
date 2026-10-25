from pydantic_settings import BaseSettings
from pathlib import Path
import sys

# Canonical project directory hierarchy
APP_DIR = Path(__file__).resolve().parent.parent        # d:\SIH26\backend\app
BACKEND_DIR = APP_DIR.parent                            # d:\SIH26\backend
ROOT_DIR = BACKEND_DIR.parent                           # d:\SIH26

# Ensure both ROOT_DIR and BACKEND_DIR are always in Python's module search path
for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

class Settings(BaseSettings):
    PROJECT_NAME: str = "PRAMITI"
    API_V1_PREFIX: str = "/api"
    ROOT_PATH: Path = ROOT_DIR
    BACKEND_PATH: Path = BACKEND_DIR
    SAMPLE_DOCS_DIR: Path = ROOT_DIR / "sample_documents"
    STORAGE_DIR: Path = BACKEND_DIR / "storage"
    DOCUMENTS_DIR: Path = BACKEND_DIR / "storage" / "documents"
    DATABASE_PATH: Path = BACKEND_DIR / "evidencegraph.db"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BACKEND_DIR.as_posix()}/evidencegraph.db"
    JWT_SECRET: str = "evidencegraph-dev-super-secret-key-aicte-sih-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_RPM_LIMIT: int = 10
    GEMINI_MAX_WAIT_SECONDS: float = 15.0
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    HANDBOOK_DIR: Path = ROOT_DIR / "aicte_handbook"
    HANDBOOK_INDEX_DIR: Path = ROOT_DIR / "aicte_handbook" / "index_cache"

    class Config:
        env_file = (str(BACKEND_DIR / ".env"), str(ROOT_DIR / ".env"))
        extra = "allow"

settings = Settings()
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_DOCS_DIR.mkdir(parents=True, exist_ok=True)
settings.HANDBOOK_DIR.mkdir(parents=True, exist_ok=True)
settings.HANDBOOK_INDEX_DIR.mkdir(parents=True, exist_ok=True)
