import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  FileCheck2,
  RefreshCw,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Check,
  X,
  MessageSquare,
  History,
  Layers,
  Search,
  ArrowRight,
  Eye,
  AlertCircle
} from "lucide-react";
import { api } from "../services/api";
import { ApplicationRecord, DocumentRecord, VerificationFinding, AuditEventRecord } from "../types";
import { Badge } from "../components/ui/Badge";
import { DocumentViewer } from "../components/document-viewer/DocumentViewer";

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);

  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"findings" | "timeline" | "documents">("findings");

  // Selected document for preview
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [highlightKeyword, setHighlightKeyword] = useState<string>("");

  // Reviewer actions state
  const [reviewerNotes, setReviewerNotes] = useState<string>("");
  const [recommendation, setRecommendation] = useState<string>("PENDING");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [assessmentRunning, setAssessmentRunning] = useState<boolean>(false);

  // Finding Resolution Modal State
  const [resolvingFinding, setResolvingFinding] = useState<VerificationFinding | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string>("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [submittingResolution, setSubmittingResolution] = useState<boolean>(false);

  const loadData = async () => {
    if (!appId) return;
    try {
      setLoading(true);
      const res = await api.getApplication(appId);
      setApplication(res);
      setReviewerNotes(res.reviewer_notes || "");
      setRecommendation(res.reviewer_recommendation || "PENDING");

      if (res.documents && res.documents.length > 0 && !selectedDocId) {
        setSelectedDocId(res.documents[0].id);
      }
    } catch (err) {
      console.error("Failed to load application detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [appId]);

  // Click on an evidence finding opens the relevant document and jumps directly to its page
  const handleEvidenceClick = (finding: VerificationFinding) => {
    if (finding.source_document_id) {
      setSelectedDocId(finding.source_document_id);
      setPreviewPage(finding.source_page || 1);
      if (finding.observed_value) {
        setHighlightKeyword(finding.observed_value);
      }
    }
  };

  // Re-run compliance assessment
  const handleRunAssessment = async () => {
    if (!appId) return;
    try {
      setAssessmentRunning(true);
      await api.runAssessment(appId, "Dr. A. Sharma (Manual Assessor Trigger)");
      await loadData();
    } catch (err) {
      alert("Failed to run assessment");
    } finally {
      setAssessmentRunning(false);
    }
  };

  // Save Reviewer Notes and Recommendation
  const handleSaveReviewerDecisions = async () => {
    if (!appId) return;
    try {
      setSavingNotes(true);
      await api.updateApplication(appId, {
        reviewer_notes: reviewerNotes,
        reviewer_recommendation: recommendation,
        actor: "Dr. A. Sharma (Senior Assessor)"
      });
      await loadData();
      alert("Reviewer assessment notes & recommendation updated successfully.");
    } catch (err) {
      alert("Failed to update reviewer decisions");
    } finally {
      setSavingNotes(false);
    }
  };

  // Generate ReportLab PDF Report
  const handleGenerateReport = async () => {
    if (!appId) return;
    try {
      setGeneratingReport(true);
      const rep = await api.generateReport(appId, "Dr. A. Sharma (Senior Assessor)");
      await loadData();
      // Trigger instant download or open
      window.open(api.getReportDownloadUrl(rep.id), "_blank");
    } catch (err) {
      alert("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Submit Finding Resolution
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingFinding) return;
    try {
      setSubmittingResolution(true);
      await api.resolveFinding(resolvingFinding.id, {
        status: resolutionStatus,
        resolution_notes: resolutionNotes,
        resolved_by: "Dr. A. Sharma (Assessor)"
      });
      setResolvingFinding(null);
      setResolutionNotes("");
      await loadData();
    } catch (err) {
      alert("Failed to resolve finding");
    } finally {
      setSubmittingResolution(false);
    }
  };

  if (loading && !application) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading case dossier and evidence findings...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">Application Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested application record could not be loaded.</p>
        <Link to="/applications" className="mt-4 inline-block text-xs font-medium text-teal-700 hover:underline">
          Return to Applications
        </Link>
      </div>
    );
  }

  const selectedDoc = application.documents?.find((d) => d.id === selectedDocId);
  const findings = application.findings || [];

  const passedFindings = findings.filter((f) => f.severity === "INFO" || f.status === "RESOLVED");
  const highFindings = findings.filter((f) => f.severity in ["HIGH", "CRITICAL"] && f.status !== "RESOLVED");
  const warnFindings = findings.filter((f) => f.severity === "MEDIUM" && f.status !== "RESOLVED");

  // Group findings by category
  const categories: Array<"COMPLETENESS" | "CROSS_DOCUMENT" | "DATES_VALIDITY" | "REFERENCE_RECORD" | "DUPLICATE_DETECTION" | "EXTRACTION_QUALITY"> = [
    "CROSS_DOCUMENT",
    "DATES_VALIDITY",
    "COMPLETENESS",
    "REFERENCE_RECORD",
    "DUPLICATE_DETECTION",
    "EXTRACTION_QUALITY"
  ];

  const categoryLabels: Record<string, string> = {
    CROSS_DOCUMENT: "Cross-Document Consistency",
    DATES_VALIDITY: "Dates & Regulatory Validity",
    COMPLETENESS: "Completeness & Mandatory Checklist",
    REFERENCE_RECORD: "Synthetic Reference Registry Check",
    DUPLICATE_DETECTION: "Duplicate Detection & Hash Collision",
    EXTRACTION_QUALITY: "Extraction Quality & Confidence"
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Case Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {application.application_number}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-600 font-medium">AY {application.academic_year}</span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-600">{application.application_category}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {application.institution_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PID: <span className="font-mono font-medium text-slate-700">{application.institution_code}</span> &bull; Location: {application.city}, {application.state} &bull; Category: {application.category}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAssessment}
            disabled={assessmentRunning}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-xs disabled:opacity-50"
            title="Re-run deterministic rules engine"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${assessmentRunning ? "animate-spin" : ""}`} />
            <span>{assessmentRunning ? "Analyzing..." : "Re-Assess Dossier"}</span>
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>{generatingReport ? "Generating PDF..." : "Generate PDF Report"}</span>
          </button>
        </div>
      </div>

      {/* THREE-PANEL WORKSPACE (Wide Screens) / Tabs (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANEL (Col 1-4): Uploaded Documents List & Document Viewer Preview */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Documents Dossier Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                  Supporting Documents ({application.documents?.length || 0})
                </h3>
              </div>
              <span className="text-[10px] text-teal-700 font-mono">100% Parsed</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {application.documents && application.documents.length > 0 ? (
                application.documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setPreviewPage(1);
                      }}
                      className={`w-full text-left p-3 text-xs transition-colors flex items-start justify-between gap-2 ${
                        isSelected
                          ? "bg-teal-50/70 border-l-4 border-teal-600"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {doc.original_name}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                          {doc.document_category.replace(/_/g, " ")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {doc.page_count} pg &bull; {(doc.file_size / 1024).toFixed(1)} KB
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Extracted
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {Math.round(doc.confidence_score * 100)}% Conf.
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No documents attached to this application.
                </div>
              )}
            </div>
          </div>

          {/* Document Previewer Box */}
          <div className="h-[520px]">
            <DocumentViewer
              documentId={selectedDocId}
              documentName={selectedDoc?.original_name}
              category={selectedDoc?.document_category}
              initialPage={previewPage}
              totalPages={selectedDoc?.page_count || 2}
              highlightText={highlightKeyword}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER PANEL (Col 5-9): Verification Findings & Evidence Audit */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Findings Overview Scorecard */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Compliance Scrutiny Findings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Traceable audit checks mapped to AICTE Approval Process Handbook (APH)
                </p>
              </div>
              <Badge
                variant={
                  highFindings.length > 0 ? "danger" : warnFindings.length > 0 ? "warning" : "success"
                }
              >
                {application.status.replace(/_/g, " ")}
              </Badge>
            </div>

            {/* Score Counts */}
            <div className="grid grid-cols-4 gap-2 pt-3 text-center">
              <div className="p-2 bg-rose-50 rounded border border-rose-100">
                <span className="text-lg font-bold text-rose-600 font-mono block">
                  {highFindings.length}
                </span>
                <span className="text-[10px] uppercase font-semibold text-rose-700">Flagged</span>
              </div>

              <div className="p-2 bg-amber-50 rounded border border-amber-100">
                <span className="text-lg font-bold text-amber-600 font-mono block">
                  {warnFindings.length}
                </span>
                <span className="text-[10px] uppercase font-semibold text-amber-700">Warnings</span>
              </div>

              <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                <span className="text-lg font-bold text-emerald-600 font-mono block">
                  {passedFindings.length}
                </span>
                <span className="text-[10px] uppercase font-semibold text-emerald-700">Passed / Resolved</span>
              </div>

              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-lg font-bold text-slate-700 font-mono block">
                  {findings.length}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-600">Total Checks</span>
              </div>
            </div>
          </div>

          {/* Findings List Grouped by Category */}
          <div className="space-y-3">
            {categories.map((catKey) => {
              const catFindings = findings.filter((f) => f.category === catKey);
              if (catFindings.length === 0) return null;

              return (
                <div key={catKey} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {categoryLabels[catKey]} ({catFindings.length})
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {catFindings.map((f) => {
                      const isHigh = f.severity in ["HIGH", "CRITICAL"];
                      const isWarn = f.severity === "MEDIUM";
                      const isResolved = f.status === "RESOLVED";

                      return (
                        <div key={f.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={isResolved ? "success" : isHigh ? "danger" : isWarn ? "warning" : "info"}>
                                {isResolved ? "RESOLVED" : f.severity}
                              </Badge>
                              <span className="font-mono text-[10px] text-slate-400">
                                {f.rule_id}
                              </span>
                            </div>

                            {/* Resolve button action */}
                            {!isResolved && (
                              <button
                                onClick={() => {
                                  setResolvingFinding(f);
                                  setResolutionStatus("RESOLVED");
                                  setResolutionNotes("");
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded transition-colors"
                              >
                                Adjudicate / Resolve
                              </button>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                              {f.title}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {f.description}
                            </p>
                          </div>

                          {/* Expected vs Observed comparison box */}
                          {(f.expected_value || f.observed_value) && (
                            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400 block font-medium">Expected Norm</span>
                                <span className="font-semibold text-slate-800">{f.expected_value || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-medium">Observed Value</span>
                                <span className={`font-semibold ${isHigh && !isResolved ? "text-rose-600" : "text-slate-800"}`}>
                                  {f.observed_value || "N/A"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Interactive Traceable Evidence Pill */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            {f.source_document_id ? (
                              <button
                                onClick={() => handleEvidenceClick(f)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                                title="Click to open this document & page in the left previewer"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-600" />
                                <span>
                                  Evidence: {f.source_document_name} &bull; Page {f.source_page}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Source: {f.source_document_name || "Checklist Audit"}
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 font-mono">
                              Method: {f.verification_method}
                            </span>
                          </div>

                          {/* Show resolution note if already resolved */}
                          {isResolved && f.resolution_notes && (
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800">
                              <b>Assessor Adjudication:</b> {f.resolution_notes} &bull; (Resolved by {f.resolved_by})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL (Col 10-12): Reviewer Actions & Adjudication Controls */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          {/* Reviewer Desk Card */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Assessor Review Desk
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official recommendation & statutory record
              </p>
            </div>

            {/* Assigned Assessor */}
            <div className="text-xs">
              <span className="text-slate-400 block font-medium">Assigned Officer</span>
              <span className="font-semibold text-slate-800">{application.assigned_reviewer}</span>
            </div>

            {/* Recommendation Selector */}
            <div className="text-xs space-y-1">
              <label className="text-slate-700 font-medium block">
                Final Recommendation
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="PENDING">Pending Evaluation</option>
                <option value="APPROVED">Approved (Compliant)</option>
                <option value="APPROVED_WITH_CONDITIONS">Approved with Conditions</option>
                <option value="REVISE_AND_RESUBMIT">Revise & Resubmit (Deficiencies Flagged)</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Reviewer Notes Textarea */}
            <div className="text-xs space-y-1">
              <label className="text-slate-700 font-medium block">
                Assessor Scrutiny Remarks
              </label>
              <textarea
                rows={4}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Enter detailed observations, rationale for exception acceptance, or compliance conditions..."
                className="w-full p-2 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <button
              onClick={handleSaveReviewerDecisions}
              disabled={savingNotes}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {savingNotes ? "Saving Changes..." : "Save Assessor Decision"}
            </button>
          </div>

          {/* Quick PDF Report Generation Box */}
          <div className="bg-slate-900 text-white p-4 rounded-lg shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold">Official Compliance Report</h4>
                <p className="text-[10px] text-slate-400">Generated with ReportLab Engine</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              Generates an audit-ready PDF compiling institutional profile, documents audit, traceable findings evidence, and assessor recommendations.
            </p>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generatingReport ? "Rendering PDF..." : "Export Assessment PDF"}</span>
            </button>
          </div>

          {/* Audit Events Activity Stream for this case */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <h4 className="text-xs font-semibold text-slate-800">Case Audit Timeline</h4>
              </div>
              <span className="text-[10px] text-slate-400">
                {application.audit_events?.length || 0} events
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {application.audit_events && application.audit_events.length > 0 ? (
                application.audit_events.map((ev) => (
                  <div key={ev.id} className="text-[11px] border-l-2 border-teal-500 pl-2 py-0.5">
                    <p className="font-medium text-slate-800 leading-tight">{ev.details}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{ev.actor}</span>
                      <span>&bull;</span>
                      <span>{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">No audit events recorded.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RESOLUTION MODAL */}
      {resolvingFinding && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Adjudicate Finding: {resolvingFinding.rule_id}
              </h3>
              <button
                onClick={() => setResolvingFinding(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800">{resolvingFinding.title}</p>
              <p className="text-slate-600 mt-1">{resolvingFinding.description}</p>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Resolution Decision
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800 font-medium"
                >
                  <option value="RESOLVED">Resolved (Satisfactory Clarification / Verified)</option>
                  <option value="ACCEPTED_EXCEPTION">Accepted Exception (Statutory Exemption Granted)</option>
                  <option value="FLAGGED">Escalate to Regional Committee</option>
                  <option value="OPEN">Keep Open</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Assessor Justification Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record mandatory legal justification, official gazette reference, or affidavit record..."
                  className="w-full p-2.5 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolvingFinding(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {submittingResolution ? "Saving..." : "Confirm Adjudication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
