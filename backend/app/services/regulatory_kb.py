"""
AICTE Regulatory Knowledge Base - Powered by PageIndex Local SDK.

Hierarchical vectorless tree search over the AICTE Approval Process Handbook (APH).
Indexes the handbook offline without transmitting data to external clouds.
Provides precise, clause-level and page-cited answers for scrutiny officers and the rule engine.
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import fitz # PyMuPDF
from pageindex.flash.api import page_index_flash

from app.core.config import settings
from app.services.slm_extractor import _detect_ollama_model

logger = logging.getLogger(__name__)

CACHE_FILE = settings.HANDBOOK_INDEX_DIR / "handbook_tree.json"

_tree_data: Optional[Dict[str, Any]] = None
_handbook_path: Optional[Path] = None
_page_count: int = 0

def _find_handbook_pdf() -> Optional[Path]:
    """Finds the primary AICTE Handbook PDF in the handbook directory or workspace root."""
    # 1. Check dedicated handbook directory first
    if settings.HANDBOOK_DIR.exists():
        handbook_in_dir = settings.HANDBOOK_DIR / "aicte_handbook.pdf"
        if handbook_in_dir.exists():
            return handbook_in_dir

        pdf_files = list(settings.HANDBOOK_DIR.glob("*.pdf"))
        # Priority to files with 'APH' or 'Handbook'
        for p in pdf_files:
            name_lower = p.name.lower()
            if "aph" in name_lower or "handbook" in name_lower:
                return p
        if pdf_files:
            return pdf_files[0]

    # 2. Fallback to workspace root
    root_pdf = settings.ROOT_PATH / "aicte_handbook.pdf"
    if root_pdf.exists():
        return root_pdf

    return None

def init_regulatory_kb() -> bool:
    """
    Initializes or loads the cached PageIndex tree for the AICTE Handbook.
    Runs locally and synchronously or via thread.
    """
    global _tree_data, _handbook_path, _page_count

    pdf_path = _find_handbook_pdf()
    if not pdf_path:
        logger.warning(f"[RegulatoryKB] No AICTE handbook PDF found in {settings.HANDBOOK_DIR}")
        return False

    _handbook_path = pdf_path

    try:
        doc = fitz.open(str(pdf_path))
        _page_count = len(doc)
        doc.close()
    except Exception as e:
        logger.error(f"[RegulatoryKB] Could not open PDF {pdf_path}: {e}")
        return False

    # Check cache
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cached = json.load(f)
                if cached.get("source_pdf") == str(pdf_path) and cached.get("structure"):
                    _tree_data = cached
                    logger.info(f"[RegulatoryKB] Loaded cached PageIndex tree for {pdf_path.name} ({len(cached.get('structure', []))} nodes)")
                    return True
        except Exception as e:
            logger.warning(f"[RegulatoryKB] Error reading cache: {e}; rebuilding tree")

    # Build Tree Index via PageIndex Flash (local, vectorless layout analysis)
    try:
        logger.info(f"[RegulatoryKB] Indexing {pdf_path.name} via PageIndex local Flash engine...")
        tree = page_index_flash(str(pdf_path), summary=False, optimize=False, use_embedded_toc=True)
        
        tree_record = {
            "source_pdf": str(pdf_path),
            "doc_name": pdf_path.name,
            "page_count": _page_count,
            "structure": tree.get("structure", []),
            "doc_title": tree.get("doc_title", pdf_path.stem)
        }

        settings.HANDBOOK_INDEX_DIR.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(tree_record, f, indent=2)

        _tree_data = tree_record
        logger.info(f"[RegulatoryKB] Successfully indexed {pdf_path.name} with {len(tree_record['structure'])} structural nodes")
        return True
    except Exception as e:
        logger.error(f"[RegulatoryKB] PageIndex tree generation failed: {e}")
        return False

def is_kb_ready() -> bool:
    """Checks if the regulatory KB is indexed and available."""
    return _tree_data is not None and _handbook_path is not None

def get_kb_metadata() -> Dict[str, Any]:
    """Returns runtime metadata for the indexed handbook."""
    return {
        "ready": is_kb_ready(),
        "doc_name": _handbook_path.name if _handbook_path else None,
        "page_count": _page_count,
        "node_count": len(_tree_data.get("structure", [])) if _tree_data else 0,
        "source_pdf": str(_handbook_path) if _handbook_path else None
    }

def _get_page_text(page_num: int) -> str:
    """Retrieves text of a specific 1-indexed page from the handbook."""
    if not _handbook_path or not _handbook_path.exists():
        return ""
    try:
        doc = fitz.open(str(_handbook_path))
        idx = max(0, min(page_num - 1, len(doc) - 1))
        text = doc[idx].get_text()
        doc.close()
        return text
    except Exception:
        return ""

def _find_best_tree_node(query: str) -> Optional[Dict[str, Any]]:
    """Traverses PageIndex hierarchical tree nodes to locate the most relevant section."""
    if not _tree_data or not _tree_data.get("structure"):
        return None

    query_lower = query.lower()
    nodes = _tree_data["structure"]
    
    # 1. Exact topic matching
    topic_keywords = {
        "land": ["land", "acre", "hectare", "parcel", "rural", "metro", "mega", "khasra", "urban"],
        "built_up": ["built-up", "built up", "area", "sqm", "square meter", "instructional", "floor plan", "cad"],
        "cadre": ["cadre", "faculty", "ratio", "teacher", "professor", "sfr", "student", "intake"],
        "affiliation": ["affiliation", "university", "noc", "lapsed", "stu", "expiry", "continuation"],
        "affidavit": ["affidavit", "stamp", "notary", "shcil", "undertaking", "deponent", "e-stamp"],
        "accreditation": ["accreditation", "naac", "nba", "tier-1", "grade"]
    }

    # Direct AICTE APH Annexure Routing for 2024-2027 Handbook
    for node in nodes:
        t = node.get("title", "")
        # Land & Built-up area norms
        if any(k in query_lower for k in ["land", "built-up", "built up", "area", "sqm", "acre", "fsi", "far", "hectare"]):
            if "ANNEXURE-3" in t or "land" in t.lower():
                return node
        # Faculty & Cadre ratio norms
        if any(k in query_lower for k in ["faculty", "cadre", "professor", "ratio", "sfr", "student"]):
            if "ANNEXURE-5" in t or "faculty" in t.lower():
                return node
        # Library, Computer & Laboratory norms
        if any(k in query_lower for k in ["computer", "library", "book", "software", "laboratory"]):
            if "ANNEXURE-4" in t:
                return node
        # Required documents & Affidavits
        if any(k in query_lower for k in ["document", "affidavit", "checklist", "undertaking", "stamp"]):
            if "ANNEXURE-1" in t or "document" in t.lower():
                return node

    # Score each node
    best_node = None
    best_score = -1

    for node in nodes:
        title = node.get("title", "").lower()
        items = " ".join(node.get("key_items", [])).lower()
        combined = f"{title} {items}"

        score = 0
        for word in query_lower.split():
            if len(word) > 2 and word in combined:
                score += 2

        for category, kws in topic_keywords.items():
            if any(k in query_lower for k in kws) and any(k in combined for k in kws):
                score += 5

        if score > best_score:
            best_score = score
            best_node = node

    if best_score > 0:
        return best_node
    return nodes[0] if nodes else None

def query_handbook(question: str) -> Dict[str, Any]:
    """
    Queries the AICTE Handbook using PageIndex tree reasoning.
    Returns targeted answer, page citation, and authoritative excerpt.
    """
    if not is_kb_ready():
        # Attempt just-in-time init
        init_regulatory_kb()
        if not is_kb_ready():
            return {
                "available": False,
                "answer": "Regulatory Knowledge Base is initializing or handbook PDF is missing.",
                "clause": None,
                "page": None,
                "sources": []
            }

    # Step 1: Vectorless tree traversal
    target_node = _find_best_tree_node(question)
    if not target_node:
        return {
            "available": False,
            "answer": "No matching regulatory chapter found for this query.",
            "clause": None,
            "page": None,
            "sources": []
        }

    start_page = target_node.get("start_index", 1)
    end_page = target_node.get("end_index", start_page)
    node_title = target_node.get("title", "Regulatory Section")

    # Step 2: Read targeted page content
    page_texts = []
    for p in range(start_page, end_page + 1):
        pt = _get_page_text(p)
        if pt:
            page_texts.append((p, pt))

    if not page_texts:
        return {
            "available": True,
            "answer": f"Consult {node_title} (Page {start_page}).",
            "node_title": node_title,
            "clause": node_title,
            "page": start_page,
            "sources": []
        }

    target_page, full_text = page_texts[0]

    # Step 3: Extract most relevant paragraph or use local SLM if available
    local_model = _detect_ollama_model()
    synthesized_answer = None
    engine_used = "PageIndex Local Tree Index"

    if local_model:
        try:
            import ollama
            client = ollama.Client(host=settings.OLLAMA_BASE_URL)
            prompt = (
                f"You are a regulatory scrutiny expert citing the AICTE Approval Process Handbook (APH).\n"
                f"Based ONLY on the following official excerpt from Page {target_page} ({node_title}), "
                f"answer the question with high precision and cite the clause/table number.\n\n"
                f"Excerpt:\n{full_text[:2500]}\n\n"
                f"Question: {question}\n\n"
                f"Answer concisely in 2-3 sentences, citing exact numbers and clauses."
            )
            resp = client.chat(
                model=local_model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.0, "num_predict": 256}
            )
            synthesized_answer = resp["message"]["content"].strip()
            engine_used = f"PageIndex + Local SLM ({local_model})"
        except Exception:
            pass

    # Cloud fallback if local SLM is absent and Gemini key is provided
    if not synthesized_answer and settings.GEMINI_API_KEY:
        try:
            from app.services.gemini_client import generate_content
            prompt = (
                f"Based ONLY on this official AICTE APH Page {target_page} text ({node_title}), "
                f"answer: {question}\n\nExcerpt:\n{full_text[:2500]}\nCite clause/table clearly."
            )
            resp = generate_content(prompt)
            if resp is not None and getattr(resp, "text", None):
                synthesized_answer = resp.text.strip()
                engine_used = f"PageIndex + {settings.GEMINI_MODEL} (Cloud Fallback)"
        except Exception:
            logger.exception("Gemini regulatory synthesis failed")

    # If neither LLM is active, extract authoritative paragraph directly
    if not synthesized_answer:
        paragraphs = [p.strip() for p in full_text.split("\n\n") if len(p.strip()) > 40]
        synthesized_answer = paragraphs[0] if paragraphs else full_text[:400]

    return {
        "available": True,
        "question": question,
        "answer": synthesized_answer,
        "node_title": node_title,
        "page": target_page,
        "doc_name": _handbook_path.name if _handbook_path else "AICTE Handbook",
        "engine": engine_used,
        "sources": [
            {
                "title": node_title,
                "page": target_page,
                "excerpt": full_text[:350].strip() + "..."
            }
        ]
    }

def get_clause_citation(clause_ref: str) -> Optional[Dict[str, Any]]:
    """Quick lookup of a specific clause or section reference."""
    if not is_kb_ready():
        return None
    res = query_handbook(f"What are the requirements stated in {clause_ref}?")
    if res.get("available"):
        return res
    return None
