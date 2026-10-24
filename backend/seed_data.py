import os
import uuid
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from database import SessionLocal, Base, engine, UPLOADS_DIR, REPORTS_DIR
from models import (
    Application, Document, ExtractedField, ComplianceRule,
    VerificationFinding, SyntheticReferenceRecord, Report, AuditEvent
)
from ai_extractor import extractor
from verification_engine import VerificationEngine

def create_sample_pdf(file_path: str, title: str, org_name: str, doc_category: str, fields: dict, pages: int = 2):
    """Generate a realistic test PDF with styled headers and tabular metadata."""
    doc = SimpleDocTemplate(file_path, pagesize=letter, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()

    navy = colors.HexColor("#0f172a")
    teal = colors.HexColor("#0f766e")
    gray_100 = colors.HexColor("#f8fafc")
    gray_300 = colors.HexColor("#cbd5e1")

    title_style = ParagraphStyle(
        "DocHeader",
        parent=styles["Heading1"],
        fontSize=15,
        leading=18,
        textColor=navy,
        alignment=1, # Center
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "SubHeader",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        textColor=teal,
        alignment=1, # Center
        spaceAfter=15
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=navy
    )

    story = []

    # Page 1
    story.append(Paragraph(title.upper(), title_style))
    story.append(Paragraph("GOVERNMENT REGULATORY COMPLIANCE ARCHIVE &bull; OFFICIAL COPY", subtitle_style))

    table_rows = [
        [Paragraph("<b>Parameter</b>", body_style), Paragraph("<b>Verified Value / Details</b>", body_style)],
        [Paragraph("<b>Institution Name:</b>", body_style), Paragraph(org_name, body_style)],
    ]
    for k, v in fields.items():
        table_rows.append([Paragraph(f"<b>{k}:</b>", body_style), Paragraph(str(v), body_style)])

    tbl = Table(table_rows, colWidths=[180, 330])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('BOX', (0, 0), (-1, -1), 1, gray_300),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, gray_300),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 15))

    story.append(Paragraph(
        "<b>Certification Clause:</b> This document certifies that the aforementioned institution has complied with the "
        "applicable statutory standards for infrastructural and academic operation under regulatory inspection norms. "
        "All parameters recorded herein are legally binding and subject to cross-verification during annual extension of approval.",
        body_style
    ))
    story.append(Spacer(1, 25))

    story.append(Paragraph(
        "<b>Authorized Signatory:</b> Competent Authority Directorate<br/>"
        "<b>Digital Seal:</b> VERIFIED-STAMP-IND-2025-SECURE<br/>"
        "<i>Page 1 of 2</i>",
        body_style
    ))

    # Page 2
    if pages > 1:
        from reportlab.platypus import PageBreak
        story.append(PageBreak())
        story.append(Paragraph(f"{title.upper()} - ANNEXURE I (SCHEDULE OF PARTICULARS)", title_style))
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            f"<b>Institution Name:</b> {org_name}<br/>"
            f"<b>Category:</b> {doc_category}<br/>"
            "<b>Survey & Boundary Verification:</b> Coordinates inspected by Regional Revenue Division.<br/>"
            "<b>Building Inspection:</b> Compliant with National Building Code (NBC-2016) Part IV.<br/>"
            "<b>Sanitary & Fire Safety:</b> Certified pursuant to Section 13 of Fire Prevention Act.<br/>"
            "<i>Page 2 of 2</i>",
            body_style
        ))

    doc.build(story)

