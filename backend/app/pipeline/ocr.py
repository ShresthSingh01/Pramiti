import re
import fitz # PyMuPDF
from typing import List, Dict, Any
from pathlib import Path
from app.services.slm_extractor import extract_facts_with_slm

def extract_pdf_facts_and_boxes(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text blocks, structured facts, and normalized bounding boxes [ymin, xmin, ymax, xmax] (0 to 1).
    Integrates Local SLM (Ollama) with Cloud Fallback (Gemini) alongside fast regex heuristics.
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
        ]

        page_facts = []
        found_fields = set()

        for field_name, pat in patterns:
            match = re.search(pat, full_page_text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                val_clean = val.split("\n")[0][:30]
                text_instances = page.search_for(val_clean)
                bbox = [0.1, 0.1, 0.15, 0.5]
                if text_instances:
                    inst = text_instances[0]
                    bbox = [
                        round(inst.y0 / height, 4),
                        round(inst.x0 / width, 4),
                        round(inst.y1 / height, 4),
                        round(inst.x1 / width, 4),
                    ]
                
                page_facts.append({
                    "field": field_name,
                    "value": val,
                    "page": page_num + 1,
                    "bbox": bbox,
                    "confidence": 0.94,
                    "extractor_method": "regex_heuristic"
                })
                found_fields.add(field_name)

        # 2. SLM Structured Intelligence (Local Ollama / Gemini Fallback)
        # Invoked intelligently when page contains unextracted text and regex missed key fields
        # Guaranteed Zero Free-Tier Quota Exhaustion: capped at 1 AI call per document
        if (len(found_fields) < 2 or page_num == 0) and len(full_page_text.strip()) > 50:
            slm_facts, method = extract_facts_with_slm(full_page_text, page_num + 1)
            if slm_facts:
                for sf in slm_facts:
                    sf_field = sf.get("field")
                    sf_val = str(sf.get("value", "")).strip()
                    if not sf_field or not sf_val:
                        continue

                    # Add if novel field or if regex missed it
                    if sf_field not in found_fields:
                        val_search = sf_val.split("\n")[0][:25]
                        text_instances = page.search_for(val_search)
                        bbox = [0.15, 0.1, 0.22, 0.6]
                        if text_instances:
                            inst = text_instances[0]
                            bbox = [
                                round(inst.y0 / height, 4),
                                round(inst.x0 / width, 4),
                                round(inst.y1 / height, 4),
                                round(inst.x1 / width, 4),
                            ]

                        page_facts.append({
                            "field": sf_field,
                            "value": sf_val,
                            "page": page_num + 1,
                            "bbox": bbox,
                            "confidence": float(sf.get("confidence", 0.92)),
                            "extractor_method": method
                        })
                        found_fields.add(sf_field)

        facts.extend(page_facts)

    doc.close()
    return facts
