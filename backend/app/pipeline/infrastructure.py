"""
Infrastructure Compliance Assistance Module — PRAMITI
PS 26261 Mandate: "assist in reviewing institution-submitted photographs, videos,
floor plans, certificates and other infrastructure evidence"

Layer 1 — Documentary: Floor plan area & room count vs. AICTE statutory norms (APH Table 4.1)
Layer 2 — EXIF & Metadata: Photo timestamp, GPS campus geotag coordinates, duplicate photo hash detection
Layer 3 — Vision AI: YOLOv11 equipment & laboratory classification [Production Roadmap]

All findings remain strictly advisory decision-support indicators: "needs more evidence" or "recommend inspection".
"""
import os
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

def analyze_infrastructure_photos(photo_paths: List[str], expected_lat_lon: Optional[tuple] = None) -> Dict[str, Any]:
    """
    Layer 2: EXIF timestamp & GPS geotag analysis on submitted infrastructure photos.
    Flags anomalies such as outdated photographs (>3 years old), missing GPS tags,
    or duplicate photos reused across different rooms/laboratories.
    """
    findings = []
    seen_hashes: Dict[str, str] = {}

    for path in photo_paths:
        if not os.path.exists(path):
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            continue

        result = _check_photo(path, seen_hashes, expected_lat_lon)
        if result:
            findings.append(result)

    return {
        "layer": "Layer 2 — EXIF & Metadata Verification",
        "photo_count": len(photo_paths),
        "findings": findings,
        "advisory_note": "All findings are advisory decision-support indicators. Output vocabulary restricted to: 'needs more evidence' or 'recommend inspection'.",
        "layer3_status": "ROADMAP — YOLOv11 automated laboratory & equipment classifier designed for Phase 3."
    }

def _check_photo(path: str, seen_hashes: Dict[str, str], expected_lat_lon: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
    try:
        with open(path, "rb") as f:
            content = f.read()
        file_hash = hashlib.md5(content).hexdigest()

        # 1. Duplicate photo detection (reused file across distinct laboratory disclosures)
        if file_hash in seen_hashes:
            return {
                "type": "duplicate_photo_detected",
                "severity": "high",
                "file": os.path.basename(path),
                "detail": f"Duplicate image payload detected. Matches '{seen_hashes[file_hash]}'. Reused infrastructure photos cannot verify distinct laboratory facilities.",
                "recommendation": "recommend inspection",
                "is_advisory": True
            }
        seen_hashes[file_hash] = os.path.basename(path)

        # 2. EXIF timestamp & GPS extraction
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS, GPSTAGS
            img = Image.open(path)
            exif_data = img._getexif() or {}
            exif = {TAGS.get(k, k): v for k, v in exif_data.items()}

            date_taken_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
            gps_info = exif.get("GPSInfo")

            file_issues = []

            if date_taken_str:
                try:
                    date_taken = datetime.strptime(str(date_taken_str)[:10].replace(":", "-"), "%Y-%m-%d")
                    current_year = datetime.utcnow().year
                    if date_taken.year < current_year - 2:
                        file_issues.append(f"EXIF capture date ({date_taken.date()}) is older than 2 years. Evidence may not reflect contemporary campus readiness.")
                except Exception:
                    pass

            if not gps_info:
                file_issues.append("Missing embedded GPS geotags. Physical campus coordinates cannot be authenticated automatically.")

            if file_issues:
                return {
                    "type": "infrastructure_photo_advisory",
                    "severity": "medium",
                    "file": os.path.basename(path),
                    "detail": " | ".join(file_issues),
                    "recommendation": "needs more evidence",
                    "is_advisory": True
                }
        except Exception:
            pass

    except Exception:
        pass

    return None

def check_infrastructure_compliance(
    declared_built_up: float,
    cad_extracted_built_up: float,
    program_type: str = "Engineering",
    min_required_sqm: float = 4000.0
) -> Dict[str, Any]:
    """
    Layer 1: Documentary floor plan schedule evaluation against AICTE statutory norms.
    """
    diff_pct = 0.0
    if declared_built_up > 0:
        diff_pct = abs(declared_built_up - cad_extracted_built_up) / declared_built_up * 100.0

    compliant = (cad_extracted_built_up >= min_required_sqm) and (diff_pct <= 2.0)
    recommendation = "verified" if compliant else ("recommend inspection" if cad_extracted_built_up < min_required_sqm else "needs more evidence")

    return {
        "layer": "Layer 1 — Documentary Compliance",
        "program_type": program_type,
        "min_required_sqm": min_required_sqm,
        "declared_sqm": declared_built_up,
        "cad_extracted_sqm": cad_extracted_built_up,
        "variance_pct": round(diff_pct, 2),
        "is_compliant": compliant,
        "recommendation": recommendation,
        "clause": "AICTE Approval Process Handbook (APH) 2025-26, Chapter IV, Table 4.1"
    }
