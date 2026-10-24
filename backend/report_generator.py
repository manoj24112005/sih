import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from database import REPORTS_DIR
from models import Application, Report

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header rule and text
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 755, 572, 755)
        self.drawString(40, 760, "VeriCore Institutional Compliance Verification Report | Decision Support System")
        self.drawRightString(572, 760, "CONFIDENTIAL & PRIVILEGED")
        
        # Footer rule and text
        self.line(40, 45, 572, 45)
        self.drawString(40, 32, "Smart India Hackathon Prototype | SIH26261 | Synthetic Decision-Support")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 32, page_text)
        self.restoreState()

def generate_pdf_report(application: Application, generated_by: str = "Compliance Officer") -> str:
    """Generate an enterprise-grade compliance report PDF for an application."""
    report_id = f"RPT-VERICORE-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    filename = f"{report_id}.pdf"
    file_path = os.path.join(REPORTS_DIR, filename)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=55,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom palette
    navy_900 = colors.HexColor("#0f172a")
    navy_800 = colors.HexColor("#1e293b")
    teal_700 = colors.HexColor("#0f766e")
    gray_100 = colors.HexColor("#f1f5f9")
    gray_200 = colors.HexColor("#e2e8f0")
    gray_600 = colors.HexColor("#475569")
    red_700 = colors.HexColor("#b91c1c")
    amber_700 = colors.HexColor("#b45309")
    green_700 = colors.HexColor("#15803d")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=navy_900,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=teal_700,
        spaceAfter=12
    )
    h2_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=navy_800,
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=navy_900
    )
    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=gray_600
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=11,
        textColor=colors.HexColor("#64748b")
    )

    story = []

    # Title & Header
    story.append(Paragraph("VeriCore Regulatory Compliance & Verification Assessment", title_style))
    story.append(Paragraph(f"Application Evaluation Report & Traceable Evidence Audit &bull; ID: {report_id}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=teal_700, spaceBefore=2, spaceAfter=10))

    # Meta Info Table
    meta_data = [
        [
            Paragraph(f"<b>Application ID:</b> {application.application_number}", body_style),
            Paragraph(f"<b>Academic Year:</b> {application.academic_year}", body_style),
            Paragraph(f"<b>Assessment Date:</b> {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')}", body_style)
        ],
        [
            Paragraph(f"<b>Institution Name:</b> {application.institution_name}", body_style),
            Paragraph(f"<b>Institution Code / PID:</b> {application.institution_code}", body_style),
            Paragraph(f"<b>Category:</b> {application.category}", body_style)
        ],
        [
            Paragraph(f"<b>State / City:</b> {application.city}, {application.state}", body_style),
            Paragraph(f"<b>Application Type:</b> {application.application_category}", body_style),
            Paragraph(f"<b>Assigned Assessor:</b> {application.assigned_reviewer}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[185, 175, 172])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), gray_100),
        ('BOX', (0, 0), (-1, -1), 0.5, gray_200),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, gray_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Executive Summary & Status Banner
    status_color = red_700 if application.status == "FLAGGED_DISCREPANCIES" else (
        green_700 if application.status == "VERIFIED_COMPLIANT" else amber_700
    )
    status_label = application.status.replace("_", " ")

    summary_data = [
        [
            Paragraph(f"<b>CURRENT SYSTEM STATUS:</b> <font color='{status_color.hexval()}'><b>{status_label}</b></font>", body_style),
            Paragraph(f"<b>RECOMMENDATION:</b> <b>{application.reviewer_recommendation.replace('_', ' ')}</b>", body_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[310, 222])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, status_color),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # Section 1: Documents Received
    story.append(Paragraph("1. Supporting Documents Received & Processed", h2_style))
    docs_data = [
        [
            Paragraph("<b>Document Classification</b>", small_style),
            Paragraph("<b>Filename & Size</b>", small_style),
            Paragraph("<b>Extraction Method</b>", small_style),
            Paragraph("<b>Pages</b>", small_style),
            Paragraph("<b>Extracted Fields</b>", small_style)
        ]
    ]
    for d in application.documents:
        kb_size = f"{d.file_size // 1024} KB" if d.file_size else "N/A"
        docs_data.append([
            Paragraph(f"<b>{d.document_category.replace('_', ' ').title()}</b>", body_style),
            Paragraph(f"{d.original_name}<br/><font color='#64748b'>{kb_size}</font>", body_style),
            Paragraph(f"{d.extraction_method.replace('_', ' ').title()}", body_style),
            Paragraph(f"{d.page_count}", body_style),
            Paragraph(f"{len(d.fields)} fields", body_style)
        ])
    if len(docs_data) == 1:
        docs_data.append([Paragraph("No supporting documents uploaded.", body_style), "", "", "", ""])

    doc_table = Table(docs_data, colWidths=[130, 140, 130, 45, 87])
    doc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), gray_100),
        ('BOX', (0, 0), (-1, -1), 0.5, gray_200),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, gray_200),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(doc_table)
    story.append(Spacer(1, 10))

    # Section 2: Verification Findings & Discrepancies
    story.append(Paragraph("2. Audit Findings & Traceable Evidence", h2_style))
    findings = application.findings
    findings_data = [
        [
            Paragraph("<b>Severity</b>", small_style),
            Paragraph("<b>Category / Finding Title</b>", small_style),
            Paragraph("<b>Expected vs Observed</b>", small_style),
            Paragraph("<b>Source Document & Page</b>", small_style),
            Paragraph("<b>Status</b>", small_style)
        ]
    ]

    for f in findings:
        sev_color = red_700 if f.severity in ["HIGH", "CRITICAL"] else (
            amber_700 if f.severity == "MEDIUM" else teal_700
        )
        source_evidence = f"{f.source_document_name or 'N/A'}<br/><b>Page {f.source_page}</b>"
        exp_obs = f"<b>Exp:</b> {f.expected_value or 'N/A'}<br/><b>Obs:</b> {f.observed_value or 'N/A'}"
        
        findings_data.append([
            Paragraph(f"<font color='{sev_color.hexval()}'><b>{f.severity}</b></font>", body_style),
            Paragraph(f"<b>{f.title}</b><br/><font color='#475569'>{f.description[:120]}...</font>", body_style),
            Paragraph(exp_obs, small_style),
            Paragraph(source_evidence, small_style),
            Paragraph(f"<b>{f.status}</b>", body_style)
        ])

    if len(findings_data) == 1:
        findings_data.append([
            Paragraph("No open compliance findings recorded.", body_style),
            "", "", "", ""
        ])

    findings_table = Table(findings_data, colWidths=[55, 175, 140, 105, 57])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), gray_100),
        ('BOX', (0, 0), (-1, -1), 0.5, gray_200),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, gray_200),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(findings_table)
    story.append(Spacer(1, 10))

    # Section 3: Reviewer Notes & Decision
    story.append(Paragraph("3. Assessor Remarks & Final Recommendation", h2_style))
    notes_text = application.reviewer_notes or "No manual reviewer notes entered. Decision based on automated checks and submitted documentation."
    notes_para = Paragraph(f"<b>Assessor Notes:</b><br/>{notes_text}", body_style)
    rec_para = Paragraph(
        f"<b>Official Decision Recommendation:</b> {application.reviewer_recommendation.replace('_', ' ')}<br/>"
        f"<b>Authorized Assessor:</b> {application.assigned_reviewer} &bull; Signature Verified via Audit Log",
        body_style
    )
    decision_table = Table([[notes_para], [rec_para]], colWidths=[532])
    decision_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), gray_100),
        ('BOX', (0, 0), (-1, -1), 0.5, gray_200),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, gray_200),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(decision_table)
    story.append(Spacer(1, 12))

    # Section 4: Regulatory Disclaimer & Limitations
    story.append(Paragraph("4. Regulatory Disclaimers & Operational Scope", h2_style))
    disclaimer_text = (
        "<b>LEGAL & COMPLIANCE NOTICE:</b> VeriCore is an AI-powered regulatory decision-support system built for "
        "demonstration during the Smart India Hackathon (SIH26261). It assists human reviewers in extracting structured data, "
        "verifying completeness, calculating temporal validity, and detecting cross-document inconsistencies. "
        "The system does NOT constitute statutory authorization or an autonomous regulatory grant. "
        "Reference comparisons are performed against clearly marked synthetic mock records and do not connect to live "
        "AICTE government production databases without an authorized API bridge. Final authority rests solely with the "
        "statutory approval council."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    # Build Document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    return file_path
