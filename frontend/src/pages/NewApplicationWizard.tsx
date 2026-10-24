import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  UploadCloud,
  CheckCircle,
  FileText,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check
} from "lucide-react";
import { api } from "../services/api";

interface UploadedFileItem {
  file: File;
  category: string;
  name: string;
  size: number;
}

export const NewApplicationWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Step 1 Form Data
  const [formData, setFormData] = useState({
    institution_name: "",
    institution_code: "",
    category: "Engineering & Technology",
    application_category: "Extension of Approval (EOA)",
    state: "Karnataka",
    city: "Bengaluru",
    academic_year: "2025-2026",
    contact_email: "",
    contact_phone: ""
  });

  // Step 2 Uploaded Documents
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Document categories
  const docCategories = [
    { key: "LAND_TITLE_DEED", label: "Land Title Deed / Ownership Record (Mandatory)" },
    { key: "BUILDING_APPROVAL_PLAN", label: "Sanctioned Building Plan (Mandatory)" },
    { key: "FIRE_SAFETY_NOC", label: "Fire & Safety NOC (Mandatory)" },
    { key: "AICTE_PREVIOUS_APPROVAL", label: "Previous AICTE Approval / EOA (Mandatory)" },
    { key: "SOCIETY_TRUST_DEED", label: "Society / Trust Registration Deed (Mandatory)" },
    { key: "FACULTY_LIST_ROLL", label: "Staff & Faculty Cadre Roll" },
    { key: "OTHER", label: "Other Supporting Affiliation Document" }
  ];

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const valid = newFiles.filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (valid.length < newFiles.length) {
      alert("Only PDF and Image files (JPEG/PNG) are accepted.");
    }
    const mapped: UploadedFileItem[] = valid.map((f, i) => {
      // Auto-classify based on filename hint
      const lower = f.name.toLowerCase();
      let cat = "OTHER";
      if (lower.includes("land")) cat = "LAND_TITLE_DEED";
      else if (lower.includes("building") || lower.includes("plan")) cat = "BUILDING_APPROVAL_PLAN";
      else if (lower.includes("fire") || lower.includes("noc")) cat = "FIRE_SAFETY_NOC";
      else if (lower.includes("aicte") || lower.includes("eoa")) cat = "AICTE_PREVIOUS_APPROVAL";
      else if (lower.includes("society") || lower.includes("trust")) cat = "SOCIETY_TRUST_DEED";

      return {
        file: f,
        name: f.name,
        size: f.size,
        category: cat
      };
    });

    setFiles((prev) => [...prev, ...mapped]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index: number, newCat: string) => {
    setFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, category: newCat } : item))
    );
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.institution_name.trim()) {
      setErrorMsg("Please enter the official institution name.");
      return false;
    }
    if (!formData.institution_code.trim()) {
      setErrorMsg("Please enter the AICTE Permanent ID (PID) or Institute Code.");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  // Submission handler
  const handleSubmit = async () => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      // 1. Create Application
      const app = await api.createApplication(formData);

      // 2. Upload Documents
      for (const item of files) {
        await api.uploadDocument(app.id, item.file, item.category);
      }

      // 3. Navigate to Detail Flagship Screen
      navigate(`/applications/${app.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit application");
      setSubmitting(false);
    }
  };

  const mandatoryCategories = [
    "LAND_TITLE_DEED",
    "BUILDING_APPROVAL_PLAN",
    "FIRE_SAFETY_NOC",
    "AICTE_PREVIOUS_APPROVAL",
    "SOCIETY_TRUST_DEED"
  ];
  const uploadedCategories = new Set(files.map((f) => f.category));
  const missingMandatory = mandatoryCategories.filter((cat) => !uploadedCategories.has(cat));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          New Institutional Approval Application
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Initiate regulatory scrutiny by submitting institutional identifiers and statutory supporting evidence.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          {[
            { step: 1, title: "1. Institution Details", icon: Building2 },
            { step: 2, title: "2. Supporting Documents", icon: UploadCloud },
            { step: 3, title: "3. Scrutiny Checklist & Submit", icon: CheckCircle }
          ].map((item, idx) => {
            const Icon = item.icon;
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isDone
                        ? "bg-teal-600 text-white"
                        : isCurrent
                        ? "bg-slate-900 text-white ring-4 ring-slate-100"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : item.step}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      isCurrent ? "text-slate-900 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
                      currentStep > idx + 1 ? "bg-teal-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Institution Details */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Step 1: Institutional Identifiers & Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Institution Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                placeholder="e.g. Apex Institute of Technology & Management"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Permanent Institute ID (PID) / Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.institution_code}
                onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })}
                placeholder="e.g. 1-3647182910"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Academic Year</label>
              <select
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Institutional Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Technical University">Technical University</option>
                <option value="Polytechnic">Polytechnic</option>
                <option value="Management">Management</option>
                <option value="Pharmacy">Pharmacy</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Application Type</label>
              <select
                value={formData.application_category}
                onChange={(e) => setFormData({ ...formData, application_category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              >
                <option value="Extension of Approval (EOA)">Extension of Approval (EOA)</option>
                <option value="New Institution Approval">New Institution Approval</option>
                <option value="Increase in Intake">Increase in Intake</option>
                <option value="Introduction of New Course">Introduction of New Course</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">State / Province</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">City / District</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Registrar Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="registrar@institution.edu.in"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+91 80 1234 5678"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <span>Continue to Documents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Supporting Documents */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Step 2: Upload Supporting Documents
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {files.length} document(s) staged
            </span>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-teal-500 bg-teal-50/50" : "border-slate-300 bg-slate-50 hover:bg-slate-100/50"
            }`}
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">
              Drag & drop regulatory PDF or image documents here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Accepted formats: PDF, JPEG, PNG. Maximum file size: 32 MB per document.
            </p>
            <div className="mt-4">
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 cursor-pointer shadow-xs">
                <span>Browse Files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/jpeg,image/png"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Staged Files List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Staged Documents & Category Mapping
              </h4>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden text-xs">
                {files.map((item, index) => (
                  <div key={index} className="p-3 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-teal-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate max-w-xs">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(item.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={item.category}
                        onChange={(e) => updateFileCategory(index, e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 flex-1 sm:w-64"
                      >
                        {docCategories.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Details</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <span>Review & Scrutiny</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review and Submit */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-base font-semibold text-slate-800">
              Step 3: Review Details & Mandatory Document Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify submitted parameters before triggering automated OCR extraction and cross-document verification engine.
            </p>
          </div>

          {/* Review Summary Grid */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Institution Name</span>
              <span className="font-semibold text-slate-800">{formData.institution_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Permanent ID (PID)</span>
              <span className="font-mono font-semibold text-slate-800">{formData.institution_code}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Academic Session</span>
              <span className="text-slate-800">{formData.academic_year} &bull; {formData.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Location</span>
              <span className="text-slate-800">{formData.city}, {formData.state}</span>
            </div>
          </div>

          {/* Mandatory Document Checklist Audit */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Statutory Documents Checklist
            </h4>
            <div className="border border-slate-200 rounded-md divide-y divide-slate-200 text-xs bg-white">
              {[
                { key: "LAND_TITLE_DEED", name: "Land Title Deed / Ownership Record" },
                { key: "BUILDING_APPROVAL_PLAN", name: "Sanctioned Master Building Plan" },
                { key: "FIRE_SAFETY_NOC", name: "Fire & Safety NOC Certificate" },
                { key: "AICTE_PREVIOUS_APPROVAL", name: "Previous AICTE Approval Order / EOA" },
                { key: "SOCIETY_TRUST_DEED", name: "Registered Society / Trust Deed" }
              ].map((item) => {
                const isUploaded = uploadedCategories.has(item.key);
                return (
                  <div key={item.key} className="p-3 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {isUploaded ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium text-[11px] border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Staged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium text-[11px] border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {missingMandatory.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Missing Mandatory Documents Alert</p>
                <p className="text-[11px] mt-0.5">
                  You have not staged {missingMandatory.length} mandatory regulatory document(s). You may still submit;
                  the verification engine will flag completeness findings for reviewer scrutiny.
                </p>
              </div>
            </div>
          )}

          {/* Submission Notice & Controls */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              By submitting, PyMuPDF extraction, SHA-256 duplicate checks, and cross-document verification algorithms will be triggered immediately.
            </span>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Documents</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing Application & OCR...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Submit Application for Scrutiny</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
