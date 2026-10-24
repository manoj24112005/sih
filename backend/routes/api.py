import os
import shutil
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import or_, desc

from database import SessionLocal, UPLOADS_DIR, REPORTS_DIR
from models import (
    Application, Document, ExtractedField, ComplianceRule,
    VerificationFinding, SyntheticReferenceRecord, Report, AuditEvent
)
from ai_extractor import extractor
from verification_engine import VerificationEngine
from report_generator import generate_pdf_report
from seed_data import seed_database

api_bp = Blueprint("api", __name__, url_prefix="/api")

# Helper for database session
def get_session():
    return SessionLocal()

# --------------------------------------------------------------------------
# 1. HEALTH & SYSTEM STATUS
# --------------------------------------------------------------------------
@api_bp.route("/health", methods=["GET"])
def health_check():
    db = get_session()
    try:
        app_count = db.query(Application).count()
        db_status = "HEALTHY"
    except Exception as e:
        db_status = f"UNHEALTHY ({str(e)})"
    finally:
        db.close()

    tesseract_available = False
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        tesseract_available = True
    except Exception:
        tesseract_available = False

    return jsonify({
        "status": "UP",
        "service": "VeriCore Regulatory Compliance & Verification API",
        "version": "1.0.0-SIH26261",
        "timestamp": datetime.utcnow().isoformat(),
        "database": {
            "status": db_status,
            "engine": "SQLite 3",
            "active_applications": app_count if db_status == "HEALTHY" else 0
        },
        "components": {
            "pdf_parser": "PyMuPDF (fitz) v2.0 Active",
            "ocr_engine": "Tesseract OCR" if tesseract_available else "Graceful Fallback Mode (Heuristic / Embedded)",
            "ocr_available": tesseract_available,
            "ai_extractor": "Local Deterministic NLP Engine Active",
            "llm_provider": os.getenv("AI_PROVIDER", "None (Deterministic Engine Default)"),
            "report_generator": "ReportLab Enterprise Engine Active"
        },
        "demo_mode": {
            "enabled": True,
            "disclaimer": "Local prototype demonstration for SIH26261. Not an official AICTE authority."
        }
    })

@api_bp.route("/docs/sih-pdf", methods=["GET"])
def download_sih_documentation_pdf():
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    pdf_path = os.path.join(root_dir, "SIH26261_VeriCore_Project_Documentation.pdf")
    if not os.path.exists(pdf_path):
        from generate_sih_documentation_pdf import build_pdf
        build_pdf(pdf_path)
    return send_file(
        pdf_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="SIH26261_VeriCore_Project_Documentation.pdf"
    )

# 2. OVERVIEW DASHBOARD
# --------------------------------------------------------------------------
@api_bp.route("/dashboard", methods=["GET"])
def get_dashboard_summary():
    db = get_session()
    try:
        applications = db.query(Application).all()
        findings = db.query(VerificationFinding).all()

        total_apps = len(applications)
        awaiting_review = sum(1 for a in applications if a.status in ["PENDING_REVIEW", "IN_REVIEW"])
        flagged_discrepancies = sum(1 for a in applications if a.status == "FLAGGED_DISCREPANCIES")
        completed_reviews = sum(1 for a in applications if a.status in ["VERIFIED_COMPLIANT", "REJECTED"])

        # Findings breakdown
        open_findings = [f for f in findings if f.status == "OPEN"]
        high_severity = sum(1 for f in open_findings if f.severity in ["HIGH", "CRITICAL"])
        medium_severity = sum(1 for f in open_findings if f.severity == "MEDIUM")
        low_severity = sum(1 for f in open_findings if f.severity in ["LOW", "INFO"])

        # Status distribution
        status_dist = {}
        for a in applications:
            status_dist[a.status] = status_dist.get(a.status, 0) + 1

        # Category distribution
        cat_dist = {}
        for a in applications:
            cat_dist[a.category] = cat_dist.get(a.category, 0) + 1

        # Priority review queue (applications with open high severity findings)
        priority_queue = []
        for a in applications:
            app_high_findings = [f for f in a.findings if f.severity in ["HIGH", "CRITICAL"] and f.status == "OPEN"]
            if app_high_findings or a.status == "FLAGGED_DISCREPANCIES":
                priority_queue.append({
                    "id": a.id,
                    "application_number": a.application_number,
                    "institution_name": a.institution_name,
                    "status": a.status,
                    "urgent_findings": len(app_high_findings),
                    "created_at": a.created_at.isoformat() if a.created_at else None
                })

        # Recent activities
        recent_audits = db.query(AuditEvent).order_by(desc(AuditEvent.timestamp)).limit(8).all()

        return jsonify({
            "kpis": {
                "total_applications": total_apps,
                "awaiting_review": awaiting_review,
                "flagged_discrepancies": flagged_discrepancies,
                "completed_reviews": completed_reviews,
                "open_findings_count": len(open_findings),
                "high_severity_count": high_severity,
                "medium_severity_count": medium_severity,
                "low_severity_count": low_severity
            },
            "status_distribution": status_dist,
            "category_distribution": cat_dist,
            "priority_queue": priority_queue[:5],
            "recent_activity": [aud.to_dict() for aud in recent_audits]
        })
    finally:
        db.close()

