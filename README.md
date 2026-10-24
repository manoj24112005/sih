# VeriCore — Institutional Compliance & Document Verification Platform
### Smart India Hackathon Prototype (SIH26261)
> **Tagline:** *Every application. Every document. Every finding, traceable.*

---

## 🏛️ Problem Statement Context (SIH26261)
National and state regulatory bodies (such as AICTE, UGC, PCI, and technical universities) process tens of thousands of institutional approval applications annually. Each dossier contains dense, multi-page statutory documents: land deeds, municipal building plans, fire safety NOCs, prior approval orders, and trust registrations.

### Operational Challenges
- **Scrutiny Bottlenecks:** Manual examination of hundreds of pages leads to oversight fatigue and delays.
- **Cross-Document Discrepancies:** Hidden inconsistencies between certificates (e.g., institution name altered in a Fire NOC, or land area mismatch between deeds and building plans) pass unnoticed.
- **Temporal Invalidation:** Certificates expiring right before or during the academic session are difficult to spot manually.
- **Lack of Traceable Proof:** Flagged cases lack line-level, page-referenced evidence explaining the rejection.

**VeriCore** is built as an explainable, decision-support co-pilot for regulatory compliance analysts. It extracts structured data from multi-page PDFs, verifies completeness against configurable compliance rules, checks temporal validity and cryptographic hash collisions, cross-compares fields across documents, and presents findings with **direct, clickable page references** into original documents.

---

## ✨ Key Features & Capabilities

1. **Flagship 3-Panel Review Workspace:**
   - **Left Panel:** Uploaded documents list and built-in PDF viewer with zoom controls, page-by-page switcher, and text search.
   - **Center Panel:** Compliance scrutiny findings grouped by statutory categories (Completeness, Cross-Document Consistency, Dates & Validity, Synthetic Registry, Duplicate Detection).
   - **Interactive Traceable Evidence:** Clicking any evidence finding immediately switches the viewer to the exact document and page where the discrepancy was found.
   - **Right Panel:** Assessor decision desk with editable notes, recommendation controls (*Approved*, *Approved with Conditions*, *Revise & Resubmit*, *Rejected*), and instant PDF report generation.

2. **6-Category Deterministic Verification Engine:**
   - **Completeness:** Mandatory checklist audit (Land Deed, Building Plan, Fire NOC, AICTE Previous Approval, Trust Deed) and structured field presence.
   - **Cross-Document Consistency:** Entity name matching across all deeds, PID cross-referencing, and academic year alignment.
   - **Dates & Validity:** Temporal validity computation against Academic Year 2025-2026 commencement thresholds.
   - **Duplicate Detection:** SHA-256 cryptographic file hash collision checks and certificate identifier frequency analysis.
   - **Synthetic Registry Comparison:** Cross-check against local benchmark institutions (clearly disclosed as synthetic mock data).
   - **Extraction Quality:** Optical and layout confidence scoring to flag low-confidence scans for human confirmation.

3. **Field-Level Document Verification Center:**
   - Review extracted fields alongside heuristic confidence scores.
   - Reviewer correction mode: Assessor corrections are preserved with strikethrough audit trail and trigger automatic re-assessment of dependent rules.

4. **Dynamic PDF Report Generation:**
   - Real, downloadable, multi-page PDF compliance assessment reports compiled by the ReportLab engine with custom headers, unique report identifiers (`RPT-VERICORE-...`), evidence tables, and assessor signatures.

5. **Configurable Compliance Rules:**
   - Manageable rule catalog mapped directly to AICTE Approval Process Handbook (APH) 2025-26 clauses with enable/disable toggles and custom rule authoring.

6. **Comprehensive System Audit Trail:**
   - Chronological logging of application creation, uploads, automated extraction, assessment runs, field corrections, and finding adjudications with before/after state diffs.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, React Router 7, Recharts.
- **Backend:** Python 3.12, Flask 3.1, SQLite 3, SQLAlchemy 2.1, Flask-CORS.
- **Document Processing:** PyMuPDF (`pymupdf`) v2.0 (high-precision PDF text & coordinates extraction), Pytesseract & Pillow (OCR fallback).
- **Report Engine:** ReportLab 5.1.0 (vector PDF generation).
- **Testing:** Pytest 9.1 (automated test suite).

---

