import React, { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Save,
  X,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Eye
} from "lucide-react";
import { api } from "../services/api";
import { ApplicationRecord, DocumentRecord, ExtractedField } from "../types";
import { Badge } from "../components/ui/Badge";

export const DocumentVerificationPage: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reprocessing, setReprocessing] = useState<boolean>(false);

  // Field Editing State
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingField, setSavingField] = useState<boolean>(false);

  // Load applications initially
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const res = await api.getApplications({ page_size: 20 });
        setApplications(res.items);
        if (res.items.length > 0) {
          setSelectedAppId(res.items[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  // When selected application changes, load its documents
  useEffect(() => {
    if (!selectedAppId) return;
    const fetchAppDocs = async () => {
      try {
        const app = await api.getApplication(selectedAppId);
        if (app.documents) {
          setDocuments(app.documents);
          if (app.documents.length > 0) {
            setSelectedDocId(app.documents[0].id);
          } else {
            setSelectedDocId(null);
          }
        }
      } catch (err) {
        console.error("Failed to load documents:", err);
      }
    };
    fetchAppDocs();
  }, [selectedAppId]);

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  // Reprocess Document OCR / Parser
  const handleReprocess = async () => {
    if (!selectedDocId) return;
    try {
      setReprocessing(true);
      await api.reprocessDocument(selectedDocId);
      // Reload application
      if (selectedAppId) {
        const app = await api.getApplication(selectedAppId);
        if (app.documents) setDocuments(app.documents);
      }
      alert("Document re-extraction completed.");
    } catch (err) {
      alert("Failed to reprocess document");
    } finally {
      setReprocessing(false);
    }
  };

  // Save Field Correction
  const handleSaveFieldCorrection = async (fieldId: number) => {
    if (!selectedDocId) return;
    try {
      setSavingField(true);
      await api.correctField(selectedDocId, {
        field_id: fieldId,
        corrected_value: editValue,
        actor: "Dr. A. Sharma (Reviewer Desk)"
      });
      setEditingFieldId(null);
      // Refresh documents
      if (selectedAppId) {
        const app = await api.getApplication(selectedAppId);
        if (app.documents) setDocuments(app.documents);
      }
    } catch (err) {
      alert("Failed to save correction");
    } finally {
      setSavingField(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Document Verification Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspect structured machine extraction, calibrate confidence heuristics, and audit reviewer field corrections.
          </p>
        </div>

        {/* Application Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Select Dossier:</span>
          <select
            value={selectedAppId || ""}
            onChange={(e) => setSelectedAppId(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-600 max-w-[280px] truncate"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.institution_name} ({app.application_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 2-Column Split: Documents list (left) & Extracted fields table (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Documents for selected application */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Supporting Documents
              </h3>
            </div>
            <span className="font-mono text-[11px] text-slate-500">{documents.length} Files</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {documents.length > 0 ? (
              documents.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setEditingFieldId(null);
                    }}
                    className={`w-full text-left p-3.5 text-xs transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-teal-50 border-l-4 border-teal-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.original_name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                        {doc.document_category.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {doc.page_count} page(s) &bull; {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {doc.extraction_status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round(doc.confidence_score * 100)}% Conf
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No supporting documents found for this application.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Extracted Fields Table & Editor */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden space-y-0">
          {/* Header of Table */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedDoc ? selectedDoc.original_name : "Select a document"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Method: <span className="font-mono text-slate-700">{selectedDoc?.extraction_method || "N/A"}</span> &bull; SHA-256: <span className="font-mono text-[10px] text-slate-400">{selectedDoc?.file_hash?.slice(0, 16)}...</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReprocess}
                disabled={reprocessing || !selectedDocId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reprocessing ? "animate-spin text-teal-600" : ""}`} />
                <span>{reprocessing ? "Reprocessing..." : "Reprocess Parser"}</span>
              </button>

              {selectedDocId && (
                <a
                  href={api.getDocumentFileUrl(selectedDocId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Original PDF</span>
                </a>
              )}
            </div>
          </div>

          {/* Structured Fields Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-100/60 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Field Label & Key</th>
                  <th className="px-4 py-3">Effective Extracted Value</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Page</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {selectedDoc?.fields && selectedDoc.fields.length > 0 ? (
                  selectedDoc.fields.map((field) => {
                    const isEditing = editingFieldId === field.id;
                    return (
                      <tr key={field.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{field.field_label}</div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            {field.field_key}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="px-2.5 py-1 border border-teal-500 rounded text-xs w-full max-w-sm focus:outline-none"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium text-slate-900">
                                {field.effective_value || <span className="text-slate-400 italic">Not detected</span>}
                              </span>
                              {field.is_reviewer_corrected && (
                                <div className="text-[10px] text-teal-700 mt-0.5">
                                  Original OCR: <span className="line-through text-slate-400">{field.extracted_value}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-slate-700 font-medium">
                            {Math.round(field.confidence_score * 100)}%
                          </span>
                          <span className="text-[10px] text-slate-400 block">Heuristic</span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-700 whitespace-nowrap">
                          Page {field.source_page}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {field.is_reviewer_corrected ? (
                            <Badge variant="info">Reviewer Corrected</Badge>
                          ) : (
                            <Badge variant="neutral">Machine Extracted</Badge>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveFieldCorrection(field.id)}
                                disabled={savingField}
                                className="px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 flex items-center gap-1 font-medium"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingFieldId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFieldId(field.id);
                                setEditValue(field.effective_value || "");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Correct</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No extracted fields for this document.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Guidance Note */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              All field corrections trigger automatic re-evaluation of dependent consistency rules and append an event to the immutable audit trail.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