# --------------------------------------------------------------------------
# 3. APPLICATIONS WORKSPACE
# --------------------------------------------------------------------------
@api_bp.route("/applications", methods=["GET"])
def list_applications():
    db = get_session()
    try:
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "").strip()
        category = request.args.get("category", "").strip()
        sort_by = request.args.get("sort_by", "created_at")
        sort_order = request.args.get("sort_order", "desc")
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 10))

        query = db.query(Application)

        if search:
            query = query.filter(
                or_(
                    Application.application_number.ilike(f"%{search}%"),
                    Application.institution_name.ilike(f"%{search}%"),
                    Application.institution_code.ilike(f"%{search}%"),
                    Application.city.ilike(f"%{search}%")
                )
            )

        if status and status != "ALL":
            query = query.filter(Application.status == status)

        if category and category != "ALL":
            query = query.filter(Application.category == category)

        # Sorting
        if hasattr(Application, sort_by):
            col = getattr(Application, sort_by)
            query = query.order_by(desc(col) if sort_order == "desc" else col)
        else:
            query = query.order_by(desc(Application.created_at))

        total_count = query.count()
        apps = query.offset((page - 1) * page_size).limit(page_size).all()

        return jsonify({
            "items": [a.to_dict() for a in apps],
            "pagination": {
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1
            }
        })
    finally:
        db.close()

@api_bp.route("/applications", methods=["POST"])
def create_application():
    data = request.json or {}
    institution_name = data.get("institution_name", "").strip()
    institution_code = data.get("institution_code", "").strip()

    if not institution_name or not institution_code:
        return jsonify({"error": "institution_name and institution_code are required"}), 400

    db = get_session()
    try:
        app_number = f"APP-2026-AICTE-{uuid.uuid4().hex[:6].upper()}"
        app_obj = Application(
            application_number=app_number,
            institution_name=institution_name,
            institution_code=institution_code,
            category=data.get("category", "Engineering & Technology"),
            application_category=data.get("application_category", "Extension of Approval (EOA)"),
            state=data.get("state", "Karnataka"),
            city=data.get("city", "Bengaluru"),
            academic_year=data.get("academic_year", "2025-2026"),
            contact_email=data.get("contact_email"),
            contact_phone=data.get("contact_phone"),
            assigned_reviewer=data.get("assigned_reviewer", "Dr. A. Sharma (Senior Assessor)"),
            status="PENDING_REVIEW"
        )
        db.add(app_obj)
        db.flush()

        audit = AuditEvent(
            application_id=app_obj.id,
            event_type="APPLICATION_CREATED",
            actor="Reviewer (New Application Wizard)",
            details=f"Application {app_number} created for {institution_name} ({institution_code})."
        )
        db.add(audit)
        db.commit()

        # Run verification engine once initially
        engine_runner = VerificationEngine(db)
        engine_runner.run_assessment(app_obj.id, actor="System Initializer")

        return jsonify(app_obj.to_dict()), 201
    finally:
        db.close()

