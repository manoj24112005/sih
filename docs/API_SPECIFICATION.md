# VeriCore — REST API Specification
**Smart India Hackathon (SIH26261)**  
*Base URL: `http://127.0.0.1:5000/api`*

---

## 1. System & Health

### `GET /api/health`
Returns system status, active database connections, component states, and demo mode flags.
- **Response (200 OK):**
```json
{
  "status": "UP",
  "service": "VeriCore Regulatory Compliance & Verification API",
  "version": "1.0.0-SIH26261",
  "timestamp": "2026-10-24T12:00:00Z",
  "database": {
    "status": "HEALTHY",
    "engine": "SQLite 3",
    "active_applications": 4
  },
  "components": {
    "pdf_parser": "PyMuPDF (fitz) v2.0 Active",
    "ocr_engine": "Tesseract OCR / Heuristic Fallback",
    "ocr_available": false,
    "ai_extractor": "Local Deterministic NLP Engine Active",
    "llm_provider": "None (Deterministic Engine Default)",
    "report_generator": "ReportLab Enterprise Engine Active"
  },
  "demo_mode": {
    "enabled": true,
    "disclaimer": "Local prototype demonstration for SIH26261. Not an official AICTE authority."
  }
}
```

---

## 2. Dashboard Analytics

### `GET /api/dashboard`
Returns live operational metrics calculated directly from database records.
- **Response (200 OK):**
```json
{
  "kpis": {
    "total_applications": 4,
    "awaiting_review": 2,
    "flagged_discrepancies": 1,
    "completed_reviews": 1,
    "open_findings_count": 6,
    "high_severity_count": 2,
    "medium_severity_count": 2,
    "low_severity_count": 2
  },
  "status_distribution": {
    "VERIFIED_COMPLIANT": 1,
    "FLAGGED_DISCREPANCIES": 1,
    "PENDING_REVIEW": 2
  },
  "category_distribution": {
    "Engineering & Technology": 2,
    "Polytechnic": 1,
    "Technical University": 1
  },
  "priority_queue": [
    {
      "id": 2,
      "application_number": "APP-2026-AICTE-0102",
      "institution_name": "Bharatiya Technical Academy",
      "status": "FLAGGED_DISCREPANCIES",
      "urgent_findings": 2,
      "created_at": "2026-10-24T12:00:00Z"
    }
  ],
  "recent_activity": []
}
```

---

## 3. Applications

### `GET /api/applications`
Queries institutional applications with search, status filtering, sorting, and pagination.
- **Query Parameters:**
  - `search` (string): Search in application number, institution name, or PID.
  - `status` (string): Filter by status (`PENDING_REVIEW`, `IN_REVIEW`, `FLAGGED_DISCREPANCIES`, `VERIFIED_COMPLIANT`, `REJECTED`).
  - `category` (string): Filter by category.
  - `sort_by` (string): Field to sort by (default: `created_at`).
  - `sort_order` (string): `asc` or `desc` (default: `desc`).
  - `page` (int): Page number (default: 1).
  - `page_size` (int): Items per page (default: 10).

### `POST /api/applications`
Creates a new institutional approval application dossier.
- **Request Body:**
```json
{
  "institution_name": "Apex Institute of Technology & Management",
  "institution_code": "1-3647182910",
  "category": "Engineering & Technology",
  "application_category": "Extension of Approval (EOA)",
  "state": "Karnataka",
  "city": "Bengaluru",
  "academic_year": "2025-2026",
  "contact_email": "registrar@apexinstitute.edu.in",
  "contact_phone": "+91 80 2345 6789"
}
```

### `GET /api/applications/<id>`
Retrieves full application details including documents, extracted fields, verification findings, and audit history.

### `PATCH /api/applications/<id>`
Updates reviewer recommendations, assessor notes, or status.
- **Request Body:**
```json
{
  "reviewer_notes": "All mandatory documents verified. Approved with conditions.",
  "reviewer_recommendation": "APPROVED_WITH_CONDITIONS",
  "actor": "Dr. A. Sharma (Senior Assessor)"
}
```

---

## 4. Supporting Documents

### `POST /api/applications/<id>/documents`
Uploads a supporting document (PDF or image). Automatically computes SHA-256 binary hash, runs PyMuPDF extraction, and updates findings.
- **Form Data:**
  - `file`: Document binary (PDF, PNG, JPEG).
  - `category`: Category hint (`LAND_TITLE_DEED`, `BUILDING_APPROVAL_PLAN`, `FIRE_SAFETY_NOC`, `AICTE_PREVIOUS_APPROVAL`, `SOCIETY_TRUST_DEED`, `OTHER`).

### `GET /api/documents/<id>/file`
Streams the original document file for embedded preview or direct download.

### `POST /api/documents/<id>/extract`
Forces re-extraction of structured fields from an uploaded document.

### `PATCH /api/documents/<id>/fields`
Records an assessor field correction, marks `is_reviewer_corrected = true`, and re-runs dependent rules.
- **Request Body:**
```json
{
  "field_id": 12,
  "corrected_value": "8.20 Acres",
  "actor": "Dr. A. Sharma"
}
```

---

## 5. Verification Engine & Findings

### `POST /api/applications/<id>/assess`
Executes the deterministic verification engine against the application's uploaded documents and updates findings.

### `PATCH /api/findings/<id>`
Adjudicates an open finding (resolve, accept statutory exception, or flag).
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "resolution_notes": "Provisional Fire NOC renewal challan verified pursuant to circular 14B.",
  "resolved_by": "Dr. A. Sharma (Assessor)"
}
```

---

## 6. Reports

### `POST /api/applications/<id>/reports`
Compiles dossier findings and generates an official PDF compliance assessment report via ReportLab.

### `GET /api/reports/<id>/download`
Downloads the generated ReportLab PDF file with appropriate `Content-Disposition: attachment`.

---

## 7. Sandbox & Audit

### `GET /api/audit-events`
Returns chronological audit events with filtering by `event_type` and `application_id`.

### `POST /api/demo/seed`
Re-initializes the local SQLite database with benchmark rules, sample institutions, and valid test PDF documents.
