# PRAMITI Tools & Generators

This directory contains utility scripts and test document generators for the PRAMITI AICTE Scrutiny Engine.

## Files

- **`generate_showcase_documents.py`**:
  Generates authentic, high-fidelity AICTE compliance dossiers with official government e-stamp paper layout, university NOC affiliations, architectural CAD-style floor plans, NAAC certificates, prior EoA approval orders, and certified faculty cadre lists.
  
  Used programmatically by:
  - `backend/app/api/sample_dossiers.py` (for instant sample loading)
  - `backend/app/pipeline/doc_generator.py` (for dynamic synthetic application generation)

## Command Line Usage

To generate or refresh sample dossiers in `./sample_documents`:

```bash
python tools/generate_showcase_documents.py ./sample_documents
```
