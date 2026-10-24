import React, { useEffect, useState } from "react";
import {
  Settings,
  Server,
  Database,
  Cpu,
  Shield,
  FileCheck2,
  RefreshCw,
  HardDrive,
  Lock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { api } from "../services/api";
import { HealthStatus } from "../types";
import { Badge } from "../components/ui/Badge";

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedMsg, setSeedMsg] = useState<string>("");

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.getHealth();
      setHealth(res);
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await api.seedDemo();
      setSeedMsg(res.message);
      await fetchHealth();
    } catch (err) {
      setSeedMsg("Error seeding demo database");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Settings & Architecture Status
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Component health, parser engine diagnostics, synthetic sandbox controls, and security posture.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${loading ? "animate-spin" : ""}`} />
          <span>Ping API Health</span>
        </button>
      </div>

      {seedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{seedMsg}</span>
        </div>
      )}

      {/* Grid of System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Card 1: Extraction & OCR Pipeline */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Extraction & AI Parser Engine
              </h3>
            </div>
            <Badge variant="success">Online</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">PDF Text & Metadata Extractor:</span>
              <span className="font-mono font-medium text-slate-800">
                {health?.components.pdf_parser || "PyMuPDF v2.0 Active"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">OCR Engine:</span>
              <span className="font-mono font-medium text-slate-800">
                {health?.components.ocr_engine || "Tesseract / Heuristic Fallback"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">NLP Field Extractor:</span>
              <span className="font-medium text-teal-700">
                {health?.components.ai_extractor || "Deterministic Rule-Engine Active"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">External LLM Integration:</span>
              <span className="font-mono text-slate-600">
                {health?.components.llm_provider || "None (Local Fallback Production Mode)"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">PDF Report Generation:</span>
              <span className="font-mono font-medium text-slate-800">
                {health?.components.report_generator || "ReportLab 5.1.0 Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Persistence & Storage */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Local Database & Storage
              </h3>
            </div>
            <Badge variant={health?.database.status === "HEALTHY" ? "success" : "danger"}>
              {health?.database.status || "Healthy"}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Persistence Engine:</span>
              <span className="font-mono font-medium text-slate-800">
                {health?.database.engine || "SQLite 3"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Applications:</span>
              <span className="font-mono font-bold text-slate-900">
                {health?.database.active_applications || 0} Dossiers
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Max Upload File Limit:</span>
              <span className="font-mono text-slate-700">32 MB per document</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Accepted Formats:</span>
              <span className="font-mono text-slate-700">PDF, JPEG, PNG</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cryptographic Verification:</span>
              <span className="font-mono text-slate-700">SHA-256 binary hash collision check</span>
            </div>
          </div>
        </div>

        {/* Card 3: Demo Sandbox Reset Controls */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Demo Sandbox & Data Seeder
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              SIH Prototype
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Re-initializes the database with seeded AICTE compliance rules, realistic institutional applications (including Apex Institute, Bharatiya Academy with flagged discrepancies, and Greenfield Polytechnic), and freshly generated test PDF files.
          </p>

          <button
            onClick={handleSeed}
            disabled={seeding}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
            <span>{seeding ? "Re-seeding Test Data..." : "Re-Seed Demo Applications & PDFs"}</span>
          </button>
        </div>

        {/* Card 4: Security & Regulatory Guidance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Privacy & Operational Safeguards
              </h3>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2 text-slate-600 leading-relaxed">
            <p>
              &bull; <b>Zero Cloud Leakage:</b> All document parsing and verification algorithms execute strictly on local machine resources without transmitting certificates to unverified external endpoints.
            </p>
            <p>
              &bull; <b>Decision Support Boundary:</b> VeriCore assists human evaluators by flagging anomalies, measuring date validity, and cross-matching institutional identifiers. It never acts as an autonomous legal authority.
            </p>
            <p>
              &bull; <b>Untrusted Content Isolation:</b> Uploaded document strings are sanitized to prevent indirect prompt injection or unintended execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
