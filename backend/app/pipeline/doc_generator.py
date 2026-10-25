import os
from typing import Dict, Any
from tools.generate_showcase_documents import (
    create_affidavit_pdf,
    create_noc_pdf,
    create_floorplan_pdf,
    create_accreditation_pdf,
    create_previous_eoa_pdf,
    create_faculty_pdf
)

def generate_professional_documents(output_dir: str, institution_name: str, has_anomalies: bool = False) -> Dict[str, str]:
    """
    Generates high-fidelity professional AICTE compliance documents for the Golden Path:
    1. Registered Affidavit / Undertaking on E-Stamp Paper
    2. University Affiliation / NOC Order
    3. Master CAD Architectural Floor Plan with Area Schedules
    4. NAAC / NBA Accreditation Certificate
    5. Previous Year AICTE Approval (EoA) Order
    6. Certified Faculty Profile List
    """
    os.makedirs(output_dir, exist_ok=True)
    generated_files = {}

    # 1. E-Stamp Paper Affidavit
    land_area = "2.50" if has_anomalies else "5.25"
    affidavit_path = os.path.join(output_dir, "01_Affidavit_Notarized_EStamp.pdf")
    create_affidavit_pdf(affidavit_path, institution_name, land_area, is_deficient=has_anomalies)
    generated_files["affidavit"] = affidavit_path

    # 2. University NOC / Affiliation
    expiry_date = "15-05-2024" if has_anomalies else "30-06-2028"
    noc_path = os.path.join(output_dir, "02_University_NOC_Affiliation.pdf")
    create_noc_pdf(noc_path, institution_name, expiry_date, is_deficient=has_anomalies)
    generated_files["noc"] = noc_path

    # 3. Architect Floor Plan
    built_up = "2800.00" if has_anomalies else "4850.00"
    floorplan_path = os.path.join(output_dir, "03_Architectural_Floor_Plan.pdf")
    create_floorplan_pdf(floorplan_path, institution_name, "5.25", built_up, is_deficient=has_anomalies)
    generated_files["floorplan"] = floorplan_path

    # 4. NAAC Accreditation Certificate
    acc_expiry = "15-04-2025" if has_anomalies else "31-12-2028"
    naac_path = os.path.join(output_dir, "04_NAAC_Accreditation_Certificate.pdf")
    create_accreditation_pdf(naac_path, institution_name, acc_expiry)
    generated_files["accreditation"] = naac_path

    # 5. AICTE EoA Approval
    eoa_path = os.path.join(output_dir, "05_Previous_AICTE_EoA_Approval.pdf")
    create_previous_eoa_pdf(eoa_path, institution_name)
    generated_files["eoa"] = eoa_path

    # 6. Faculty Profile List
    faculty_path = os.path.join(output_dir, "06_Certified_Faculty_Cadre_List.pdf")
    create_faculty_pdf(faculty_path, institution_name)
    generated_files["faculty"] = faculty_path

    return generated_files
