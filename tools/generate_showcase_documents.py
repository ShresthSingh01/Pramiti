import os
import tempfile
from fpdf import FPDF
import qrcode
from pathlib import Path

def generate_qr_temp(data: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    img.save(tmp.name)
    tmp.close()
    return tmp.name

# 1. E-Stamp Notarized Affidavit
def create_affidavit_pdf(output_path: str, inst_name: str, land_acres: str, is_deficient: bool = False):
    pdf = FPDF(unit="mm", format="A4")
    pdf.add_page()
    
    # Outer decorative border
    pdf.set_draw_color(30, 58, 138)
    pdf.set_line_width(0.8)
    pdf.rect(6, 6, 198, 285)
    pdf.set_draw_color(180, 83, 9)
    pdf.set_line_width(0.3)
    pdf.rect(7.5, 7.5, 195, 282)

    # e-Stamp header box
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(148, 163, 184)
    pdf.rect(10, 10, 190, 48, 'DF')

    # Security header band
    pdf.set_fill_color(30, 58, 138)
    pdf.rect(10, 10, 190, 8, 'F')
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 8, "GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI", align="C", new_x="LMARGIN", new_y="NEXT")

    # QR Code on top right of e-Stamp
    qr_data = f"CERT:IN-DL98231049281720Z|INST:{inst_name}|STAMP:100|DATE:15-01-2025"
    qr_file = generate_qr_temp(qr_data)
    pdf.image(qr_file, 162, 19, 34, 34)
    try:
        os.remove(qr_file)
    except Exception:
        pass

    # e-Stamp Certificate Details
    pdf.set_y(19)
    pdf.set_text_color(185, 28, 28)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(150, 5, "e-Stamp Certificate of Non-Judicial Regulatory Undertaking", align="L", new_x="LMARGIN", new_y="NEXT")

    pdf.set_text_color(15, 23, 42)
    pdf.set_font("helvetica", "", 8)
    cert_no = "IN-DL98231049281720Z" if not is_deficient else "IN-UP41029418492019X"
    pdf.cell(150, 4, f"Certificate No: {cert_no}  |  Date: 15-Jan-2025 11:24 AM", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(150, 4, f"Unique Doc ID: SUBIN-DLDL01948194819481U  |  Duty: Rs. 100/-", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(150, 4, f"Purchased by: {inst_name[:48]}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(150, 4, f"First Party: {inst_name[:40]}  |  Second Party: AICTE, New Delhi", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(150, 4, f"Stamp Duty Paid by: Authorized Signatory  |  Description: Article 4 Affidavit", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(62)
    # Title
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 7, "AFFIDAVIT ON NON-JUDICIAL STAMP PAPER", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "(Formulated in compliance with AICTE Approval Process Handbook APH 2025-26)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Affidavit Body Text
    pdf.set_font("helvetica", "", 9.5)
    pdf.set_text_color(15, 23, 42)
    body = (
        f"I, Dr. Arvind Singhania, son of Shri R. C. Singhania, aged 56 years, in my capacity as "
        f"Authorized Signatory and Chairman of the Sponsoring Educational Trust, do hereby "
        f"solemnly affirm and verify as under:\n\n"
        f"1. That the technical education institution named '{inst_name}' is situated on a "
        f"single contiguous, legally demarcated campus land plot with Total Land Area: {land_acres} Acres, "
        f"having clear, marketable title and registered possession free from all encumbrances.\n\n"
        f"2. That the campus comprises a Total Built-Up Area of 4850.00 Sq. Mtrs (including Instructional, "
        f"Administrative, Amenities, and Circulation Spaces) constructed in strict adherence to the National "
        f"Building Code (NBC 2016) and municipal zoning permissions.\n\n"
        f"3. That all educational infrastructure, computing facilities with 1 Gbps lease line, digital classrooms, "
        f"central library with 14,200 volumes, and advanced engineering laboratories are fully operational.\n\n"
        f"4. That the faculty-to-student cadre ratio is maintained at 1:15/1:20 in accordance with AICTE norms, "
        f"and all appointed faculty members are disbursed full salaries via ECS bank transfers as per 7th CPC."
    )
    pdf.multi_cell(0, 5.2, body)
    pdf.ln(8)

    # Verification / Signature block
    pdf.set_font("helvetica", "B", 9)
    pdf.cell(100, 5, "VERIFICATION & DEPONENT STATEMENT:")
    pdf.cell(0, 5, "DEPONENT / TRUSTEE", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.cell(100, 4.5, "Verified at New Delhi on 15-01-2025 that the contents of this")
    pdf.set_font("helvetica", "B", 9)
    pdf.cell(0, 4.5, "Dr. Arvind Singhania", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.cell(100, 4.5, "affidavit are true, correct, and nothing material is concealed.")
    pdf.cell(0, 4.5, "Chairman, Governing Body", align="R", new_x="LMARGIN", new_y="NEXT")

    # Notary Box
    pdf.ln(8)
    pdf.set_draw_color(185, 28, 28)
    pdf.set_line_width(0.5)
    pdf.rect(15, 235, 80, 38)
    pdf.set_xy(17, 237)
    pdf.set_font("helvetica", "B", 8)
    pdf.set_text_color(185, 28, 28)
    pdf.cell(76, 4, "NOTARY PUBLIC - GOVT. OF INDIA", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(17)
    pdf.set_font("helvetica", "", 7.5)
    pdf.cell(76, 3.5, "Reg. No: DL-NOT-2019-4821", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(17)
    pdf.cell(76, 3.5, "Advocate Commissioner, High Court", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(17)
    pdf.cell(76, 3.5, "Solemnly affirmed before me on 15/01/2025", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(17)
    pdf.set_font("helvetica", "B", 7.5)
    pdf.cell(76, 4, "[OFFICIAL NOTARIAL SEAL APPLIED]", align="C", new_x="LMARGIN", new_y="NEXT")

    # Barcode representation
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.4)
    for bx in range(115, 185, 2):
        pdf.line(bx, 255, bx, 268)
    pdf.set_xy(115, 269)
    pdf.set_font("helvetica", "", 7)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(70, 3.5, f"* {cert_no} *", align="C")

    pdf.output(output_path)

# 2. University NOC / Affiliation Order
def create_noc_pdf(output_path: str, inst_name: str, expiry_date: str, is_deficient: bool = False):
    pdf = FPDF(unit="mm", format="A4")
    pdf.add_page()

    # Outer border
    pdf.set_draw_color(71, 85, 105)
    pdf.set_line_width(0.5)
    pdf.rect(8, 8, 194, 281)

    # University Header
    pdf.set_y(14)
    pdf.set_font("helvetica", "B", 15)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(0, 7, "STATE TECHNOLOGICAL UNIVERSITY", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 4.5, "DIRECTORATE OF ACADEMIC AFFILIATION & REGULATORY ACCREDITATIONS", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8)
    pdf.cell(0, 4, "Statutory University Established under State Act No. 14 of 1998 | Recognized by UGC u/s 2(f) & 12(B)", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Header separator rule
    pdf.set_draw_color(30, 58, 138)
    pdf.set_line_width(0.8)
    pdf.line(14, pdf.get_y() + 2, 196, pdf.get_y() + 2)
    pdf.ln(7)

    # Reference and Date
    ref_no = "STU/AFFIL/2025-26/9182" if not is_deficient else "STU/AFFIL/2023-24/4102"
    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(100, 5, f"Ref No: {ref_no}")
    pdf.cell(0, 5, "Date of Issue: 12-07-2024", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Order Title
    pdf.set_fill_color(241, 245, 249)
    pdf.rect(14, pdf.get_y(), 182, 8, 'F')
    pdf.set_font("helvetica", "B", 10.5)
    pdf.set_text_color(180, 83, 9)
    pdf.cell(0, 8, "CERTIFICATE OF CONTINUATION OF AFFILIATION & NO OBJECTION (NOC)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Body
    pdf.set_font("helvetica", "", 9.5)
    pdf.set_text_color(15, 23, 42)
    noc_text = (
        f"This is to certify that the Standing Affiliation Committee of the University, upon inspecting "
        f"and evaluating the academic resources, instructional spaces, computing facilities, and faculty rosters of:\n\n"
        f"Institution: '{inst_name}'\n\n"
        f"hereby conveys the grant of Continuation of Provisional Affiliation and No Objection Certificate (NOC) "
        f"for conducting the following approved Degree Programs for the Academic Cycle:\n\n"
        f"This No Objection Certificate & Affiliation Order is officially Valid until: {expiry_date}."
    )
    pdf.multi_cell(0, 5.2, noc_text)
    pdf.ln(4)

    # Approved Course Table
    pdf.set_fill_color(226, 232, 240)
    pdf.set_font("helvetica", "B", 8.5)
    pdf.cell(20, 6, "S.No", 1, 0, "C", True)
    pdf.cell(90, 6, "Undergraduate Degree Program", 1, 0, "L", True)
    pdf.cell(35, 6, "Program Level", 1, 0, "C", True)
    pdf.cell(35, 6, "Sanctioned Intake", 1, 1, "C", True)

    pdf.set_font("helvetica", "", 8.5)
    courses = [
        ("1", "Computer Science & Engineering", "Undergraduate (B.Tech)", "180"),
        ("2", "Electronics & Communication Engineering", "Undergraduate (B.Tech)", "120"),
        ("3", "Mechanical Engineering", "Undergraduate (B.Tech)", "60"),
        ("4", "Civil Engineering & Structural Design", "Undergraduate (B.Tech)", "60")
    ]
    for sno, cname, lvl, intake in courses:
        pdf.cell(20, 5.5, sno, 1, 0, "C")
        pdf.cell(90, 5.5, cname, 1, 0, "L")
        pdf.cell(35, 5.5, lvl, 1, 0, "C")
        pdf.cell(35, 5.5, intake, 1, 1, "C")

    pdf.ln(8)
    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(0, 4.5, "Conditions of Affiliation: The institution shall adhere to all norms specified in AICTE Approval Process Handbook (APH 2025-26) and State Government directives. Continuation beyond the validity period is subject to satisfactory inspection.")
    pdf.ln(12)

    # Signature and Seal
    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(100, 5, "By Order of the Academic Council")
    pdf.cell(0, 5, "REGISTRAR", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.cell(100, 4.5, "State Technological University, Academic Cell")
    pdf.cell(0, 4.5, "Dr. S. K. Mahapatra, Ph.D", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(100, 4.5, "Copy forwarded to: Member Secretary, AICTE, New Delhi")
    pdf.cell(0, 4.5, "State Technological University", align="R", new_x="LMARGIN", new_y="NEXT")

    # Embossed Seal box
    pdf.set_draw_color(30, 58, 138)
    pdf.rect(140, 240, 45, 22)
    pdf.set_xy(140, 244)
    pdf.set_font("helvetica", "B", 7)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(45, 3.5, "STATE TECH. UNIVERSITY", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(140)
    pdf.cell(45, 3.5, "* OFFICIAL SEAL *", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(140)
    pdf.cell(45, 3.5, "AFFILIATION DIRECTORATE", align="C")

    pdf.output(output_path)

# 3. Architectural CAD Master Floor Plan
def create_floorplan_pdf(output_path: str, inst_name: str, land_acres: str, built_up_sqm: str, is_deficient: bool = False):
    pdf = FPDF(orientation='L', unit="mm", format="A4")
    pdf.add_page()

    # Outer CAD Blueprint Border
    pdf.set_draw_color(30, 41, 59)
    pdf.set_line_width(0.7)
    pdf.rect(8, 8, 281, 194)
    pdf.set_line_width(0.3)
    pdf.rect(10, 10, 277, 190)

    # Header / Title Block
    pdf.set_y(12)
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, "COMPREHENSIVE MASTER ARCHITECTURAL FLOOR PLAN & AREA SCHEDULE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 4.5, f"Project Client: {inst_name}  |  Licensed Architect Reg: CA/2012/58129  |  Scale: 1:100  |  Sheet: A-101", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    # Draw CAD architectural wireframe rooms representation
    pdf.set_draw_color(100, 116, 139)
    pdf.set_line_width(0.4)
    pdf.set_fill_color(248, 250, 252)

    # Room Block 1: Computer Lab Block
    pdf.rect(15, 26, 60, 40, 'DF')
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(30, 58, 138)
    pdf.text(17, 32, "COMPUTER SCIENCE LAB - A1")
    pdf.set_font("helvetica", "", 6.5)
    pdf.set_text_color(100, 116, 139)
    pdf.text(17, 36, "Carpet: 720 Sqm | Built: 840 Sqm")
    pdf.text(17, 40, "60 Workstations, UPS, CAT6 Cabling")

    # Room Block 2: Lecture Theatres
    pdf.rect(80, 26, 65, 40, 'DF')
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(30, 58, 138)
    pdf.text(82, 32, "LECTURE THEATRES LT-1 & LT-2")
    pdf.set_font("helvetica", "", 6.5)
    pdf.set_text_color(100, 116, 139)
    pdf.text(82, 36, "Carpet: 890 Sqm | Built: 1020 Sqm")
    pdf.text(82, 40, "Tiered seating, Smart Interactive Panels")

    # Room Block 3: Central Digital Library
    pdf.rect(150, 26, 65, 40, 'DF')
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(30, 58, 138)
    pdf.text(152, 32, "CENTRAL DIGITAL LIBRARY")
    pdf.set_font("helvetica", "", 6.5)
    pdf.set_text_color(100, 116, 139)
    pdf.text(152, 36, "Carpet: 950 Sqm | Built: 1100 Sqm")
    pdf.text(152, 40, "Stack Area, E-Journal Terminal, Reading Hall")

    # Room Block 4: Administrative Wing
    pdf.rect(220, 26, 60, 40, 'DF')
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(30, 58, 138)
    pdf.text(222, 32, "ADMINISTRATIVE BLOCK")
    pdf.set_font("helvetica", "", 6.5)
    pdf.set_text_color(100, 116, 139)
    pdf.text(222, 36, "Carpet: 780 Sqm | Built: 930 Sqm")
    pdf.text(222, 40, "Principal Chamber, Board Room, Faculty Hub")

    # Corridor Line
    pdf.set_draw_color(203, 213, 225)
    pdf.set_line_width(1.5)
    pdf.line(15, 69, 280, 69)
    pdf.set_font("helvetica", "I", 6.5)
    pdf.set_text_color(148, 163, 184)
    pdf.text(120, 68, "CENTRAL CIRCULATION CORRIDOR (3.0M CLEAR PASSAGE)")

    # Area Schedule Table Header
    pdf.set_y(73)
    pdf.set_font("helvetica", "B", 8)
    pdf.set_fill_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(75, 5.5, "Zone / Building Level Designation", 1, 0, "L", True)
    pdf.cell(85, 5.5, "Earmarked Usage per AICTE APH Norms", 1, 0, "L", True)
    pdf.cell(50, 5.5, "Carpet Area (Sqm)", 1, 0, "C", True)
    pdf.cell(55, 5.5, "Built-Up Area (Sqm)", 1, 1, "C", True)

    # Floor Schedule Rows
    pdf.set_font("helvetica", "", 7.5)
    floors = [
        ("Ground Floor - Block A", "Computer Science Labs, Data Center & Server Hub", "720.00", "840.00"),
        ("First Floor - Block A", "Lecture Theatres & Tutorial Classrooms", "890.00", "1020.00"),
        ("Second Floor - Block A", "Electronics & Embedded Hardware Labs", "810.00", "960.00"),
        ("Ground Floor - Block B", "Central Library & Digital Resource Hall", "950.00", "1100.00"),
        ("Administrative Wing", "Principal Office, Registrar, Board Room & Faculty Cabins", "780.00", "930.00")
    ]
    for fl, use, carpet, built in floors:
        pdf.cell(75, 4.8, fl, 1)
        pdf.cell(85, 4.8, use, 1)
        pdf.cell(50, 4.8, carpet, 1, 0, "C")
        pdf.cell(55, 4.8, built, 1, 1, "C")

    # Table Summary Row
    pdf.set_font("helvetica", "B", 8)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(160, 6, "Total Built-Up Area (Instructional + Administrative Spaces)", 1, 0, "R", True)
    pdf.cell(50, 6, "4150.00", 1, 0, "C", True)
    pdf.cell(55, 6, f"{built_up_sqm}", 1, 1, "C", True)

    # Land Area, Built-Up Area and Architect Certification Block
    pdf.ln(4)
    pdf.set_font("helvetica", "B", 8)
    pdf.cell(0, 4, f"Total Land Area: {land_acres} Acres  |  Total Built-Up Area: {built_up_sqm} Sqm  |  Survey Khasra: 148/2, Campus Demarcation", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 4, "COUNCIL OF ARCHITECTURE REGISTRATION & COMPLIANCE", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("helvetica", "", 7.5)
    pdf.set_text_color(71, 85, 105)
    cert_text = (
        f"I hereby certify that I have physically surveyed the campus of {inst_name} and examined the approved layout plans. "
        f"The instructional area, barriers-free provisions for PwD, fire escape staircases, and ventilation strictly comply with "
        f"AICTE Approval Process Handbook (APH 2025-26) and National Building Code specifications."
    )
    pdf.multi_cell(180, 3.8, cert_text)

    # Architect Seal
    pdf.set_y(155)
    pdf.set_x(195)
    pdf.set_draw_color(30, 58, 138)
    pdf.rect(195, 155, 80, 26)
    pdf.set_xy(197, 158)
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(76, 3.5, "Ar. R. K. Sharma, B.Arch, MCAI", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(197)
    pdf.set_font("helvetica", "", 7)
    pdf.cell(76, 3.2, "Council of Architecture Reg No: CA/2012/58129", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(197)
    pdf.cell(76, 3.2, "Authorized Architectural Consultant", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(197)
    pdf.set_font("helvetica", "B", 7)
    pdf.cell(76, 3.5, "[LICENSED ARCHITECT SIGNATURE & STAMP]", align="C")

    pdf.output(output_path)

# 4. NAAC / NBA Accreditation Certificate
def create_accreditation_pdf(output_path: str, inst_name: str, expiry_date: str):
    pdf = FPDF(unit="mm", format="A4")
    pdf.add_page()

    # Rich decorative double border
    pdf.set_draw_color(180, 83, 9)
    pdf.set_line_width(1.0)
    pdf.rect(8, 8, 194, 281)
    pdf.set_draw_color(30, 58, 138)
    pdf.set_line_width(0.4)
    pdf.rect(10, 10, 190, 277)

    pdf.set_y(20)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(180, 83, 9)
    pdf.cell(0, 8, "NATIONAL ASSESSMENT AND ACCREDITATION COUNCIL", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "I", 9.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "An Autonomous Institution of the University Grants Commission, New Delhi", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 7, "NATIONAL QUALITY ASSURANCE ACCREDITATION CERTIFICATE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("helvetica", "", 10.5)
    pdf.cell(0, 6, "This is to certify that the Executive Committee of NAAC has evaluated and accredited", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(0, 8, f"'{inst_name}'", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, "with a Cumulative Grade Point Average (CGPA) of 3.42 on a four point scale", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Grade Badge
    pdf.ln(3)
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(185, 28, 28)
    pdf.cell(0, 9, "at 'A+' Grade", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("helvetica", "B", 9.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, f"Accreditation Ref: NAAC/A&A/2024/7821  |  Valid until: {expiry_date}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    # Criteria wise score table
    pdf.set_fill_color(241, 245, 249)
    pdf.set_font("helvetica", "B", 8.5)
    pdf.cell(120, 6, "NAAC Assessment Criteria Dimension", 1, 0, "L", True)
    pdf.cell(60, 6, "Criteria Score (Scale 4.00)", 1, 1, "C", True)

    pdf.set_font("helvetica", "", 8.5)
    scores = [
        ("I. Curricular Aspects & Outcome Based Education", "3.55"),
        ("II. Teaching-Learning and Regulatory Evaluation", "3.48"),
        ("III. Research, Innovations and Faculty Extension", "3.28"),
        ("IV. Infrastructure and Learning Physical Resources", "3.64"),
        ("V. Student Support and Progression Systems", "3.40"),
        ("VI. Governance, Leadership and Management", "3.36")
    ]
    for dim, scr in scores:
        pdf.cell(120, 5.2, dim, 1)
        pdf.cell(60, 5.2, scr, 1, 1, "C")

    pdf.set_font("helvetica", "B", 8.5)
    pdf.cell(120, 6, "Cumulative Grade Point Average (CGPA)", 1, 0, "R", True)
    pdf.cell(60, 6, "3.42 (A+ Grade)", 1, 1, "C", True)

    pdf.ln(18)
    pdf.set_font("helvetica", "B", 9)
    pdf.cell(90, 5, "Date of Concurrence: 22-Dec-2023")
    pdf.cell(0, 5, "DIRECTOR, NAAC", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.cell(90, 4.5, "Bengaluru, India")
    pdf.cell(0, 4.5, "Dr. S. C. Sharma, Senior Director", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.output(output_path)

# 5. AICTE Previous EoA Approval Order
def create_previous_eoa_pdf(output_path: str, inst_name: str):
    pdf = FPDF(unit="mm", format="A4")
    pdf.add_page()

    # Border
    pdf.set_draw_color(30, 58, 138)
    pdf.set_line_width(0.6)
    pdf.rect(8, 8, 194, 281)

    pdf.set_y(15)
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(0, 7, "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "B", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 4.5, "(A STATUTORY BODY OF THE GOVERNMENT OF INDIA)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8)
    pdf.cell(0, 4, "Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | Website: www.aicte-india.org", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.line(12, pdf.get_y() + 2, 198, pdf.get_y() + 2)
    pdf.ln(6)

    # Order Details
    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(100, 5, "F.No. Western/1-4829104821/2024/EOA")
    pdf.cell(0, 5, "Date: 28-Apr-2024", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("helvetica", "B", 10.5)
    pdf.cell(0, 6, "EXTENSION OF APPROVAL (EoA) ORDER FOR ACADEMIC YEAR 2024-25", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("helvetica", "", 9)
    body = (
        f"To,\n"
        f"The Principal Secretary (Higher & Technical Education),\n"
        f"Government Administration Secretariat.\n\n"
        f"Sub: AICTE Grant of Extension of Approval (EoA) to '{inst_name}' for Academic Year 2024-25.\n\n"
        f"Sir / Madam,\n"
        f"In terms of the provisions under the All India Council for Technical Education (Grant of Approvals for "
        f"Technical Institutions) Regulations 2024, I am directed to convey the approval to the institution to "
        f"conduct following courses with the approved intake indicated below:"
    )
    pdf.multi_cell(0, 4.8, body)
    pdf.ln(5)

    # Course Approval Table
    pdf.set_fill_color(226, 232, 240)
    pdf.set_font("helvetica", "B", 8)
    pdf.cell(15, 6, "Prog", 1, 0, "C", True)
    pdf.cell(20, 6, "Level", 1, 0, "C", True)
    pdf.cell(85, 6, "Approved Course Name", 1, 0, "L", True)
    pdf.cell(30, 6, "Affiliating Body", 1, 0, "C", True)
    pdf.cell(30, 6, "Intake Approved", 1, 1, "C", True)

    pdf.set_font("helvetica", "", 8)
    records = [
        ("Engg", "UG", "Computer Science & Engineering", "State Tech Univ", "180"),
        ("Engg", "UG", "Electronics & Communication Engg", "State Tech Univ", "120"),
        ("Engg", "UG", "Mechanical Engineering", "State Tech Univ", "60"),
        ("Engg", "UG", "Civil Engineering", "State Tech Univ", "60")
    ]
    for p, l, c, aff, i in records:
        pdf.cell(15, 5, p, 1, 0, "C")
        pdf.cell(20, 5, l, 1, 0, "C")
        pdf.cell(85, 5, c, 1, 0, "L")
        pdf.cell(30, 5, aff, 1, 0, "C")
        pdf.cell(30, 5, i, 1, 1, "C")

    pdf.ln(6)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(0, 4.2, "Regulatory Compliance Notice: The institution is approved with Zero Deficiencies reported in Land, Administrative Area, Faculty Cadre, and Laboratory Norms during previous cycle physical and virtual scrutiny.")
    pdf.ln(12)

    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 5, "Member Secretary, AICTE", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.cell(0, 4.5, "New Delhi Regulatory Headquarters", align="R")

    pdf.output(output_path)

# 6. Certified Faculty Profile List
def create_faculty_pdf(output_path: str, inst_name: str, is_deficient: bool = False):
    pdf = FPDF(unit="mm", format="A4")
    pdf.add_page()

    # Border
    pdf.set_draw_color(30, 58, 138)
    pdf.set_line_width(0.6)
    pdf.rect(8, 8, 194, 281)

    pdf.set_y(14)
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(0, 7, f"{inst_name.upper()}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "B", 9.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 5, "OFFICIAL CERTIFIED FACULTY CADRE REGISTER (AICTE 1:15/1:20 NORMS)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 4, "Formulated pursuant to AICTE Approval Process Handbook (APH 2025-26) Chapter VII", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Faculty Table
    pdf.set_fill_color(226, 232, 240)
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(10, 6, "S.No", 1, 0, "C", True)
    pdf.cell(45, 6, "Faculty Member Name", 1, 0, "L", True)
    pdf.cell(38, 6, "Cadre / Designation", 1, 0, "L", True)
    pdf.cell(42, 6, "Department", 1, 0, "L", True)
    pdf.cell(45, 6, "Highest Qualification", 1, 1, "L", True)

    pdf.set_font("helvetica", "", 7.5)
    faculty_list = [
        ("1", "Dr. Arvind Singhania", "Principal / Professor", "Computer Science & Engg", "Ph.D (IIT Delhi)"),
        ("2", "Dr. Meenakshi Sundaram", "Professor & HoD", "Electronics & Comm. Engg", "Ph.D (IISc Bangalore)"),
        ("3", "Dr. Rajesh K. Varma", "Associate Professor", "Computer Science & Engg", "Ph.D (NIT Trichy)"),
        ("4", "Prof. Ananya Sen", "Assistant Professor", "Computer Science & Engg", "M.Tech (Jadavpur University)"),
        ("5", "Prof. Sunil Deshmukh", "Assistant Professor", "Mechanical Engineering", "M.Tech (VNIT Nagpur)"),
        ("6", "Dr. Kavita Sharma", "Associate Professor", "Information Technology", "Ph.D (DTU Delhi)"),
        ("7", "Prof. R. P. Gupta", "Assistant Professor", "Applied Mathematics", "M.Sc, CSIR-NET"),
        ("8", "Dr. Vivek Chawla", "Associate Professor", "Electronics & Comm. Engg", "Ph.D (BITS Pilani)"),
        ("9", "Prof. Priyanka Nair", "Assistant Professor", "Computer Science & Engg", "M.Tech (IIIT Hyderabad)"),
        ("10", "Prof. Alok Tiwari", "Assistant Professor", "Civil Engineering", "M.Tech (IIT Roorkee)")
    ]
    for sno, name, desig, dept, qual in faculty_list:
        pdf.cell(10, 5.2, sno, 1, 0, "C")
        pdf.cell(45, 5.2, name, 1, 0, "L")
        pdf.cell(38, 5.2, desig, 1, 0, "L")
        pdf.cell(42, 5.2, dept, 1, 0, "L")
        pdf.cell(45, 5.2, qual, 1, 1, "L")

    pdf.ln(6)
    pdf.set_font("helvetica", "B", 8)
    pdf.cell(0, 4.5, "Cadre Compliance Ratio Summary:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 7.5)
    if not is_deficient:
        pdf.cell(0, 4, "Total Sanctioned Faculty: 48  |  Professor: 6  |  Associate Professor: 12  |  Assistant Professor: 30", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 4, "Overall Faculty-to-Student Cadre Ratio: 1:17.5 (Fully compliant with AICTE norms <= 1:20)", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.cell(0, 4, "Total Sanctioned Faculty: 28  |  Professor: 2  |  Associate Professor: 6  |  Assistant Professor: 20", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 4, "Overall Faculty-to-Student Cadre Ratio: 1:28.5 (Deficit detected: exceeds mandatory ceiling of 1:20)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(12)

    pdf.set_font("helvetica", "B", 8.5)
    pdf.cell(100, 5, "Date of Endorsement: 10-01-2025")
    pdf.cell(0, 5, "PRINCIPAL & HEAD OF INSTITUTION", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8)
    pdf.cell(100, 4, "Certified that all listed faculty are in active service.")
    pdf.cell(0, 4, f"{inst_name}", align="R")

    pdf.output(output_path)

def generate_all_showcase_dossiers(base_dir: str):
    base = Path(base_dir)
    dossier_a = base / "Dossier_A_Compliant"
    dossier_b = base / "Dossier_B_Deficiencies_Detected"
    dossier_a.mkdir(parents=True, exist_ok=True)
    dossier_b.mkdir(parents=True, exist_ok=True)

    # Dossier A: Fully Compliant
    inst_a = "Apex National Institute of Technology, Pune"
    create_affidavit_pdf(str(dossier_a / "01_Affidavit_Notarized_EStamp.pdf"), inst_a, "5.25", is_deficient=False)
    create_noc_pdf(str(dossier_a / "02_University_NOC_Affiliation.pdf"), inst_a, "30-06-2028", is_deficient=False)
    create_floorplan_pdf(str(dossier_a / "03_Architectural_Floor_Plan.pdf"), inst_a, "5.25", "4850.00", is_deficient=False)
    create_accreditation_pdf(str(dossier_a / "04_NAAC_Accreditation_Certificate.pdf"), inst_a, "31-12-2028")
    create_previous_eoa_pdf(str(dossier_a / "05_Previous_AICTE_EoA_Approval.pdf"), inst_a)
    create_faculty_pdf(str(dossier_a / "06_Certified_Faculty_Cadre_List.pdf"), inst_a, is_deficient=False)

    # Dossier B: Deficiencies Detected
    inst_b = "Aryavart Institute of Engineering & Technology, Lucknow"
    create_affidavit_pdf(str(dossier_b / "01_Affidavit_Discrepant_Land.pdf"), inst_b, "2.50", is_deficient=True)
    create_noc_pdf(str(dossier_b / "02_University_NOC_Expired_Lapsed.pdf"), inst_b, "15-05-2024", is_deficient=True)
    create_floorplan_pdf(str(dossier_b / "03_Architectural_Plan_Deficient_BuiltUp.pdf"), inst_b, "5.25", "2800.00", is_deficient=True)
    create_accreditation_pdf(str(dossier_b / "04_NAAC_Certificate_Expiring_Soon.pdf"), inst_b, "15-04-2025")
    create_previous_eoa_pdf(str(dossier_b / "05_Previous_AICTE_EoA_Approval.pdf"), inst_b)
    create_faculty_pdf(str(dossier_b / "06_Certified_Faculty_Cadre_List.pdf"), inst_b, is_deficient=True)

    print(f"Generated 6 Polished Compliant Documents in: {dossier_a}")
    print(f"Generated 6 Polished Deficient Documents in: {dossier_b}")

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "./sample_documents"
    generate_all_showcase_dossiers(out)
