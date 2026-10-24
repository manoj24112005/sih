import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Application, Document, ExtractedField, ComplianceRule, VerificationFinding, SyntheticReferenceRecord, AuditEvent

def normalize_text(val: Optional[str]) -> str:
    if not val:
        return ""
    # Remove special chars, lower case, remove excess spaces
    val = re.sub(r"[^\w\s]", " ", val.lower())
    val = re.sub(r"\s+", " ", val).strip()
    return val

def parse_date_lenient(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    date_str = date_str.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%Y-%m-%d", "%Y/%m/%d",
        "%d %B %Y", "%d %b %Y",
        "%d-%b-%Y", "%d-%B-%Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None

class VerificationEngine:
    def __init__(self, db: Session):
        self.db = db

    def run_assessment(self, application_id: int, actor: str = "Automated Engine") -> List[VerificationFinding]:
        application = self.db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise ValueError(f"Application {application_id} not found")

        # Clear existing open findings to perform a clean re-assessment while preserving reviewer notes on resolved ones
        existing_findings = self.db.query(VerificationFinding).filter(
            VerificationFinding.application_id == application_id
        ).all()
        
        # We delete only non-resolved findings to keep reviewer resolutions
        for ef in existing_findings:
            if ef.status != "RESOLVED":
                self.db.delete(ef)
        self.db.commit()

        findings: List[VerificationFinding] = []
        rules = self.db.query(ComplianceRule).filter(ComplianceRule.is_enabled == True).all()
        rules_by_id = {r.rule_id: r for r in rules}

        docs = self.db.query(Document).filter(Document.application_id == application_id).all()
        doc_categories = {d.document_category: d for d in docs}

        # Gather all effective fields across docs
        fields_by_key: Dict[str, List[Dict[str, Any]]] = {}
        file_hashes: Dict[str, List[str]] = {}
        cert_numbers: Dict[str, List[Dict[str, Any]]] = {}

        for doc in docs:
            # Hash tracking for duplicate detection
            if doc.file_hash:
                file_hashes.setdefault(doc.file_hash, []).append(doc.original_name)

            for f in doc.fields:
                val = f.corrected_value if f.is_reviewer_corrected else f.extracted_value
                if val:
                    fields_by_key.setdefault(f.field_key, []).append({
                        "value": val,
                        "raw_value": f.extracted_value,
                        "doc_id": doc.id,
                        "doc_name": doc.original_name,
                        "doc_category": doc.document_category,
                        "page": f.source_page,
                        "confidence": f.confidence_score,
                        "field_id": f.id
                    })
                    if f.field_key == "certificate_number":
                        cert_numbers.setdefault(val.strip(), []).append({
                            "doc_name": doc.original_name,
                            "page": f.source_page,
                            "category": doc.document_category
                        })

        # =========================================================================
        # 1. COMPLETENESS CHECKS
        # =========================================================================
        rule_req_docs = rules_by_id.get("AICTE-REQ-DOC-01")
        if rule_req_docs:
            mandatory_docs = [
                ("LAND_TITLE_DEED", "Registered Land Title Deed / Ownership Document"),
                ("BUILDING_APPROVAL_PLAN", "Competent Authority Approved Building Plan"),
                ("FIRE_SAFETY_NOC", "Fire & Emergency Services Safety NOC"),
                ("AICTE_PREVIOUS_APPROVAL", "Previous AICTE Approval Order / EOA"),
                ("SOCIETY_TRUST_DEED", "Registered Society / Trust Deed")
            ]
            for cat_code, cat_label in mandatory_docs:
                if cat_code not in doc_categories:
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_req_docs.rule_id,
                        rule_version=rule_req_docs.version,
                        category="COMPLETENESS",
                        severity="HIGH",
                        status="OPEN",
                        title=f"Missing Mandatory Document: {cat_label}",
                        description=f"Mandatory regulatory document '{cat_label}' was not detected in the submission. As per AICTE APH regulations, this document is mandatory for compliance verification.",
                        expected_value=f"Uploaded {cat_label} (PDF)",
                        observed_value="Not provided / Missing",
                        verification_method="Document Checklist Audit",
                        source_document_id=None,
                        source_document_name="Submission Package",
                        source_page=1
                    )
                    findings.append(finding)

        # Completeness of required fields in uploaded documents
        rule_req_fields = rules_by_id.get("AICTE-FIELD-COMPL-02")
        if rule_req_fields:
            essential_fields = [
                ("institution_name", "Institution Name"),
                ("institution_code", "Institution Permanent ID / Code"),
                ("certificate_number", "Document Registration / Order Number"),
                ("issue_date", "Date of Issue")
            ]
            for f_key, f_label in essential_fields:
                if f_key not in fields_by_key:
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_req_fields.rule_id,
                        rule_version=rule_req_fields.version,
                        category="COMPLETENESS",
                        severity="MEDIUM",
                        status="OPEN",
                        title=f"Missing Essential Field: {f_label}",
                        description=f"The structured field '{f_label}' could not be automatically extracted from any of the supporting documents. Reviewer confirmation or manual entry required.",
                        expected_value=f"Valid extracted {f_label}",
                        observed_value="Empty / Unextracted",
                        verification_method="Structured Field Presence Check",
                        source_document_id=docs[0].id if docs else None,
                        source_document_name=docs[0].original_name if docs else "None",
                        source_page=1
                    )
                    findings.append(finding)

        # =========================================================================
        # 2. CROSS-DOCUMENT CONSISTENCY CHECKS
        # =========================================================================
        rule_name_match = rules_by_id.get("AICTE-NAME-MATCH-01")
        if rule_name_match and "institution_name" in fields_by_key:
            app_name_norm = normalize_text(application.institution_name)
            for item in fields_by_key["institution_name"]:
                doc_name_norm = normalize_text(item["value"])
                # Compare similarity
                if app_name_norm and doc_name_norm and app_name_norm != doc_name_norm:
                    # Check if significant difference (not just minor substring)
                    if doc_name_norm not in app_name_norm and app_name_norm not in doc_name_norm:
                        finding = VerificationFinding(
                            application_id=application_id,
                            rule_id=rule_name_match.rule_id,
                            rule_version=rule_name_match.version,
                            category="CROSS_DOCUMENT",
                            severity="HIGH",
                            status="OPEN",
                            title=f"Institution Name Discrepancy in {item['doc_name']}",
                            description=f"Institution name extracted from '{item['doc_name']}' on page {item['page']} differs from application record. Verify if there was an official name change or trust handover.",
                            expected_value=application.institution_name,
                            observed_value=item["value"],
                            verification_method="Cross-Document Entity Matching",
                            source_document_id=item["doc_id"],
                            source_document_name=item["doc_name"],
                            source_page=item["page"]
                        )
                        findings.append(finding)

        # Cross-document PID match
        rule_pid_match = rules_by_id.get("AICTE-PID-MATCH-02")
        if rule_pid_match and "institution_code" in fields_by_key:
            app_pid = application.institution_code.strip()
            for item in fields_by_key["institution_code"]:
                doc_pid = item["value"].strip()
                if app_pid != doc_pid and not app_pid.endswith(doc_pid) and not doc_pid.endswith(app_pid):
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_pid_match.rule_id,
                        rule_version=rule_pid_match.version,
                        category="CROSS_DOCUMENT",
                        severity="HIGH",
                        status="OPEN",
                        title=f"Institution Code / PID Mismatch in {item['doc_name']}",
                        description=f"PID '{doc_pid}' in {item['doc_name']} (Page {item['page']}) does not match application PID '{app_pid}'.",
                        expected_value=app_pid,
                        observed_value=doc_pid,
                        verification_method="Identifier Cross-Check",
                        source_document_id=item["doc_id"],
                        source_document_name=item["doc_name"],
                        source_page=item["page"]
                    )
                    findings.append(finding)

        # Cross-document Academic Year
        if "academic_year" in fields_by_key:
            app_ay = application.academic_year.replace(" ", "")
            for item in fields_by_key["academic_year"]:
                doc_ay = item["value"].replace(" ", "")
                if doc_ay != app_ay and item["doc_category"] == "AICTE_PREVIOUS_APPROVAL":
                    # For previous approval, year is naturally prior, check if plausible
                    pass

        # =========================================================================
        # 3. DATES AND VALIDITY CHECKS
        # =========================================================================
        rule_fire_noc = rules_by_id.get("AICTE-FIRE-NOC-03")
        if rule_fire_noc and "FIRE_SAFETY_NOC" in doc_categories:
            fire_doc = doc_categories["FIRE_SAFETY_NOC"]
            # Look for expiry date in fields
            fire_expiry_fields = [f for f in fire_doc.fields if f.field_key == "expiry_date"]
            if fire_expiry_fields:
                val = fire_expiry_fields[0].corrected_value or fire_expiry_fields[0].extracted_value
                exp_dt = parse_date_lenient(val)
                # Compare against academic year start (e.g. 2025-07-01)
                ay_threshold = datetime(2025, 7, 1)
                if exp_dt and exp_dt < ay_threshold:
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_fire_noc.rule_id,
                        rule_version=rule_fire_noc.version,
                        category="DATES_VALIDITY",
                        severity="HIGH",
                        status="OPEN",
                        title="Fire Safety NOC Expired",
                        description=f"The Fire Safety Certificate expired on {exp_dt.strftime('%d-%b-%Y')}, which is prior to the commencement of Academic Year {application.academic_year}. A valid renewed certificate is mandatory.",
                        expected_value=f"Valid beyond 01-Jul-2025 (AY {application.academic_year})",
                        observed_value=f"Expired on {exp_dt.strftime('%d-%b-%Y')}",
                        verification_method="Temporal Validity Computation",
                        source_document_id=fire_doc.id,
                        source_document_name=fire_doc.original_name,
                        source_page=fire_expiry_fields[0].source_page
                    )
                    findings.append(finding)

        # =========================================================================
        # 4. SYNTHETIC REFERENCE COMPARISON CHECKS
        # =========================================================================
        rule_ref_check = rules_by_id.get("AICTE-REF-REG-01")
        if rule_ref_check:
            ref_record = self.db.query(SyntheticReferenceRecord).filter(
                SyntheticReferenceRecord.institution_code == application.institution_code
            ).first()

            if not ref_record:
                finding = VerificationFinding(
                    application_id=application_id,
                    rule_id=rule_ref_check.rule_id,
                    rule_version=rule_ref_check.version,
                    category="REFERENCE_RECORD",
                    severity="MEDIUM",
                    status="OPEN",
                    title="No Match in Synthetic Reference Registry",
                    description=f"Institution code '{application.institution_code}' was not found in the local synthetic demonstration registry. External official AICTE verification is unavailable.",
                    expected_value=f"Record in Synthetic Registry for PID {application.institution_code}",
                    observed_value="Not found in local synthetic registry",
                    verification_method="Synthetic Reference DB Lookup",
                    source_document_id=None,
                    source_document_name="Synthetic Registry",
                    source_page=1
                )
                findings.append(finding)
            else:
                # Compare state or name
                norm_ref_name = normalize_text(ref_record.institution_name)
                norm_app_name = normalize_text(application.institution_name)
                if norm_ref_name != norm_app_name:
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_ref_check.rule_id,
                        rule_version=rule_ref_check.version,
                        category="REFERENCE_RECORD",
                        severity="LOW",
                        status="OPEN",
                        title="Synthetic Reference Name Variance",
                        description=f"Synthetic reference record '{ref_record.reference_identifier}' lists name as '{ref_record.institution_name}' (Note: Synthetic demo comparison only, not an official AICTE registry).",
                        expected_value=ref_record.institution_name,
                        observed_value=application.institution_name,
                        verification_method="Synthetic Reference Comparison",
                        source_document_id=None,
                        source_document_name="Synthetic Registry Mock",
                        source_page=1
                    )
                    findings.append(finding)
                else:
                    # Record info finding about matched synthetic record
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_ref_check.rule_id,
                        rule_version=rule_ref_check.version,
                        category="REFERENCE_RECORD",
                        severity="INFO",
                        status="RESOLVED",
                        title="Matched Synthetic Reference Record",
                        description=f"Matched synthetic reference record '{ref_record.reference_identifier}' ({ref_record.approval_status}). Note: Synthetic demonstration check only.",
                        expected_value=ref_record.institution_code,
                        observed_value=f"Matched PID {ref_record.institution_code}",
                        verification_method="Synthetic Reference DB Lookup",
                        source_document_id=None,
                        source_document_name="Synthetic Registry",
                        source_page=1
                    )
                    findings.append(finding)

        # =========================================================================
        # 5. DUPLICATE DETECTION CHECKS
        # =========================================================================
        rule_dup = rules_by_id.get("AICTE-DUP-DETECT-01")
        if rule_dup:
            # File hash collision check
            for f_hash, doc_names in file_hashes.items():
                if len(doc_names) > 1:
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_dup.rule_id,
                        rule_version=rule_dup.version,
                        category="DUPLICATE_DETECTION",
                        severity="HIGH",
                        status="OPEN",
                        title="Exact Duplicate File Detected",
                        description=f"Identical file binary hash detected across multiple uploads: {', '.join(doc_names)}. Ensure distinct original documents are uploaded.",
                        expected_value="Unique files per regulatory document category",
                        observed_value=f"Duplicate SHA-256 hash across {len(doc_names)} documents",
                        verification_method="Cryptographic SHA-256 Hash Matching",
                        source_document_id=docs[0].id if docs else None,
                        source_document_name=doc_names[0],
                        source_page=1
                    )
                    findings.append(finding)

            # Duplicate certificate number check
            for cert_no, occurrences in cert_numbers.items():
                if len(occurrences) > 1 and len(cert_no) > 3:
                    categories_str = ", ".join([f"{o['doc_name']} ({o['category']})" for o in occurrences])
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_dup.rule_id,
                        rule_version=rule_dup.version,
                        category="DUPLICATE_DETECTION",
                        severity="MEDIUM",
                        status="OPEN",
                        title=f"Repeated Certificate Number: {cert_no}",
                        description=f"The certificate/order number '{cert_no}' appears across multiple distinct documents: {categories_str}. Verify whether this is an intentional omnibus registration.",
                        expected_value="Distinct registration numbers for distinct authorities",
                        observed_value=f"Duplicate number '{cert_no}'",
                        verification_method="Identifier Frequency Analysis",
                        source_document_id=docs[0].id if docs else None,
                        source_document_name=occurrences[0]["doc_name"],
                        source_page=occurrences[0]["page"]
                    )
                    findings.append(finding)

        # =========================================================================
        # 6. EXTRACTION QUALITY CHECKS
        # =========================================================================
        rule_quality = rules_by_id.get("AICTE-EXTRACT-QUAL-01")
        if rule_quality:
            for doc in docs:
                if doc.confidence_score and doc.confidence_score < 0.78:
                    finding = VerificationFinding(
                        application_id=application_id,
                        rule_id=rule_quality.rule_id,
                        rule_version=rule_quality.version,
                        category="EXTRACTION_QUALITY",
                        severity="LOW",
                        status="OPEN",
                        title=f"Low Extraction Confidence in {doc.original_name}",
                        description=f"Automated parser confidence score is {int(doc.confidence_score * 100)}%. Scanned document resolution or complex formatting may require human reviewer inspection.",
                        expected_value="Extraction confidence >= 80%",
                        observed_value=f"{int(doc.confidence_score * 100)}% (Heuristic)",
                        verification_method="Optical & Layout Quality Heuristic",
                        source_document_id=doc.id,
                        source_document_name=doc.original_name,
                        source_page=1
                    )
                    findings.append(finding)

        # Save all findings to DB
        for f in findings:
            self.db.add(f)
        
        # Update application status according to findings
        high_findings = [f for f in findings if f.severity in ["HIGH", "CRITICAL"] and f.status == "OPEN"]
        med_findings = [f for f in findings if f.severity == "MEDIUM" and f.status == "OPEN"]
        
        if high_findings:
            application.status = "FLAGGED_DISCREPANCIES"
        elif med_findings:
            application.status = "IN_REVIEW"
        else:
            application.status = "VERIFIED_COMPLIANT"

        # Log audit event
        audit = AuditEvent(
            application_id=application_id,
            event_type="ASSESSMENT_RUN",
            actor=actor,
            details=f"Compliance assessment executed. Found {len(findings)} findings ({len(high_findings)} High, {len(med_findings)} Medium)."
        )
        self.db.add(audit)
        self.db.commit()

        return findings
