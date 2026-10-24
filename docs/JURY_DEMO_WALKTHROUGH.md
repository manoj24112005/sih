# VeriCore — Smart India Hackathon (SIH26261)
## Jury Demonstration Script & Walkthrough Guide

Use this guide for presenting **VeriCore** to the Smart India Hackathon evaluation panel. The demo demonstrates working end-to-end functionality, traceable evidence verification, and explainable decision-support.

---

### Demo Pre-Check (30 Seconds Before Presentation)
1. Ensure the platform is running:
   ```cmd
   .\run_demo.bat
   ```
   Or:
   ```cmd
   python start_demo.py
   ```
2. Open Chrome/Edge at: `http://localhost:5173`
3. Click **"Load Demo Data"** on the Compliance Overview page if needed.

---

### Step 1: Operational Compliance Overview (1.5 Minutes)
- **Goal:** Show that this is an enterprise case-management system, not a generic landing page or generic chatbot.
- **Narrative:**
  > *"Respected Jury, we present VeriCore — Institutional Compliance & Document Verification. Our tagline is: Every application. Every document. Every finding, traceable.  
  > In regulatory bodies like AICTE or UGC, officers face scrutiny fatigue examining hundreds of documents for each institution. VeriCore acts as an explainable decision-support co-pilot that flags discrepancies in seconds while keeping the human assessor in complete legal control."*
- **Action on Screen:**
  - Point to the **KPI Cards**: Total Applications, Awaiting Review, Flagged Findings (High Severity), Completed Reviews.
  - Show the **Application Review Status Bar Chart** and **Institutional Category Distribution** — emphasize that every chart and number is computed dynamically from SQLite database records.
  - Point out the **Priority Review Queue** highlighting urgent discrepancies.

---

### Step 2: The Flagship Screen — Traceable Evidence Navigation (3 Minutes)
- **Goal:** Demonstrate the 3-panel flagship screen and show how an assessor traces a finding directly to the exact page of a document.
- **Action on Screen:**
  1. Click **"View Applications"** or go to `/applications`.
  2. Select **Case #2: Bharatiya Technical Academy (APP-2026-AICTE-0102)**.
  3. Walk the jury through the 3-panel workspace:
     - **Left Panel:** Uploaded documents list and built-in PDF document viewer with zoom & page controls.
     - **Center Panel:** Compliance scrutiny findings grouped by statutory categories (Cross-Document, Dates & Validity, Completeness).
     - **Right Panel:** Assessor decision desk, notes, and PDF export.
  4. **The "Wow" Moment (Interactive Traceable Evidence):**
     - Look at the finding: **"Fire Safety NOC Expired"** (High Severity).
     - Click the evidence link: **"Evidence: BTA_Fire_Safety_NOC_Expired.pdf • Page 1"**.
     - Notice how the **Left Panel immediately switches to the Fire Safety NOC document** and scrolls to Page 1, highlighting the observed expiry date (`15/03/2025`)!
     - Next, click the finding: **"Institution Name Discrepancy in BTA_Fire_Safety_NOC_Expired.pdf"**.
     - Point out the Expected Norm (`Bharatiya Technical Academy`) vs. the Observed Value (`Bharatiya Polytechnic College`).
  5. **Narrative:**
     - *"Notice how a human reviewer might have missed that the Fire NOC was issued to the polytechnic wing rather than the engineering college, and that it expired prior to Academic Year 2025-2026. VeriCore pinpoints the discrepancy with line-level proof in under one second."*

---