@api_bp.route("/applications/<int:app_id>", methods=["GET"])
def get_application_detail(app_id: int):
    db = get_session()
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            return jsonify({"error": "Application not found"}), 404

        app_dict = app_obj.to_dict()
        app_dict["documents"] = [d.to_dict() for d in app_obj.documents]
        app_dict["findings"] = [f.to_dict() for f in app_obj.findings]
        app_dict["reports"] = [r.to_dict() for r in app_obj.reports]
        app_dict["audit_events"] = [a.to_dict() for a in app_obj.audit_events]

        return jsonify(app_dict)
    finally:
        db.close()

@api_bp.route("/applications/<int:app_id>", methods=["PATCH"])
def update_application(app_id: int):
    data = request.json or {}
    db = get_session()
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            return jsonify({"error": "Application not found"}), 404

        before_status = app_obj.status
        before_rec = app_obj.reviewer_recommendation

        if "status" in data:
            app_obj.status = data["status"]
        if "reviewer_notes" in data:
            app_obj.reviewer_notes = data["reviewer_notes"]
        if "reviewer_recommendation" in data:
            app_obj.reviewer_recommendation = data["reviewer_recommendation"]
        if "assigned_reviewer" in data:
            app_obj.assigned_reviewer = data["assigned_reviewer"]

        # Audit log
        changes = []
        if app_obj.status != before_status:
            changes.append(f"Status changed from {before_status} to {app_obj.status}")
        if app_obj.reviewer_recommendation != before_rec:
            changes.append(f"Recommendation updated to {app_obj.reviewer_recommendation}")
        if "reviewer_notes" in data:
            changes.append("Assessor notes updated")

        if changes:
            audit = AuditEvent(
                application_id=app_obj.id,
                event_type="REVIEWER_DECISION_UPDATED",
                actor=data.get("actor", "Assessor (Reviewer Desk)"),
                details="; ".join(changes),
                before_value=before_status,
                after_value=app_obj.status
            )
            db.add(audit)

        db.commit()
        return jsonify(app_obj.to_dict())
    finally:
        db.close()

# --------------------------------------------------------------------------
# 4. SUPPORTING DOCUMENTS & EXTRACTION
# --------------------------------------------------------------------------
@api_bp.route("/applications/<int:app_id>/documents", methods=["POST"])
def upload_application_document(app_id: int):
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    db = get_session()
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            return jsonify({"error": "Application not found"}), 404

        category_hint = request.form.get("category", "OTHER")
        orig_filename = secure_filename(file.filename)
        saved_filename = f"{uuid.uuid4().hex[:8]}_{orig_filename}"
        save_path = os.path.join(UPLOADS_DIR, saved_filename)
        file.save(save_path)
        file_size = os.path.getsize(save_path)
        mime_type = file.mimetype or "application/pdf"

        # Create Document record
        doc_obj = Document(
            application_id=app_id,
            filename=saved_filename,
            original_name=orig_filename,
            file_path=save_path,
            file_size=file_size,
            mime_type=mime_type,
            document_category=category_hint,
            extraction_status="PROCESSING"
        )
        db.add(doc_obj)
        db.flush()

        # Execute extraction pipeline
        ext_res = extractor.extract_document(save_path, mime_type, category_hint)
        doc_obj.file_hash = ext_res["file_hash"]
        doc_obj.page_count = ext_res["page_count"]
        doc_obj.ocr_applied = ext_res["ocr_applied"]
        doc_obj.extraction_method = ext_res["extraction_method"]
        doc_obj.document_category = ext_res["detected_category"]
        doc_obj.confidence_score = ext_res["confidence_score"]
        doc_obj.extraction_status = "EXTRACTED"

        # Populate ExtractedFields
        for f in ext_res["fields"]:
            field_obj = ExtractedField(
                document_id=doc_obj.id,
                field_key=f["field_key"],
                field_label=f["field_label"],
                extracted_value=f["extracted_value"],
                confidence_score=f["confidence"],
                source_page=f["source_page"],
                bounding_box=f["bounding_box"],
                verification_status="UNVERIFIED"
            )
            db.add(field_obj)

        audit = AuditEvent(
            application_id=app_id,
            event_type="DOCUMENT_UPLOADED",
            actor="Reviewer (Document Desk)",
            details=f"Uploaded '{orig_filename}' classified as {doc_obj.document_category} ({ext_res['page_count']} pages)."
        )
        db.add(audit)
        db.commit()

        # Re-run assessment engine to recalculate findings automatically
        engine_runner = VerificationEngine(db)
        engine_runner.run_assessment(app_id, actor="System Extraction Trigger")

        return jsonify(doc_obj.to_dict()), 201
    finally:
        db.close()