## 🚀 Quick Start & Local Execution

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ and npm (tested on Node v24)

### One-Click Launch (Windows 11)
Simply double-click or run:
```cmd
run_demo.bat
```
This will automatically initialize the SQLite database, seed realistic institutional applications with test PDF documents, launch the Flask API on `http://127.0.0.1:5000`, launch the Vite frontend on `http://localhost:5173`, and open your browser!

---

### Manual Step-by-Step Launch

#### 1. Setup Backend:
```bash
# In the project root:
python -m venv venv
.\venv\Scripts\activate

# Install dependencies:
pip install -r backend/requirements.txt

# Seed sample data & generate sample PDF documents:
python backend/seed_data.py

# Launch Flask backend:
python backend/app.py
```
*Backend API will run on:* `http://127.0.0.1:5000`

#### 2. Setup Frontend:
```bash
# In a separate terminal:
cd frontend
npm install
npm run dev
```
*Frontend will run on:* `http://localhost:5173`

---

## 🧪 Automated Tests

Run the backend test suite to verify health checks, dashboard metrics, application querying, verification engine rules, and ReportLab PDF compilation:
```bash
.\venv\Scripts\python.exe -m pytest backend/tests/test_api.py -v
```
*(All 7 test suites pass in ~2 seconds).*

---

## 📁 Repository Structure

```text
├── backend/
│   ├── app.py                     # Flask application factory, CORS, blueprints
│   ├── database.py                # SQLAlchemy engine & SQLite configuration
│   ├── models.py                  # Relational database models & serializers
│   ├── ai_extractor.py            # PyMuPDF parser, OCR fallback, and NLP extractor
│   ├── verification_engine.py     # Deterministic 6-category compliance verification
│   ├── report_generator.py        # ReportLab PDF compliance report generator
│   ├── seed_data.py               # Pre-seeds demo applications & generates sample PDFs
│   ├── requirements.txt           # Python dependencies
│   ├── tests/
│   │   └── test_api.py            # Automated test suite (Pytest)
│   └── data/
│       ├── vericore.db            # SQLite persistent database
│       ├── uploads/               # Uploaded / generated PDF documents
│       └── reports/               # Generated compliance PDF reports
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, Header, AppLayout
│   │   │   ├── ui/                # Accessible Badge, Modals, StatCards
│   │   │   └── document-viewer/   # Built-in PDF viewer with zoom & search
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx             # Compliance Overview dashboard
│   │   │   ├── ApplicationsPage.tsx          # Applications workspace table
│   │   │   ├── NewApplicationWizard.tsx      # 3-step submission wizard
│   │   │   ├── ApplicationDetailPage.tsx     # Flagship 3-panel review workspace
│   │   │   ├── DocumentVerificationPage.tsx  # Extracted field inspector & editor
│   │   │   ├── ComplianceRulesPage.tsx       # Configurable rules management
│   │   │   ├── ReferenceRegistryPage.tsx     # Synthetic reference registry
│   │   │   ├── ReportsPage.tsx               # Downloadable report repository
│   │   │   ├── AuditTrailPage.tsx            # Chronological audit stream
│   │   │   └── SettingsPage.tsx              # System diagnostics & sandbox reset
│   │   ├── services/
│   │   │   └── api.ts             # Typed REST API client
│   │   ├── types/
│   │   │   └── index.ts           # Domain TypeScript interfaces
│   │   ├── App.tsx                # React Router navigation
│   │   └── index.css              # Tailwind v4 theme & design tokens
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE_AND_DESIGN.md # Full architecture specification & diagrams
│   ├── JURY_DEMO_WALKTHROUGH.md   # Step-by-step jury presentation script
│   └── API_SPECIFICATION.md       # Complete REST API reference
├── run_demo.bat                   # One-click Windows launch script
├── start_demo.py                  # Python orchestration script
└── README.md
```

---

## ⚖️ Legal & Regulatory Disclaimer
**VeriCore** is a decision-support prototype built for demonstration during the Smart India Hackathon (SIH26261). It assists human reviewers in extracting structured data, verifying document completeness, and calculating date validity. It does **not** constitute statutory approval or legal authorization. Reference comparisons are conducted against clearly marked synthetic local records and do not connect to production AICTE systems without an authorized bridge. Final authority rests solely with the statutory approval councils.
