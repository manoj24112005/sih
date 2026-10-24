export type Severity = "HIGH" | "CRITICAL" | "MEDIUM" | "LOW" | "INFO";
export type FindingStatus = "OPEN" | "RESOLVED" | "FLAGGED" | "ACCEPTED_EXCEPTION";
export type ApplicationStatus = "DRAFT" | "PENDING_REVIEW" | "IN_REVIEW" | "FLAGGED_DISCREPANCIES" | "VERIFIED_COMPLIANT" | "REJECTED";
export type ReviewerRecommendation = "PENDING" | "APPROVED" | "APPROVED_WITH_CONDITIONS" | "REVISE_AND_RESUBMIT" | "REJECTED";

export interface ExtractedField {
  id: number;
  document_id: number;
  field_key: string;
  field_label: string;
  extracted_value: string | null;
  corrected_value: string | null;
  effective_value: string | null;
  confidence_score: number;
  source_page: number;
  bounding_box?: string | null;
  is_reviewer_corrected: boolean;
  verification_status: "VERIFIED" | "MISMATCH" | "WARNING" | "UNVERIFIED" | "VERIFIED_BY_REVIEWER";
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: number;
  application_id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  document_category: string;
  extraction_status: "PENDING" | "PROCESSING" | "EXTRACTED" | "FAILED";
  extraction_method: string;
  page_count: number;
  ocr_applied: boolean;
  confidence_score: number;
  field_count?: number;
  fields?: ExtractedField[];
  created_at: string;
  updated_at: string;
}

export interface VerificationFinding {
  id: number;
  application_id: number;
  rule_id: string;
  rule_version: string;
  category: "COMPLETENESS" | "CROSS_DOCUMENT" | "DATES_VALIDITY" | "REFERENCE_RECORD" | "DUPLICATE_DETECTION" | "EXTRACTION_QUALITY";
  severity: Severity;
  status: FindingStatus;
  title: string;
  description: string;
  expected_value: string | null;
  observed_value: string | null;
  verification_method: string;
  source_document_id: number | null;
  source_document_name: string | null;
  source_page: number;
  resolution_notes?: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface ApplicationRecord {
  id: number;
  application_number: string;
  institution_name: string;
  institution_code: string;
  category: string;
  application_category: string;
  state: string;
  city: string;
  academic_year: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  status: ApplicationStatus;
  assigned_reviewer: string;
  reviewer_notes: string;
  reviewer_recommendation: ReviewerRecommendation;
  document_count: number;
  finding_count: number;
  failed_findings_count: number;
  warning_findings_count: number;
  passed_findings_count: number;
  created_at: string;
  updated_at: string;
  documents?: DocumentRecord[];
  findings?: VerificationFinding[];
  reports?: ReportRecord[];
  audit_events?: AuditEventRecord[];
}

export interface ComplianceRuleRecord {
  id: number;
  rule_id: string;
  name: string;
  category: string;
  description: string;
  official_reference: string | null;
  required_documents: string[];
  required_fields: string[];
  severity: Severity;
  is_enabled: boolean;
  version: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface SyntheticReferenceRecord {
  id: number;
  institution_code: string;
  institution_name: string;
  reference_identifier: string;
  state: string;
  approval_status: string;
  sample_registration_no?: string | null;
  valid_from: string;
  valid_to: string;
  land_area_acres: number;
  source_type: string;
  disclaimer: string;
  last_verified: string;
  created_at: string;
  updated_at: string;
}

export interface ReportRecord {
  id: number;
  application_id: number;
  application_number?: string | null;
  institution_name?: string | null;
  report_identifier: string;
  title: string;
  file_size: number;
  generated_by: string;
  status: string;
  summary?: string | null;
  created_at: string;
}

export interface AuditEventRecord {
  id: number;
  application_id?: number | null;
  application_number?: string | null;
  event_type: string;
  actor: string;
  details: string;
  before_value?: string | null;
  after_value?: string | null;
  ip_address: string;
  timestamp: string;
}

export interface DashboardData {
  kpis: {
    total_applications: number;
    awaiting_review: number;
    flagged_discrepancies: number;
    completed_reviews: number;
    open_findings_count: number;
    high_severity_count: number;
    medium_severity_count: number;
    low_severity_count: number;
  };
  status_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  priority_queue: Array<{
    id: number;
    application_number: string;
    institution_name: string;
    status: string;
    urgent_findings: number;
    created_at: string;
  }>;
  recent_activity: AuditEventRecord[];
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: {
    status: string;
    engine: string;
    active_applications: number;
  };
  components: {
    pdf_parser: string;
    ocr_engine: string;
    ocr_available: boolean;
    ai_extractor: string;
    llm_provider: string;
    report_generator: string;
  };
  demo_mode: {
    enabled: boolean;
    disclaimer: string;
  };
}