### Step 3: Assessor Adjudication & Finding Resolution (1.5 Minutes)
- **Goal:** Show that VeriCore empowers the reviewer with an audit-proof adjudication workflow.
- **Action on Screen:**
  1. Click **"Adjudicate / Resolve"** on the Fire NOC finding.
  2. In the modal, select:
     - **Resolution Decision:** `Accepted Exception (Statutory Exemption Granted)` or `Resolved`.
     - **Assessor Justification:** *"Institution presented valid renewal receipt No. FS-MH-2025-992 with 60-day provisional grace period approved by Regional Fire Officer."*
  3. Click **"Confirm Adjudication"**.
  4. Notice the badge turns green (**RESOLVED**), the overall case status updates, and an entry is immediately appended to the **Case Audit Timeline**.
  5. In the Right Panel:
     - Select Final Recommendation: **"Approved with Conditions"**.
     - Type in Assessor Remarks: *"Approved subject to submission of final Fire NOC certificate within 45 days."*
     - Click **"Save Assessor Decision"**.

---

### Step 4: Exporting the Official Compliance Audit PDF (1 Minute)
- **Goal:** Show that the system generates formal, downloadable, tamper-audited PDF reports.
- **Action on Screen:**
  1. Click **"Generate PDF Report"** or **"Export Assessment PDF"**.
  2. The ReportLab engine compiles the dossier and opens the PDF in a new tab.
  3. Show the jury the generated report:
     - Ministry / Regulatory Assessment Header with unique report ID (`RPT-VERICORE-...`).
     - Institutional profile and academic year.
     - Documents Received table with extraction methods.
     - Audit Findings table with severity badges and exact page references.
     - Assessor remarks, final recommendation, and official disclaimer.
  4. Show that this is a **real, generated vector PDF file**, not a static template!

---

### Step 5: Document Verification Center & Reviewer Corrections (1 Minute)
- **Goal:** Show the field-level machine extraction inspector.
- **Action on Screen:**
  1. Navigate to **"Document Verification"** (`/documents`).
  2. Select any document from the list.
  3. Point to the extracted fields table showing: Field Label, Effective Extracted Value, Confidence Score (e.g. 95%), Source Page, and Origin.
  4. Click **"Correct"** on a field (e.g. Land Area or Certificate Number).
  5. Edit the value and click **"Save"**.
  6. Point out that the badge updates to **"Reviewer Corrected"**, the original OCR value is preserved with strikethrough, and dependent rules are automatically re-calculated.

---

### Step 6: Synthetic Reference Registry & Compliance Rules (1 Minute)
- **Goal:** Address jury questions regarding regulatory norm configuration and synthetic boundaries.
- **Action on Screen:**
  1. Navigate to **"Compliance Rules"** (`/rules`):
     - Show the active rules with AICTE Approval Process Handbook (APH) citations.
     - Toggle a rule disabled and enabled to demonstrate live configurable rules.
  2. Navigate to **"Reference Registry"** (`/reference-registry`):
     - Show the prominent warning banner: *"Synthetic demonstration records — not an official AICTE registry."*
     - Explain our ethical AI stance: We never claim official government authorization or live AICTE connectivity unless a verified API bridge is actually established.

---

### Step 7: System Audit Trail & Architecture Status (30 Seconds)
- **Action on Screen:**
  1. Navigate to **"Audit Trail"** (`/audit-trail`):
     - Show the chronological stream of events with timestamps, actor IDs, and before &rarr; after state changes.
  2. Navigate to **"Settings"** (`/settings`):
     - Show system component health: PyMuPDF active, SQLite healthy, ReportLab active, local deterministic NLP parser running with zero cloud leakage.

---

### Summary Checklist of Features Demonstrated to Jury:
- [x] End-to-end working prototype running locally on Windows 11.
- [x] High-precision PDF text extraction using PyMuPDF v2.0.
- [x] 6-category deterministic compliance verification engine.
- [x] Traceable evidence: Finding links directly to Document & Page in viewer.
- [x] Interactive assessor finding adjudication and recommendation controls.
- [x] Real dynamic PDF report generation with ReportLab.
- [x] Field-level machine extraction inspector and reviewer correction audit.
- [x] Configurable compliance rules mapped to AICTE APH regulations.
- [x] Synthetic reference registry with transparent boundary disclosure.
- [x] Complete system audit trail with before/after state diffs.
