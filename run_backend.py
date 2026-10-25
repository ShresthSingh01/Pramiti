import os
import sys
from pathlib import Path
import subprocess

# Canonical paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"

# If invoked using global or external Python, automatically respawn within the backend venv
if VENV_PYTHON.exists() and Path(sys.executable).resolve() != VENV_PYTHON.resolve():
    sys.exit(subprocess.call([str(VENV_PYTHON), str(Path(__file__).resolve())] + sys.argv[1:]))

import uvicorn

for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if __name__ == "__main__":
    print(f"Starting PRAMITI Backend from {ROOT_DIR} on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, app_dir=str(BACKEND_DIR))
