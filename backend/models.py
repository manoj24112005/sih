import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(64), unique=True, index=True, nullable=False)
    institution_name = Column(String(255), nullable=False)
    institution_code = Column(String(64), index=True, nullable=False)
    category = Column(String(128), default="Engineering & Technology") # Technical University, Engineering & Technology, Management, Polytechnic
    application_category = Column(String(128), default="Extension of Approval (EOA)") # New Institution, EOA, Increase in Intake, Closure
    state = Column(String(128), default="Karnataka")
    city = Column(String(128), default="Bengaluru")
    academic_year = Column(String(32), default="2025-2026")
    contact_email = Column(String(128), nullable=True)
    contact_phone = Column(String(32), nullable=True)
    status = Column(String(64), default="PENDING_REVIEW") # DRAFT, PENDING_REVIEW, IN_REVIEW, FLAGGED_DISCREPANCIES, VERIFIED_COMPLIANT, REJECTED
    assigned_reviewer = Column(String(128), default="Dr. A. Sharma (Senior Assessor)")
    reviewer_notes = Column(Text, nullable=True)
    reviewer_recommendation = Column(String(64), default="PENDING") # PENDING, APPROVED, APPROVED_WITH_CONDITIONS, REVISE_AND_RESUBMIT, REJECTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("VerificationFinding", back_populates="application", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="application", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="application", cascade="all, delete-orphan")

    def to_dict(self):
        findings_list = [f.to_dict() for f in self.findings] if self.findings else []
        failed_count = sum(1 for f in findings_list if f["severity"] in ["HIGH", "CRITICAL"] and f["status"] == "OPEN")
        warning_count = sum(1 for f in findings_list if f["severity"] == "MEDIUM" and f["status"] == "OPEN")
        passed_count = sum(1 for f in findings_list if f["severity"] == "INFO" or f["status"] == "RESOLVED")
        
        return {
            "id": self.id,
            "application_number": self.application_number,
            "institution_name": self.institution_name,
            "institution_code": self.institution_code,
            "category": self.category,
            "application_category": self.application_category,
            "state": self.state,
            "city": self.city,
            "academic_year": self.academic_year,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "status": self.status,
            "assigned_reviewer": self.assigned_reviewer,
            "reviewer_notes": self.reviewer_notes or "",
            "reviewer_recommendation": self.reviewer_recommendation or "PENDING",
            "document_count": len(self.documents) if self.documents else 0,
            "finding_count": len(findings_list),
            "failed_findings_count": failed_count,
            "warning_findings_count": warning_count,
            "passed_findings_count": passed_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0) # in bytes
    mime_type = Column(String(64), default="application/pdf")
    file_hash = Column(String(64), nullable=True, index=True) # SHA-256 for duplicate detection
    document_category = Column(String(128), default="OTHER") # LAND_TITLE_DEED, BUILDING_APPROVAL_PLAN, FIRE_SAFETY_NOC, AICTE_PREVIOUS_APPROVAL, FACULTY_LIST_ROLL, SOCIETY_TRUST_DEED, OCCUPANCY_CERTIFICATE
    extraction_status = Column(String(64), default="PENDING") # PENDING, PROCESSING, EXTRACTED, FAILED
    extraction_method = Column(String(64), default="LOCAL_DETERMINISTIC_PARSER") # LOCAL_DETERMINISTIC_PARSER, PYMUPDF_TEXT, OCR_TESSERACT, AI_ASSISTED
    page_count = Column(Integer, default=1)
    ocr_applied = Column(Boolean, default=False)
    confidence_score = Column(Float, default=0.92)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    application = relationship("Application", back_populates="documents")
    fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "file_hash": self.file_hash,
            "document_category": self.document_category,
            "extraction_status": self.extraction_status,
            "extraction_method": self.extraction_method,
            "page_count": self.page_count,
            "ocr_applied": self.ocr_applied,
            "confidence_score": round(self.confidence_score, 2) if self.confidence_score else 0.9,
            "field_count": len(self.fields) if self.fields else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_key = Column(String(128), nullable=False)
    field_label = Column(String(255), nullable=False)
    extracted_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True) # Reviewer override
    confidence_score = Column(Float, default=0.90)
    source_page = Column(Integer, default=1)
    bounding_box = Column(String(255), nullable=True) # e.g. "x1,y1,x2,y2"
    is_reviewer_corrected = Column(Boolean, default=False)
    verification_status = Column(String(64), default="UNVERIFIED") # VERIFIED, MISMATCH, WARNING, UNVERIFIED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="fields")

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "field_key": self.field_key,
            "field_label": self.field_label,
            "extracted_value": self.extracted_value,
            "corrected_value": self.corrected_value,
            "effective_value": self.corrected_value if self.is_reviewer_corrected else self.extracted_value,
            "confidence_score": round(self.confidence_score, 2) if self.confidence_score else 0.9,
            "source_page": self.source_page,
            "bounding_box": self.bounding_box,
            "is_reviewer_corrected": self.is_reviewer_corrected,
            "verification_status": self.verification_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(64), unique=True, index=True, nullable=False) # e.g. AICTE-REQ-DOC-01
    name = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False) # COMPLETENESS, CROSS_DOCUMENT, DATES_VALIDITY, REFERENCE_RECORD, DUPLICATE_DETECTION, EXTRACTION_QUALITY
    description = Column(Text, nullable=False)
    official_reference = Column(String(255), nullable=True) # AICTE Approval Process Handbook (APH) 2025-26 Clause 2.3
    required_documents = Column(Text, nullable=True) # JSON or comma-separated doc categories
    required_fields = Column(Text, nullable=True) # comma-separated
    severity = Column(String(32), default="HIGH") # HIGH, MEDIUM, LOW, INFO
    is_enabled = Column(Boolean, default=True)
    version = Column(String(32), default="v2025.1")
    effective_date = Column(String(64), default="2025-04-01")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "rule_id": self.rule_id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "official_reference": self.official_reference,
            "required_documents": self.required_documents.split(",") if self.required_documents else [],
            "required_fields": self.required_fields.split(",") if self.required_fields else [],
            "severity": self.severity,
            "is_enabled": self.is_enabled,
            "version": self.version,
            "effective_date": self.effective_date,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class VerificationFinding(Base):
    __tablename__ = "verification_findings"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    rule_id = Column(String(64), nullable=False)
    rule_version = Column(String(32), default="v2025.1")
    category = Column(String(64), nullable=False) # COMPLETENESS, CROSS_DOCUMENT, DATES_VALIDITY, REFERENCE_RECORD, DUPLICATE_DETECTION, EXTRACTION_QUALITY
    severity = Column(String(32), default="HIGH") # HIGH, MEDIUM, LOW, INFO
    status = Column(String(32), default="OPEN") # OPEN, RESOLVED, FLAGGED, ACCEPTED_EXCEPTION
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    expected_value = Column(Text, nullable=True)
    observed_value = Column(Text, nullable=True)
    verification_method = Column(String(128), default="Deterministic Cross-Document Engine")
    source_document_id = Column(Integer, nullable=True)
    source_document_name = Column(String(255), nullable=True)
    source_page = Column(Integer, default=1)
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(128), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("Application", back_populates="findings")

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "rule_id": self.rule_id,
            "rule_version": self.rule_version,
            "category": self.category,
            "severity": self.severity,
            "status": self.status,
            "title": self.title,
            "description": self.description,
            "expected_value": self.expected_value,
            "observed_value": self.observed_value,
            "verification_method": self.verification_method,
            "source_document_id": self.source_document_id,
            "source_document_name": self.source_document_name,
            "source_page": self.source_page,
            "resolution_notes": self.resolution_notes or "",
            "resolved_by": self.resolved_by,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class SyntheticReferenceRecord(Base):
    __tablename__ = "synthetic_reference_records"

    id = Column(Integer, primary_key=True, index=True)
    institution_code = Column(String(64), unique=True, index=True, nullable=False)
    institution_name = Column(String(255), nullable=False)
    reference_identifier = Column(String(128), nullable=False) # e.g. REF-AICTE-SYN-2025-01
    state = Column(String(128), default="Karnataka")
    approval_status = Column(String(64), default="APPROVED_IN_REGISTRY")
    sample_registration_no = Column(String(128), nullable=True)
    valid_from = Column(String(32), default="2020-06-01")
    valid_to = Column(String(32), default="2027-05-31")
    land_area_acres = Column(Float, default=7.5)
    source_type = Column(String(64), default="SYNTHETIC_REGISTRY_MOCK")
    last_verified = Column(String(32), default="2025-01-15")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "institution_code": self.institution_code,
            "institution_name": self.institution_name,
            "reference_identifier": self.reference_identifier,
            "state": self.state,
            "approval_status": self.approval_status,
            "sample_registration_no": self.sample_registration_no,
            "valid_from": self.valid_from,
            "valid_to": self.valid_to,
            "land_area_acres": self.land_area_acres,
            "source_type": self.source_type,
            "disclaimer": "Synthetic demonstration record — not an official AICTE registry.",
            "last_verified": self.last_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    report_identifier = Column(String(128), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0)
    generated_by = Column(String(128), default="Compliance Officer (System Generated)")
    status = Column(String(64), default="FINAL") # DRAFT, FINAL
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("Application", back_populates="reports")

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "application_number": self.application.application_number if self.application else None,
            "institution_name": self.application.institution_name if self.application else None,
            "report_identifier": self.report_identifier,
            "title": self.title,
            "file_size": self.file_size,
            "generated_by": self.generated_by,
            "status": self.status,
            "summary": self.summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    event_type = Column(String(64), nullable=False) # APPLICATION_CREATED, DOCUMENT_UPLOADED, EXTRACTION_COMPLETED, ASSESSMENT_RUN, FINDING_RESOLVED, REPORT_GENERATED, FIELD_CORRECTED, RULE_UPDATED
    actor = Column(String(128), default="Reviewer (Demo User)")
    details = Column(Text, nullable=False)
    before_value = Column(Text, nullable=True)
    after_value = Column(Text, nullable=True)
    ip_address = Column(String(64), default="127.0.0.1 (Local)")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("Application", back_populates="audit_events")

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "application_number": self.application.application_number if self.application else None,
            "event_type": self.event_type,
            "actor": self.actor,
            "details": self.details,
            "before_value": self.before_value,
            "after_value": self.after_value,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