@api_bp.route("/applications/<int:app_id>/documents", methods=["GET"])
def get_application_documents(app_id: int):
    db = get_session()
    try:
        docs = db.query(Document).filter(Document.application_id == app_id).all()
        return jsonify([d.to_dict() for d in docs])
    finally:
        db.close()

@api_bp.route("/documents/<int:doc_id>", methods=["GET"])
def get_document_details(doc_id: int):
    db = get_session()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        d_dict = doc.to_dict()
        d_dict["fields"] = [f.to_dict() for f in doc.fields]
        return jsonify(d_dict)
    finally:
        db.close()

@api_bp.route("/documents/<int:doc_id>/file", methods=["GET"])
def get_document_file(doc_id: int):
    db = get_session()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc or not os.path.exists(doc.file_path):
            return jsonify({"error": "File not found on storage"}), 404

        return send_file(
            doc.file_path,
            mimetype=doc.mime_type or "application/pdf",
            as_attachment=False,
            download_name=doc.original_name
        )
    finally:
        db.close()

@api_bp.route("/documents/<int:doc_id>/extract", methods=["POST"])
def reprocess_document(doc_id: int):
    db = get_session()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        # Clear existing fields
        for f in doc.fields:
            db.delete(f)
        db.flush()

        ext_res = extractor.extract_document(doc.file_path, doc.mime_type, doc.document_category)
        doc.file_hash = ext_res["file_hash"]
        doc.page_count = ext_res["page_count"]
        doc.ocr_applied = ext_res["ocr_applied"]
        doc.extraction_method = ext_res["extraction_method"]
        doc.document_category = ext_res["detected_category"]
        doc.confidence_score = ext_res["confidence_score"]
        doc.extraction_status = "EXTRACTED"

        for f in ext_res["fields"]:
            field_obj = ExtractedField(
                document_id=doc.id,
                field_key=f["field_key"],
                field_label=f["field_label"],
                extracted_value=f["extracted_value"],
                confidence_score=f["confidence"],
                source_page=f["source_page"],
                bounding_box=f["bounding_box"],
                verification_status="UNVERIFIED"
            )
            db.add(field_obj)

        audit = AuditEvent(
            application_id=doc.application_id,
            event_type="EXTRACTION_COMPLETED",
            actor="Reviewer (Reprocess Action)",
            details=f"Reprocessed extraction for '{doc.original_name}'."
        )
        db.add(audit)
        db.commit()

        # Re-assess
        engine_runner = VerificationEngine(db)
        engine_runner.run_assessment(doc.application_id, actor="Reprocess Trigger")

        return jsonify(doc.to_dict())
    finally:
        db.close()