def seed_database():
    """Initializes tables and populates illustrative compliance data and demo applications."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed Compliance Rules
    if db.query(ComplianceRule).count() == 0:
        rules_data = [
            {
                "rule_id": "AICTE-REQ-DOC-01",
                "name": "Mandatory Regulatory Documents Checklist",
                "category": "COMPLETENESS",
                "description": "Verifies that all 5 statutory baseline documents are submitted: Land Title Deed, Approved Building Plan, Fire Safety NOC, Previous AICTE EOA, and Society/Trust Deed.",
                "official_reference": "AICTE Approval Process Handbook (APH) 2025-26, Chapter II, Clause 2.3",
                "required_documents": "LAND_TITLE_DEED,BUILDING_APPROVAL_PLAN,FIRE_SAFETY_NOC,AICTE_PREVIOUS_APPROVAL,SOCIETY_TRUST_DEED",
                "severity": "HIGH",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-FIELD-COMPL-02",
                "name": "Mandatory Structured Fields Presence",
                "category": "COMPLETENESS",
                "description": "Ensures that core institutional metadata (PID, Institution Name, Registration Number, Issue Date) is extracted from submitted certificates.",
                "official_reference": "AICTE APH 2025-26, Clause 2.4 (Application Scrutiny Norms)",
                "required_fields": "institution_name,institution_code,certificate_number,issue_date",
                "severity": "MEDIUM",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-NAME-MATCH-01",
                "name": "Cross-Document Institution Name Consistency",
                "category": "CROSS_DOCUMENT",
                "description": "Compares institution names across all uploaded deeds, plans, and NOCs to detect unapproved name alterations or trust ownership ambiguities.",
                "official_reference": "AICTE Regulations 2020 (Establishment & Approval Norms), Regulation 4.2",
                "severity": "HIGH",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-PID-MATCH-02",
                "name": "Permanent Identifier (PID) Cross-Check",
                "category": "CROSS_DOCUMENT",
                "description": "Verifies that the AICTE Permanent Institute Identifier (PID) is identical across prior approval letters and application forms.",
                "official_reference": "AICTE APH 2025-26, Annexure 1 (Institutional Identifiers)",
                "severity": "HIGH",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-FIRE-NOC-03",
                "name": "Fire Safety NOC Temporal Validity",
                "category": "DATES_VALIDITY",
                "description": "Validates that the Fire & Life Safety Certificate remains legally valid through the operational dates of Academic Year 2025-2026.",
                "official_reference": "National Building Code (NBC) 2016 Part IV & AICTE Safety Mandates",
                "severity": "HIGH",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-REF-REG-01",
                "name": "Synthetic Reference Registry Lookup",
                "category": "REFERENCE_RECORD",
                "description": "Compares submitted institution details against the local synthetic demonstration registry (clearly labelled as synthetic data).",
                "official_reference": "VeriCore Decision Support Engine Benchmark v1.0",
                "severity": "MEDIUM",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-DUP-DETECT-01",
                "name": "Cryptographic Duplicate File & Certificate Detection",
                "category": "DUPLICATE_DETECTION",
                "description": "Calculates SHA-256 cryptographic hashes and detects repeated file uploads or recycled certificate registration numbers.",
                "official_reference": "Digital Evidence Authentication Guidelines & IT Act 2000 Section 65B",
                "severity": "HIGH",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-LAND-AREA-01",
                "name": "Minimum Land Area Norms Verification",
                "category": "COMPLETENESS",
                "description": "Verifies that institutional land area meets minimum zonal requirements (e.g. 7.5 acres in rural, 2.5 acres in urban mega cities).",
                "official_reference": "AICTE APH 2025-26, Appendix 4 (Land Norms)",
                "severity": "MEDIUM",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            },
            {
                "rule_id": "AICTE-EXTRACT-QUAL-01",
                "name": "Extraction Confidence & Optical Quality Threshold",
                "category": "EXTRACTION_QUALITY",
                "description": "Flags low-confidence parser output or poor quality scans for reviewer confirmation.",
                "official_reference": "VeriCore Document Scrutiny Protocol v2.1",
                "severity": "LOW",
                "version": "v2025.1",
                "effective_date": "2025-04-01"
            }
        ]
        for r_dict in rules_data:
            db.add(ComplianceRule(**r_dict))
        db.commit()

    # 2. Seed Synthetic Reference Records
    if db.query(SyntheticReferenceRecord).count() == 0:
        syn_records = [
            {
                "institution_code": "1-3647182910",
                "institution_name": "Apex Institute of Technology & Management",
                "reference_identifier": "REF-SYN-AICTE-KA-001",
                "state": "Karnataka",
                "approval_status": "APPROVED_IN_REGISTRY",
                "sample_registration_no": "KA-REG-2018-8472",
                "valid_from": "2018-05-15",
                "valid_to": "2027-04-30",
                "land_area_acres": 8.2,
                "last_verified": "2025-01-10"
            },
            {
                "institution_code": "1-8472910291",
                "institution_name": "Bharatiya Technical Academy",
                "reference_identifier": "REF-SYN-AICTE-MH-002",
                "state": "Maharashtra",
                "approval_status": "APPROVED_IN_REGISTRY",
                "sample_registration_no": "MH-SOC-2012-9281",
                "valid_from": "2012-07-01",
                "valid_to": "2026-06-30",
                "land_area_acres": 6.5,
                "last_verified": "2025-01-12"
            },
            {
                "institution_code": "1-9283746152",
                "institution_name": "Greenfield Polytechnic Institute",
                "reference_identifier": "REF-SYN-AICTE-TS-003",
                "state": "Telangana",
                "approval_status": "PROVISIONAL_IN_REGISTRY",
                "sample_registration_no": "TS-TECH-2020-1029",
                "valid_from": "2020-08-20",
                "valid_to": "2026-07-31",
                "land_area_acres": 5.0,
                "last_verified": "2025-01-14"
            },
            {
                "institution_code": "1-1029384756",
                "institution_name": "National Institute of Advanced Studies",
                "reference_identifier": "REF-SYN-AICTE-DL-004",
                "state": "Delhi",
                "approval_status": "APPROVED_IN_REGISTRY",
                "sample_registration_no": "DL-UNIV-2015-3819",
                "valid_from": "2015-06-01",
                "valid_to": "2028-05-31",
                "land_area_acres": 12.0,
                "last_verified": "2025-01-15"
            }
        ]
        for s_dict in syn_records:
            db.add(SyntheticReferenceRecord(**s_dict))
        db.commit()

    # 3. Seed Realistic Demo Applications with real PDF documents!
    if db.query(Application).count() == 0:
        apps_data = [
            {
                "application_number": "APP-2026-AICTE-0101",
                "institution_name": "Apex Institute of Technology & Management",
                "institution_code": "1-3647182910",
                "category": "Engineering & Technology",
                "application_category": "Extension of Approval (EOA)",
                "state": "Karnataka",
                "city": "Bengaluru",
                "academic_year": "2025-2026",
                "contact_email": "registrar@apexinstitute.edu.in",
                "contact_phone": "+91 80 2345 6789",
                "assigned_reviewer": "Dr. A. Sharma (Senior Assessor)",
                "reviewer_notes": "All mandatory statutory documents submitted. Land deed and building plan cross-matched cleanly. Recommended for EOA approval.",
                "reviewer_recommendation": "APPROVED"
            },
            {
                "application_number": "APP-2026-AICTE-0102",
                "institution_name": "Bharatiya Technical Academy",
                "institution_code": "1-8472910291",
                "category": "Engineering & Technology",
                "application_category": "Increase in Intake",
                "state": "Maharashtra",
                "city": "Pune",
                "academic_year": "2025-2026",
                "contact_email": "director@bta-pune.ac.in",
                "contact_phone": "+91 20 2891 0293",
                "assigned_reviewer": "Prof. V. Raman (Compliance Specialist)",
                "reviewer_notes": "Flagged critical discrepancy: Fire Safety NOC expired on 15-Mar-2025. Furthermore, Fire NOC document name reads 'Bharatiya Polytechnic College'. Clarification required.",
                "reviewer_recommendation": "REVISE_AND_RESUBMIT"
            },
            {
                "application_number": "APP-2026-AICTE-0103",
                "institution_name": "Greenfield Polytechnic Institute",
                "institution_code": "1-9283746152",
                "category": "Polytechnic",
                "application_category": "Extension of Approval (EOA)",
                "state": "Telangana",
                "city": "Hyderabad",
                "academic_year": "2025-2026",
                "contact_email": "principal@greenfieldpoly.edu.in",
                "contact_phone": "+91 40 4928 1726",
                "assigned_reviewer": "Dr. A. Sharma (Senior Assessor)",
                "reviewer_notes": "Mandatory Land Title Deed missing from submission package. Duplicate certificate identifier flagged in Building Approval plan.",
                "reviewer_recommendation": "PENDING"
            },
            {
                "application_number": "APP-2026-AICTE-0104",
                "institution_name": "National Institute of Advanced Studies",
                "institution_code": "1-1029384756",
                "category": "Technical University",
                "application_category": "New Institution Approval",
                "state": "Delhi",
                "city": "New Delhi",
                "academic_year": "2025-2026",
                "contact_email": "dean.academic@nias-delhi.gov.in",
                "contact_phone": "+91 11 2678 9012",
                "assigned_reviewer": "Prof. V. Raman (Compliance Specialist)",
                "reviewer_notes": "",
                "reviewer_recommendation": "PENDING"
            }
        ]

        created_apps = []
        for a_dict in apps_data:
            app_obj = Application(**a_dict)
            db.add(app_obj)
            db.flush()
            created_apps.append(app_obj)

        # Generate sample PDF documents for App 1 (Apex Institute)
        app1 = created_apps[0]
        app1_docs = [
            ("Apex_Land_Title_Deed.pdf", "Registered Land Title Deed & Ownership Record", "LAND_TITLE_DEED", {
                "PID / Permanent ID": "1-3647182910",
                "Deed Number": "KA-BLR-DEED-2018-994",
                "Land Area": "8.20 Acres",
                "Survey No": "Sy. No. 42/1 & 43/2, Whitefield Hobli",
                "Issue Date": "15/05/2018"
            }, "Apex Institute of Technology & Management"),
            ("Apex_Building_Approval_Plan.pdf", "Sanctioned Master Building Plan & NOC", "BUILDING_APPROVAL_PLAN", {
                "PID / Permanent ID": "1-3647182910",
                "Sanction Number": "BBMP/BPA/2019/3821",
                "Built-up Area": "22,450 Sq. Meters",
                "Issue Date": "10/06/2019"
            }, "Apex Institute of Technology & Management"),
            ("Apex_Fire_Safety_NOC.pdf", "Fire & Emergency Services Safety NOC", "FIRE_SAFETY_NOC", {
                "PID / Permanent ID": "1-3647182910",
                "NOC Number": "FS/KA/BNG/2024/7712",
                "Issue Date": "05/04/2024",
                "Expiry Date": "30/04/2027"
            }, "Apex Institute of Technology & Management"),
            ("Apex_AICTE_Prior_EOA.pdf", "AICTE Prior Extension of Approval (EOA) Order", "AICTE_PREVIOUS_APPROVAL", {
                "PID / Permanent ID": "1-3647182910",
                "Order Number": "F.No. South-West/1-3647182910/2024/EOA",
                "Academic Year": "2024-2025",
                "Issue Date": "28/05/2024"
            }, "Apex Institute of Technology & Management"),
            ("Apex_Society_Registration_Deed.pdf", "Registered Trust & Society Deed", "SOCIETY_TRUST_DEED", {
                "Society Name": "Apex Educational Foundation Trust",
                "Registration Number": "SOC-KA-4819-2014",
                "Issue Date": "12/03/2014"
            }, "Apex Institute of Technology & Management")
        ]

        for fname, title, category, fields, org_name in app1_docs:
            pdf_path = os.path.join(UPLOADS_DIR, fname)
            create_sample_pdf(pdf_path, title, org_name, category, fields, pages=2)
            file_size = os.path.getsize(pdf_path)
            doc_obj = Document(
                application_id=app1.id,
                filename=fname,
                original_name=fname,
                file_path=pdf_path,
                file_size=file_size,
                mime_type="application/pdf",
                document_category=category,
                extraction_status="EXTRACTED",
                extraction_method="LOCAL_DETERMINISTIC_PARSER",
                page_count=2,
                confidence_score=0.95
            )
            db.add(doc_obj)
            db.flush()

            # Run extraction and populate ExtractedField rows
            ext_res = extractor.extract_document(pdf_path, "application/pdf", category)
            doc_obj.file_hash = ext_res["file_hash"]
            for f in ext_res["fields"]:
                field_obj = ExtractedField(
                    document_id=doc_obj.id,
                    field_key=f["field_key"],
                    field_label=f["field_label"],
                    extracted_value=f["extracted_value"],
                    confidence_score=f["confidence"],
                    source_page=f["source_page"],
                    bounding_box=f["bounding_box"],
                    verification_status="VERIFIED"
                )
                db.add(field_obj)

        # Generate sample PDF documents for App 2 (Bharatiya Academy - Intentionally Flagged Discrepancies)
        app2 = created_apps[1]
        app2_docs = [
            ("BTA_Land_Title_Deed.pdf", "Registered Land Title Deed", "LAND_TITLE_DEED", {
                "PID / Permanent ID": "1-8472910291",
                "Deed Number": "MH-PUN-DEED-2012-402",
                "Land Area": "6.50 Acres",
                "Issue Date": "12/07/2012"
            }, "Bharatiya Technical Academy"),
            ("BTA_Building_Plan_Sanction.pdf", "Approved Municipal Building Plan", "BUILDING_APPROVAL_PLAN", {
                "PID / Permanent ID": "1-8472910291",
                "Sanction Number": "PMC/ENG/2015/992",
                "Issue Date": "14/08/2015"
            }, "Bharatiya Technical Academy"),
            ("BTA_Fire_Safety_NOC_Expired.pdf", "Fire Safety Compliance Certificate", "FIRE_SAFETY_NOC", {
                "PID / Permanent ID": "1-8472910291",
                "NOC Number": "FS/MH/PUN/2022/108",
                "Issue Date": "15/03/2022",
                "Expiry Date": "15/03/2025" # Expired!
            }, "Bharatiya Polytechnic College"), # Discrepant institution name!
            ("BTA_AICTE_Prior_EOA.pdf", "AICTE Prior Extension of Approval", "AICTE_PREVIOUS_APPROVAL", {
                "PID / Permanent ID": "1-8472910291",
                "Order Number": "F.No. Western/1-8472910291/2024/EOA",
                "Academic Year": "2024-2025",
                "Issue Date": "18/06/2024"
            }, "Bharatiya Technical Academy"),
            ("BTA_Society_Trust_Deed.pdf", "Registered Trust Memorandum", "SOCIETY_TRUST_DEED", {
                "Society Name": "Bharatiya Shikshan Sanstha",
                "Registration Number": "MH-SOC-2012-9281",
                "Issue Date": "05/01/2012"
            }, "Bharatiya Technical Academy")
        ]

        for fname, title, category, fields, org_name in app2_docs:
            pdf_path = os.path.join(UPLOADS_DIR, fname)
            create_sample_pdf(pdf_path, title, org_name, category, fields, pages=2)
            file_size = os.path.getsize(pdf_path)
            doc_obj = Document(
                application_id=app2.id,
                filename=fname,
                original_name=fname,
                file_path=pdf_path,
                file_size=file_size,
                mime_type="application/pdf",
                document_category=category,
                extraction_status="EXTRACTED",
                extraction_method="LOCAL_DETERMINISTIC_PARSER",
                page_count=2,
                confidence_score=0.92
            )
            db.add(doc_obj)
            db.flush()

            ext_res = extractor.extract_document(pdf_path, "application/pdf", category)
            doc_obj.file_hash = ext_res["file_hash"]
            for f in ext_res["fields"]:
                field_obj = ExtractedField(
                    document_id=doc_obj.id,
                    field_key=f["field_key"],
                    field_label=f["field_label"],
                    extracted_value=f["extracted_value"],
                    confidence_score=f["confidence"],
                    source_page=f["source_page"],
                    bounding_box=f["bounding_box"],
                    verification_status="WARNING" if "Polytechnic" in str(f["extracted_value"]) or "2025" in str(f["extracted_value"]) else "VERIFIED"
                )
                db.add(field_obj)

        # Generate sample PDF documents for App 3 (Greenfield - Missing Land title deed, duplicate cert no)
        app3 = created_apps[2]
        app3_docs = [
            ("Greenfield_Building_Approval.pdf", "Approved Building Sanction Letter", "BUILDING_APPROVAL_PLAN", {
                "PID / Permanent ID": "1-9283746152",
                "Sanction Number": "GHMC/BP/2021/774", # Duplicate number
                "Issue Date": "19/09/2021"
            }, "Greenfield Polytechnic Institute"),
            ("Greenfield_Fire_Safety_NOC.pdf", "Fire Safety NOC Certificate", "FIRE_SAFETY_NOC", {
                "PID / Permanent ID": "1-9283746152",
                "NOC Number": "GHMC/BP/2021/774", # Intentionally duplicate certificate number
                "Issue Date": "10/05/2024",
                "Expiry Date": "10/05/2027"
            }, "Greenfield Polytechnic Institute"),
            ("Greenfield_AICTE_Prior_EOA.pdf", "AICTE Prior EOA Letter", "AICTE_PREVIOUS_APPROVAL", {
                "PID / Permanent ID": "1-9283746152",
                "Order Number": "F.No. South-Central/1-9283746152/2024/EOA",
                "Academic Year": "2024-2025",
                "Issue Date": "22/06/2024"
            }, "Greenfield Polytechnic Institute")
        ]

        for fname, title, category, fields, org_name in app3_docs:
            pdf_path = os.path.join(UPLOADS_DIR, fname)
            create_sample_pdf(pdf_path, title, org_name, category, fields, pages=2)
            file_size = os.path.getsize(pdf_path)
            doc_obj = Document(
                application_id=app3.id,
                filename=fname,
                original_name=fname,
                file_path=pdf_path,
                file_size=file_size,
                mime_type="application/pdf",
                document_category=category,
                extraction_status="EXTRACTED",
                extraction_method="LOCAL_DETERMINISTIC_PARSER",
                page_count=2,
                confidence_score=0.90
            )
            db.add(doc_obj)
            db.flush()

            ext_res = extractor.extract_document(pdf_path, "application/pdf", category)
            doc_obj.file_hash = ext_res["file_hash"]
            for f in ext_res["fields"]:
                field_obj = ExtractedField(
                    document_id=doc_obj.id,
                    field_key=f["field_key"],
                    field_label=f["field_label"],
                    extracted_value=f["extracted_value"],
                    confidence_score=f["confidence"],
                    source_page=f["source_page"],
                    bounding_box=f["bounding_box"]
                )
                db.add(field_obj)

        db.commit()

        # 4. Run automated verification engine on all seeded applications
        engine_runner = VerificationEngine(db)
        for app in created_apps[:3]: # Run on first 3
            engine_runner.run_assessment(app.id, actor="System Seeder")

        # 5. Seed initial audit events
        audit1 = AuditEvent(
            application_id=app1.id,
            event_type="APPLICATION_CREATED",
            actor="Registrar (Apex Institute)",
            details="Application package APP-2026-AICTE-0101 submitted with 5 supporting PDF documents."
        )
        audit2 = AuditEvent(
            application_id=app2.id,
            event_type="ASSESSMENT_RUN",
            actor="Dr. A. Sharma (Senior Assessor)",
            details="Automated compliance assessment flagged 2 High Severity findings (Expired Fire NOC & Name mismatch)."
        )
        db.add(audit1)
        db.add(audit2)
        db.commit()

    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
