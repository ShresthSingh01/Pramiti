"""
Authentication and Role-Based Access Control (RBAC) Module for AICTE Scrutiny Platform.
Built using standard library (hmac, hashlib, base64, json) for zero-dependency reliability.
"""
import hmac
import hashlib
import base64
import json
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

SECRET_KEY = b"aicte-sih-2026-evidence-graph-secured-key"
TOKEN_EXPIRY_SECONDS = 3600 * 12  # 12 hour session

# Hash passwords with standard hashlib sha256 + salt
def _hash_pw(password: str) -> str:
    return hashlib.sha256((password + "aicte_salt_2026").encode()).hexdigest()

DEMO_USERS = {
    "officer": {
        "username": "officer",
        "full_name": "Er. Rajesh Verma (Scrutiny Officer)",
        "role": "scrutiny_officer",
        "password_hash": _hash_pw("aicte2026")
    },
    "admin": {
        "username": "admin",
        "full_name": "Dr. Sunita Murthy (Regional Director)",
        "role": "admin_officer",
        "password_hash": _hash_pw("aicte2026")
    }
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)
router = APIRouter(prefix="/auth", tags=["Authentication"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    username: str

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _b64url_decode(s: str) -> bytes:
    padding = '=' * (4 - (len(s) % 4)) if (len(s) % 4) != 0 else ''
    return base64.urlsafe_b64decode(s + padding)

def create_access_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + TOKEN_EXPIRY_SECONDS
    h_b64 = _b64url_encode(json.dumps(header).encode())
    p_b64 = _b64url_encode(json.dumps(payload_copy).encode())
    signing_input = f"{h_b64}.{p_b64}".encode()
    signature = hmac.new(SECRET_KEY, signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{h_b64}.{p_b64}.{sig_b64}"

def verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        h_b64, p_b64, sig_b64 = parts
        signing_input = f"{h_b64}.{p_b64}".encode()
        expected_sig = hmac.new(SECRET_KEY, signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(p_b64).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

@router.post("/token", response_model=TokenResponse)
@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None)
):
    username = None
    password = None

    if form_data and form_data.username:
        username = form_data.username
        password = form_data.password
    else:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                username = body.get("username")
                password = body.get("password")
            except Exception:
                pass

        if not username or not password:
            try:
                form = await request.form()
                username = form.get("username")
                password = form.get("password")
            except Exception:
                pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorized Officer ID (username) and Passkey (password) are required.",
        )

    clean_user = str(username).strip().lower()
    clean_pw = str(password).strip()

    user = DEMO_USERS.get(clean_user)
    if not user or _hash_pw(clean_pw) != user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. AICTE authorized personnel only.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "full_name": user["full_name"],
        "username": user["username"]
    }

@router.get("/me")
async def get_current_user_profile(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Session expired or token missing")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token signature or expired")
    username = payload.get("sub")
    user = DEMO_USERS.get(username)
    if not user:
        raise HTTPException(status_code=401, detail="User identity invalid")
    return {
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"]
    }