@api_bp.route("/documents/<int:doc_id>/fields", methods=["PATCH"])
def correct_extracted_field(doc_id: int):
    data = request.json or {}
    field_id = data.get("field_id")
    corrected_val = data.get("corrected_value", "").strip()

    if not field_id:
        return jsonify({"error": "field_id is required"}), 400

    db = get_session()
    try:
        field = db.query(ExtractedField).filter(
            ExtractedField.id == field_id,
            ExtractedField.document_id == doc_id
        ).first()
        if not field:
            return jsonify({"error": "Field not found"}), 404

        before_val = field.corrected_value if field.is_reviewer_corrected else field.extracted_value
        field.corrected_value = corrected_val
        field.is_reviewer_corrected = True
        field.verification_status = "VERIFIED_BY_REVIEWER"

        audit = AuditEvent(
            application_id=field.document.application_id,
            event_type="FIELD_CORRECTED",
            actor=data.get("actor", "Assessor (Review Desk)"),
            details=f"Corrected '{field.field_label}' on {field.document.original_name}",
            before_value=before_val,
            after_value=corrected_val
        )
        db.add(audit)
        db.commit()

        # Re-run assessment to reflect corrected value
        engine_runner = VerificationEngine(db)
        engine_runner.run_assessment(field.document.application_id, actor="Field Correction Trigger")

        return jsonify(field.to_dict())
    finally:
        db.close()

# --------------------------------------------------------------------------
# 5. VERIFICATION ENGINE & FINDINGS
# --------------------------------------------------------------------------
@api_bp.route("/applications/<int:app_id>/assess", methods=["POST"])
def run_compliance_assessment(app_id: int):
    db = get_session()
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            return jsonify({"error": "Application not found"}), 404

        actor = request.json.get("actor", "Reviewer Desk Manual Run") if request.json else "Reviewer Desk"
        engine_runner = VerificationEngine(db)
        findings = engine_runner.run_assessment(app_id, actor=actor)

        return jsonify({
            "message": "Compliance assessment completed successfully",
            "findings_count": len(findings),
            "findings": [f.to_dict() for f in findings],
            "application_status": app_obj.status
        })
    finally:
        db.close()

@api_bp.route("/applications/<int:app_id>/findings", methods=["GET"])
def get_application_findings(app_id: int):
    db = get_session()
    try:
        findings = db.query(VerificationFinding).filter(
            VerificationFinding.application_id == app_id
        ).all()
        return jsonify([f.to_dict() for f in findings])
    finally:
        db.close()

@api_bp.route("/findings/<int:finding_id>", methods=["PATCH"])
def resolve_finding(finding_id: int):
    data = request.json or {}
    new_status = data.get("status", "RESOLVED") # RESOLVED, ACCEPTED_EXCEPTION, FLAGGED, OPEN
    notes = data.get("resolution_notes", "").strip()
    actor = data.get("resolved_by", "Dr. A. Sharma (Assessor)")

    db = get_session()
    try:
        finding = db.query(VerificationFinding).filter(VerificationFinding.id == finding_id).first()
        if not finding:
            return jsonify({"error": "Finding not found"}), 404

        before_status = finding.status
        finding.status = new_status
        finding.resolution_notes = notes
        finding.resolved_by = actor
        finding.resolved_at = datetime.utcnow()

        audit = AuditEvent(
            application_id=finding.application_id,
            event_type="FINDING_RESOLVED" if new_status == "RESOLVED" else "FINDING_STATUS_CHANGED",
            actor=actor,
            details=f"Finding '{finding.title}' changed from {before_status} to {new_status}. Notes: {notes}",
            before_value=before_status,
            after_value=new_status
        )
        db.add(audit)

        # Check if any open high findings remain to update application status
        app_obj = finding.application
        remaining_high = [f for f in app_obj.findings if f.id != finding.id and f.severity in ["HIGH", "CRITICAL"] and f.status == "OPEN"]
        remaining_med = [f for f in app_obj.findings if f.id != finding.id and f.severity == "MEDIUM" and f.status == "OPEN"]

        if not remaining_high:
            if not remaining_med:
                app_obj.status = "VERIFIED_COMPLIANT"
            else:
                app_obj.status = "IN_REVIEW"

        db.commit()
        return jsonify(finding.to_dict())
    finally:
        db.close()

