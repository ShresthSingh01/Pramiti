"""
Generates the official reference AICTE Approval Process Handbook (APH 2025-26) PDF
with structured chapters, section bookmarks, and regulatory norms tables for PageIndex.
"""
from pathlib import Path
import fitz # PyMuPDF

def build_reference_aph_pdf(output_path: Path):
    doc = fitz.open()

    # Cover Page
    page1 = doc.new_page()
    rect = page1.rect
    page1.insert_text(fitz.Point(72, 120), "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.5))
    page1.insert_text(fitz.Point(72, 145), "Ministry of Education, Government of India", fontsize=12, fontname="helv", color=(0.3, 0.3, 0.3))
    page1.insert_text(fitz.Point(72, 200), "APPROVAL PROCESS HANDBOOK (APH) 2025-2026", fontsize=20, fontname="helv", color=(0, 0, 0))
    page1.insert_text(fitz.Point(72, 230), "Statutory Regulations, Norms, and Scrutiny Guidelines for Extension of Approval (EoA)", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    
    page1.insert_text(fitz.Point(72, 320), "TABLE OF CONTENTS", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
    page1.insert_text(fitz.Point(72, 350), "Chapter I: Land Requirements and Campus Infrastructure Norms (Page 2)", fontsize=10, fontname="helv")
    page1.insert_text(fitz.Point(72, 375), "Chapter II: Institutional Legal Entity and Sworn Affidavits (Page 3)", fontsize=10, fontname="helv")
    page1.insert_text(fitz.Point(72, 400), "Chapter III: Affiliation, University NOC, and State Approvals (Page 4)", fontsize=10, fontname="helv")
    page1.insert_text(fitz.Point(72, 425), "Chapter IV: Built-Up Instructional, Administrative, and Amenities Area (Page 5)", fontsize=10, fontname="helv")
    page1.insert_text(fitz.Point(72, 450), "Chapter VII: Faculty Cadre Ratio, Qualifications, and Cadre Distribution (Page 6)", fontsize=10, fontname="helv")

    # Chapter 1: Land Requirements
    page2 = doc.new_page()
    page2.insert_text(fitz.Point(72, 70), "CHAPTER I: LAND REQUIREMENTS AND SITE NORMS", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
    page2.insert_text(fitz.Point(72, 95), "Section 1.4: Mandatory Minimum Land Parcel Norms for Technical Institutions", fontsize=11, fontname="helv", color=(0, 0, 0))
    
    text_ch1 = """Clause 1.4.1 (Statutory Land Thresholds):
Every technical institution applying for Extension of Approval (EoA) or establishment of new technical institutions must possess continuous and unencumbered land as per Table 1.1.

Table 1.1: Minimum Land Requirement for Degree Engineering / Technology Programs:
- Mega and Metro Cities: Minimum 1.50 Acres (contiguous)
- Urban Locations (Other State Capitals and Tier-II Cities): Minimum 2.50 Acres (contiguous)
- Rural Areas: Minimum 4.00 Acres (contiguous)
- Hilly Areas / North Eastern States: Minimum 1.00 Acre (contiguous)

Clause 1.4.2 (Land Document Integrity and Demarcation):
The land must be registered in the name of the sponsoring Trust/Society/Company through a valid sale deed or lease of at least 30 years. The campus area stated in the Registered Affidavit must reconcile with the Architect Site Plan and Khasra mutation record within an allowable discrepancy limit not exceeding 2.0%. Any variation exceeding 2.0% shall be flagged as a critical regulatory conflict."""
    page2.insert_textbox(fitz.Rect(72, 115, 520, 700), text_ch1, fontsize=10, fontname="helv")

    # Chapter 2: Legal Entity & Affidavits
    page3 = doc.new_page()
    page3.insert_text(fitz.Point(72, 70), "CHAPTER II: LEGAL ENTITY, TRUST DEEDS, AND AFFIDAVITS", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
    page3.insert_text(fitz.Point(72, 95), "Section 2.1 & 2.4: Deponent Requirements and Non-Judicial E-Stamping", fontsize=11, fontname="helv", color=(0, 0, 0))
    
    text_ch2 = """Clause 2.1.1 (Entity Consistency):
The institution legal name specified across all statutory filings, including university affiliation and title deeds, must precisely match the AICTE application portal record. In the event of a change of name, approval from the AICTE Competent Authority and a State Gazette notification are strictly mandatory.

Clause 2.4.1 (Sworn Affidavit Submission):
Every applicant institution must submit an e-notarized affidavit on non-judicial e-stamp paper issued by an authorized repository (such as SHCIL) of minimum INR 100 value. 
The deponent must be the Chairman, President, or Secretary of the sponsoring Society or Trust. 

Clause 2.4.2 (Non-Encumbrance Affirmation):
The affidavit must contain a sworn affirmation declaring:
1. That the land parcel is entirely unencumbered and free from any legal disputes.
2. That all statutory approvals and university affiliations are active and un-expired.
3. That cadre salaries adhere to Seventh Central Pay Commission (7th CPC) guidelines."""
    page3.insert_textbox(fitz.Rect(72, 115, 520, 700), text_ch2, fontsize=10, fontname="helv")

    # Chapter 3: University NOC & Affiliation
    page4 = doc.new_page()
    page4.insert_text(fitz.Point(72, 70), "CHAPTER III: UNIVERSITY AFFILIATION AND STATE NOC", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
    page4.insert_text(fitz.Point(72, 95), "Section 3.1 & 3.4: Active University Affiliation and NOC Validity", fontsize=11, fontname="helv", color=(0, 0, 0))
    
    text_ch3 = """Clause 3.1.1 (Mandatory Affiliation Continuity):
No technical institution shall be granted Extension of Approval (EoA) unless it possesses a valid and active affiliation order issued by the affiliating State Technological University or Central University for the relevant academic year.

Clause 3.4.2 (Lapsed or Expired Affiliation):
If the university affiliation order or provisional continuation endorsement expires prior to the regulatory cut-off date of the approval cycle, the application status shall be designated as EXPIRED / MISMATCH_DETECTED. 

Institutions with lapsed affiliation orders must produce a formal university continuation endorsement or acknowledgment of provisional affiliation extension prior to final scrutiny sign-off."""
    page4.insert_textbox(fitz.Rect(72, 115, 520, 700), text_ch3, fontsize=10, fontname="helv")

    # Chapter 4: Built-Up Area Norms
    page5 = doc.new_page()
    page5.insert_text(fitz.Point(72, 70), "CHAPTER IV: BUILT-UP INSTRUCTIONAL AND ADMINISTRATIVE AREA", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
    page5.insert_text(fitz.Point(72, 95), "Section 4.4: Table 4.1 Norms for Space and Floor Area", fontsize=11, fontname="helv", color=(0, 0, 0))
    
    text_ch4 = """Clause 4.4.1 (Minimum Built-Up Area Requirements):
Institutions offering technical programs must provide adequate instructional, administrative, and amenities built-up area as specified in Table 4.1.

Table 4.1: Built-Up Space Norms for Undergraduate Engineering and Technology:
- For Sanctioned Intake up to 360 Students: Minimum 4,000.00 Sqm total instructional and administrative built-up area.
- Additional Intake of 60 Students: Incremental 500.00 Sqm instructional area.
- Classroom Dimensions: Minimum 66 Sqm per classroom with 1:1 projection facility.
- Laboratories and Workshop: Minimum 200 Sqm specialized workshop space.

Clause 4.4.3 (Architectural Certification):
The floor plans and total built-up area schedule must be signed and certified by an architect registered with the Council of Architecture (CoA) bearing a valid CA license registration number."""
    page5.insert_textbox(fitz.Rect(72, 115, 520, 700), text_ch4, fontsize=10, fontname="helv")

    # Chapter 7: Faculty Cadre Ratio
    page6 = doc.new_page()
    page6.insert_text(fitz.Point(72, 70), "CHAPTER VII: FACULTY CADRE RATIO AND APPOINTMENTS", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
    page6.insert_text(fitz.Point(72, 95), "Section 7.1: Table 7.1 Faculty Cadre Distribution and Student-Faculty Ratio", fontsize=11, fontname="helv", color=(0, 0, 0))
    
    text_ch7 = """Clause 7.1.1 (Student to Faculty Ratio):
Every technical institution must maintain a Student to Faculty Ratio (SFR) as specified below:
- Undergraduate Engineering / Technology (B.E. / B.Tech): 1:15 ratio (1 faculty member per 15 students).
- Diploma / Polytechnic Programs: 1:20 ratio.
- Postgraduate Programs (M.E. / M.Tech / MBA / MCA): 1:12 ratio.

Clause 7.1.2 (Cadre Distribution Proportion):
For every 1 Professor, there must be 2 Associate Professors and 6 Assistant Professors (Cadre Ratio of 1:2:6).
All faculty members must be approved and endorsed by the Affiliating University Selection Committee."""
    page6.insert_textbox(fitz.Rect(72, 115, 520, 700), text_ch7, fontsize=10, fontname="helv")

    # Add PDF Bookmarks / Outline (ToC) for PageIndex
    toc = [
        [1, "AICTE Approval Process Handbook 2025-26", 1],
        [1, "Chapter I: Land Requirements", 2],
        [2, "Section 1.4: Mandatory Minimum Land Parcel Norms", 2],
        [1, "Chapter II: Legal Entity & Affidavits", 3],
        [2, "Section 2.1 & 2.4: E-Stamping & Affidavits", 3],
        [1, "Chapter III: University Affiliation & NOC", 4],
        [2, "Section 3.1 & 3.4: Affiliation Validity", 4],
        [1, "Chapter IV: Built-Up Space Norms", 5],
        [2, "Section 4.4: Table 4.1 Floor Area Schedules", 5],
        [1, "Chapter VII: Faculty Cadre Ratio", 6],
        [2, "Section 7.1: Table 7.1 Student to Faculty Ratio", 6],
    ]
    doc.set_toc(toc)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_path))
    doc.close()
    print(f"Generated Reference AICTE APH PDF at: {output_path}")

if __name__ == "__main__":
    out = Path("d:/SIH26/aicte_handbook/AICTE_APH_2025_26_Regulations.pdf")
    build_reference_aph_pdf(out)
