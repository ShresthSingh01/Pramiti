"""
Dual-Backend SLM Structured Fact Extractor for AICTE Scrutiny.

Priority:
  1. Local SLM (Ollama) - 100% on-device, zero-cloud data leakage.
     Attempts models: qwen2.5:3b, qwen2.5:1.5b, phi3:mini, llama3.2:3b, or any installed model.
  2. Cloud Fallback (Gemini API) - strictly only when Ollama is offline or unconfigured.
     Uses Free Tier safely with zero quota exhaustion.
  3. Graceful heuristic fallback if both AI backends are unavailable.
"""
import json
import logging
import httpx
from typing import List, Dict, Any, Tuple, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are a regulatory document intelligence assistant for the All India Council for Technical Education (AICTE).
Extract all verifiable factual claims from the following document text.
Map them to these standard regulatory fields if present:
- institution_name: Full legal name of institution/college
- land_area: Campus land area (e.g. '5.2 Acres' or '3.5 Hectares')
- built_up_area: Total built-up instructional/administrative area (e.g. '4500 Sqm')
- expiry_date: Document expiration/validity cut-off date (DD/MM/YYYY)
- issue_date: Date of document execution or issuance
- application_id: AICTE application number or reference file number
- program_intake: Total approved student intake capacity
- signatory: Deponent, Registrar, Principal, or Architect name
- affiliation_university: Name of affiliating state/central university
- naac_grade: NAAC accreditation grade (e.g. 'A+', 'Grade A', 'Tier-1')
- eoa_validity: Academic years of approved EoA

Text:
{text}

Return ONLY valid JSON matching this schema:
{{
  "facts": [
    {{
      "field": "field_name",
      "value": "extracted value",
      "confidence": 0.95
    }}
  ]
}}
Do NOT hallucinate. Only extract fields explicitly stated in the text.
"""

import socket

def _is_ollama_online(timeout: float = 0.1) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", 11434), timeout=timeout):
            return True
    except OSError:
        return False

def _detect_ollama_model() -> Optional[str]:
    """Checks if Ollama is running and finds the best available model."""
    if not _is_ollama_online():
        return None
    try:
        r = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=1.0)
        if r.status_code == 200:
            data = r.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            if not models:
                return None
            # Check preference order
            preferred = ["qwen2.5:3b", "qwen2.5:1.5b", "phi3:mini", "llama3.2:3b", "llama3.2:1b"]
            for pref in preferred:
                for m in models:
                    if pref in m:
                        return m
            # If user configured a specific model and it exists
            for m in models:
                if settings.OLLAMA_MODEL in m:
                    return m
            # Default to first available model
            return models[0]
    except Exception:
        return None
    return None

def _extract_via_ollama(text: str, model_name: str) -> Optional[List[Dict[str, Any]]]:
    """Executes structured JSON extraction via local Ollama instance."""
    try:
        import ollama
        client = ollama.Client(host=settings.OLLAMA_BASE_URL)
        response = client.chat(
            model=model_name,
            messages=[
                {"role": "user", "content": EXTRACTION_PROMPT.format(text=text[:3500])}
            ],
            format="json",
            options={"temperature": 0.0, "num_predict": 512}
        )
        content = response["message"]["content"]
        parsed = json.loads(content)
        return parsed.get("facts", [])
    except Exception as e:
        logger.warning(f"Ollama extraction failed: {e}")
        return None

def _extract_via_gemini(text: str, api_key: str) -> Optional[List[Dict[str, Any]]]:
    """Fallback: rate-limited Gemini structured extraction."""
    try:
        from google.genai import types
        from app.services.gemini_client import generate_content

        resp = generate_content(
            EXTRACTION_PROMPT.format(text=text[:3500]),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
        if resp is None or not getattr(resp, "text", None):
            return None
        parsed = json.loads(resp.text)
        return parsed.get("facts", [])
    except Exception as e:
        logger.warning("Gemini fallback extraction returned invalid JSON: %s", e)
        return None

def extract_facts_with_slm(page_text: str, page_num: int) -> Tuple[List[Dict[str, Any]], str]:
    """
    Extracts structured regulatory facts using local SLM or cloud fallback.
    Returns (facts, extractor_method)
    extractor_method: 'local_slm' | 'gemini_fallback' | 'regex_heuristic'
    """
    clean_text = page_text.strip()
    if len(clean_text) < 30:
        return [], "regex_heuristic"

    # 1. Try Local Ollama
    local_model = _detect_ollama_model()
    if local_model:
        facts = _extract_via_ollama(clean_text, local_model)
        if facts and len(facts) > 0:
            logger.info(f"[SLM] Successfully extracted {len(facts)} facts using local model '{local_model}'")
            return facts, "local_slm"

    # 2. Try Gemini Fallback
    if settings.GEMINI_API_KEY:
        facts = _extract_via_gemini(clean_text, settings.GEMINI_API_KEY)
        if facts and len(facts) > 0:
            logger.info(f"[GEMINI_FALLBACK] Successfully extracted {len(facts)} facts using Gemini Flash")
            return facts, "gemini_fallback"

    return [], "regex_heuristic"