# --------------------------------------------------------------------------
# 6. COMPLIANCE RULES
# --------------------------------------------------------------------------
@api_bp.route("/rules", methods=["GET"])
def list_rules():
    db = get_session()
    try:
        rules = db.query(ComplianceRule).all()
        return jsonify([r.to_dict() for r in rules])
    finally:
        db.close()

@api_bp.route("/rules", methods=["POST"])
def create_rule():
    data = request.json or {}
    name = data.get("name", "").strip()
    rule_id = data.get("rule_id", f"CUSTOM-RULE-{uuid.uuid4().hex[:4].upper()}")

    if not name:
        return jsonify({"error": "Rule name is required"}), 400

    db = get_session()
    try:
        rule_obj = ComplianceRule(
            rule_id=rule_id,
            name=name,
            category=data.get("category", "COMPLETENESS"),
            description=data.get("description", "Custom compliance scrutiny rule."),
            official_reference=data.get("official_reference", "Institutional Scrutiny Standard"),
            severity=data.get("severity", "MEDIUM"),
            version="v2025.custom",
            is_enabled=data.get("is_enabled", True)
        )
        db.add(rule_obj)
        audit = AuditEvent(
            event_type="RULE_CREATED",
            actor="Compliance Architect",
            details=f"Created custom compliance rule {rule_id}: '{name}'."
        )
        db.add(audit)
        db.commit()
        return jsonify(rule_obj.to_dict()), 201
    finally:
        db.close()

@api_bp.route("/rules/<int:rule_id>", methods=["PATCH"])
def update_rule(rule_id: int):
    data = request.json or {}
    db = get_session()
    try:
        rule = db.query(ComplianceRule).filter(ComplianceRule.id == rule_id).first()
        if not rule:
            return jsonify({"error": "Rule not found"}), 404

        if "is_enabled" in data:
            rule.is_enabled = data["is_enabled"]
        if "description" in data:
            rule.description = data["description"]
        if "severity" in data:
            rule.severity = data["severity"]

        audit = AuditEvent(
            event_type="RULE_UPDATED",
            actor="Compliance Architect",
            details=f"Rule {rule.rule_id} status modified (Enabled={rule.is_enabled}, Severity={rule.severity})."
        )
        db.add(audit)
        db.commit()
        return jsonify(rule.to_dict())
    finally:
        db.close()

# --------------------------------------------------------------------------
# 7. SYNTHETIC REFERENCE REGISTRY
# --------------------------------------------------------------------------
@api_bp.route("/reference-records", methods=["GET"])
def list_reference_records():
    db = get_session()
    try:
        search = request.args.get("search", "").strip()
        query = db.query(SyntheticReferenceRecord)
        if search:
            query = query.filter(
                or_(
                    SyntheticReferenceRecord.institution_code.ilike(f"%{search}%"),
                    SyntheticReferenceRecord.institution_name.ilike(f"%{search}%"),
                    SyntheticReferenceRecord.reference_identifier.ilike(f"%{search}%"),
                    SyntheticReferenceRecord.state.ilike(f"%{search}%")
                )
            )
        records = query.all()
        return jsonify({
            "items": [r.to_dict() for r in records],
            "disclaimer": "Synthetic demonstration records — not an official AICTE registry."
        })
    finally:
        db.close()

