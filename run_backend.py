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
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting PRAMITI All-in-One Engine on http://localhost:{port} (host: {host}) ...")
    print(f"Serving API and built React Frontend on single port {port}.")
    uvicorn.run("app.main:app", host=host, port=port, reload=True, app_dir=str(BACKEND_DIR))
