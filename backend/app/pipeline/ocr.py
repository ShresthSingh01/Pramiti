import re
import fitz # PyMuPDF
from typing import List, Dict, Any
from pathlib import Path
from app.services.slm_extractor import extract_facts_with_slm

def _find_exact_or_token_bbox(page, search_phrase: str, width: float, height: float):
    """
    Attempts exact phrase search in PDF vector stream.
    Falls back to distinctive token search before inferring regional bounding box.
    Returns: (bbox, is_estimated, method)
    """
    phrase_clean = search_phrase.split("\n")[0].strip()[:35]
    if phrase_clean:
        instances = page.search_for(phrase_clean)
        if instances:
            inst = instances[0]
            return [
                round(inst.y0 / height, 4),
                round(inst.x0 / width, 4),
                round(inst.y1 / height, 4),
                round(inst.x1 / width, 4),
            ], False, "lexical_exact_coordinate"

    # Secondary: try individual substantive numeric or code tokens
    tokens = re.findall(r'[A-Za-z0-9\.\-\/]{4,}', phrase_clean)
    for tok in tokens:
        instances = page.search_for(tok)
        if instances:
            inst = instances[0]
            return [
                round(inst.y0 / height, 4),
                round(inst.x0 / width, 4),
                round(inst.y1 / height, 4),
                round(inst.x1 / width, 4),
            ], False, "token_grounded_coordinate"

    # Fallback: Inferred regional bounding box
    return [0.15, 0.1, 0.22, 0.6], True, "heuristic_inferred_coordinate"

def extract_pdf_facts_and_boxes(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text blocks, structured facts, and normalized bounding boxes [ymin, xmin, ymax, xmax] (0 to 1).
    Distinguishes exact grounded vector coordinates from regional heuristic inferences.
    """
    path = Path(file_path)
    if not path.exists():
        return []

    doc = fitz.open(file_path)
    facts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        rect = page.rect
        width, height = rect.width, rect.height

        full_page_text = page.get_text()

        # Check for scanned paper / raster PDF (no text stream)
        if len(full_page_text.strip()) < 15:
            facts.append({
                "field": "scanned_raster_detected",
                "value": "Physical / Scanned Document (No Embedded Text Stream)",
                "page": page_num + 1,
                "bbox": [0.05, 0.05, 0.95, 0.95],
                "confidence": 0.99,
                "bbox_is_estimated": True,
                "grounding_method": "raster_analysis",
                "extractor_method": "heuristic_inferred_coordinate"
            })
            continue

        # 1. Base Regex patterns for immediate deterministic field detection
        patterns = [
            ("institution_name", r"(?:Name of (?:the )?Institution|College|Institute|University|Purchased by|Client)[\s:]+([A-Z0-9\s,\.\-]{5,80})"),
            ("land_area", r"(?:Total Land Area|Land Area|Plot Area)[\s:]+([0-9\.,]+)\s*(?:Acres|Sq\.?\s*Mtrs?|sqm|hectares)?"),
            ("built_up_area", r"(?:Built-?[Uu]p Area|Total Built-?up Area)(?:[\s:]+(?:of)?|\s+of)\s*([0-9\.,]+)\s*(?:Sq\.?\s*Mtrs?|sqm)?"),
            ("expiry_date", r"(?:Valid(?:ity)? (?:upto|until|till)|Expiry Date|Date of Expiry)[\s:]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})"),
            ("issue_date", r"(?:Date of Issue|Issued on|Date|Date of Execution)[\s:]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})"),
            ("application_id", r"(?:Application ID|AICTE File No|Ref No|F\.No\.)[\s:]+([A-Z0-9\-\/\.]{6,35})"),
            ("program_intake", r"(?:Approved Intake|Total Intake|Intake Approved|Sanctioned Intake)[\s:]+([0-9]{2,4})"),
            ("signatory", r"(?:Authorized Signatory|Registrar|Principal|Director|DEPONENT)[\s:]+([A-Za-z\.\s]{3,40})"),
            ("naac_grade", r"(?:NAAC(?:'s)? Grade|Accreditation Grade|Grade|Score)[\s:]+([A-Za-z0-9\+\-]+)"),
            ("affiliation_university", r"(?:Affiliated to|Affiliation with|University)[\s:]+([A-Z0-9\s,\.\-]{5,80})"),
            ("eoa_validity", r"(?:Academic Year|Valid for)[\s:]+([0-9]{4}\s*-\s*[0-9]{2,4})"),
            ("faculty_cadre_ratio", r"(?:Faculty-to-Student Cadre Ratio|Cadre Ratio|FSR)[\s:]+([0-9\:\.]+)")
        ]

        page_facts = []
        found_fields = set()

        for field_name, pat in patterns:
            match = re.search(pat, full_page_text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                bbox, is_estimated, method = _find_exact_or_token_bbox(page, val, width, height)
                
                page_facts.append({
                    "field": field_name,
                    "value": val,
                    "page": page_num + 1,
                    "bbox": bbox,
                    "confidence": 0.96 if not is_estimated else 0.88,
                    "bbox_is_estimated": is_estimated,
                    "grounding_method": method,
                    "extractor_method": method
                })
                found_fields.add(field_name)

        # 2. SLM Structured Intelligence (Local Ollama / Gemini Fallback)
        # Fast path: deterministic extraction already identified key statutory fields.
        # Only invoke SLM when deterministic extraction detects fewer than 2 fields on an unstructured page.
        if len(found_fields) < 2 and len(full_page_text.strip()) > 50:
            slm_facts, slm_engine = extract_facts_with_slm(full_page_text, page_num + 1)
            if slm_facts:
                for sf in slm_facts:
                    sf_field = sf.get("field")
                    sf_val = str(sf.get("value", "")).strip()
                    if not sf_field or not sf_val:
                        continue

                    if sf_field not in found_fields:
                        bbox, is_estimated, method = _find_exact_or_token_bbox(page, sf_val, width, height)

                        page_facts.append({
                            "field": sf_field,
                            "value": sf_val,
                            "page": page_num + 1,
                            "bbox": bbox,
                            "confidence": float(sf.get("confidence", 0.92)),
                            "bbox_is_estimated": is_estimated,
                            "grounding_method": f"{slm_engine}_{method}",
                            "extractor_method": method
                        })
                        found_fields.add(sf_field)

        facts.extend(page_facts)

    doc.close()
    return facts