@api_bp.route("/reference-records", methods=["POST"])
def create_reference_record():
    data = request.json or {}
    code = data.get("institution_code", "").strip()
    name = data.get("institution_name", "").strip()

    if not code or not name:
        return jsonify({"error": "institution_code and institution_name required"}), 400

    db = get_session()
    try:
        ref_id = f"REF-SYN-AICTE-{uuid.uuid4().hex[:6].upper()}"
        record = SyntheticReferenceRecord(
            institution_code=code,
            institution_name=name,
            reference_identifier=ref_id,
            state=data.get("state", "Karnataka"),
            approval_status="APPROVED_IN_REGISTRY",
            sample_registration_no=data.get("sample_registration_no", f"REG-{uuid.uuid4().hex[:4].upper()}"),
            valid_from=data.get("valid_from", "2020-01-01"),
            valid_to=data.get("valid_to", "2027-12-31"),
            land_area_acres=float(data.get("land_area_acres", 5.0))
        )
        db.add(record)
        db.commit()
        return jsonify(record.to_dict()), 201
    finally:
        db.close()

# --------------------------------------------------------------------------
# 8. REPORTS
# --------------------------------------------------------------------------
@api_bp.route("/reports", methods=["GET"])
def list_reports():
    db = get_session()
    try:
        reports = db.query(Report).order_by(desc(Report.created_at)).all()
        return jsonify([r.to_dict() for r in reports])
    finally:
        db.close()

@api_bp.route("/applications/<int:app_id>/reports", methods=["POST"])
def generate_application_report(app_id: int):
    db = get_session()
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            return jsonify({"error": "Application not found"}), 404

        assessor = request.json.get("generated_by", "Dr. A. Sharma (Senior Assessor)") if request.json else "Dr. A. Sharma (Senior Assessor)"
        pdf_path = generate_pdf_report(app_obj, generated_by=assessor)
        file_size = os.path.getsize(pdf_path)
        report_id = os.path.splitext(os.path.basename(pdf_path))[0]

        report_obj = Report(
            application_id=app_id,
            report_identifier=report_id,
            title=f"Compliance Assessment Report - {app_obj.institution_name}",
            file_path=pdf_path,
            file_size=file_size,
            generated_by=assessor,
            status="FINAL",
            summary=f"Assessment complete. {len(app_obj.findings)} traceable findings evaluated."
        )
        db.add(report_obj)

        audit = AuditEvent(
            application_id=app_id,
            event_type="REPORT_GENERATED",
            actor=assessor,
            details=f"Generated PDF Compliance Audit Report {report_id}."
        )
        db.add(audit)
        db.commit()

        return jsonify(report_obj.to_dict()), 201
    finally:
        db.close()

@api_bp.route("/reports/<int:report_id>/download", methods=["GET"])
def download_report_file(report_id: int):
    db = get_session()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report or not os.path.exists(report.file_path):
            return jsonify({"error": "Report file not found"}), 404

        return send_file(
            report.file_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{report.report_identifier}.pdf"
        )
    finally:
        db.close()

# --------------------------------------------------------------------------
# 9. AUDIT TRAIL
# --------------------------------------------------------------------------
@api_bp.route("/audit-events", methods=["GET"])
def list_audit_events():
    db = get_session()
    try:
        search = request.args.get("search", "").strip()
        event_type = request.args.get("event_type", "").strip()
        app_id = request.args.get("application_id")

        query = db.query(AuditEvent)
        if app_id:
            query = query.filter(AuditEvent.application_id == int(app_id))
        if event_type and event_type != "ALL":
            query = query.filter(AuditEvent.event_type == event_type)
        if search:
            query = query.filter(
                or_(
                    AuditEvent.details.ilike(f"%{search}%"),
                    AuditEvent.actor.ilike(f"%{search}%")
                )
            )

        events = query.order_by(desc(AuditEvent.timestamp)).limit(50).all()
        return jsonify([e.to_dict() for e in events])
    finally:
        db.close()

# --------------------------------------------------------------------------
# 10. DEMO RESET & SEED CONTROLS
# --------------------------------------------------------------------------
@api_bp.route("/demo/seed", methods=["POST"])
def trigger_seed_demo():
    try:
        seed_database()
        return jsonify({
            "status": "SUCCESS",
            "message": "Demo database successfully initialized with realistic AICTE institutional applications, synthetic reference records, and test PDF documents."
        })
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500
