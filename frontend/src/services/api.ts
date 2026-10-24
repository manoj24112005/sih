import {
  ApplicationRecord,
  DocumentRecord,
  ExtractedField,
  VerificationFinding,
  ComplianceRuleRecord,
  SyntheticReferenceRecord,
  ReportRecord,
  AuditEventRecord,
  DashboardData,
  HealthStatus
} from "../types";

import {
  initialApplications,
  initialRules,
  initialReferenceRecords,
  initialReports
} from "./mockData";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// In-Memory Fallback State for Serverless / Static Hosting (Vercel)
let mockApps: ApplicationRecord[] = JSON.parse(JSON.stringify(initialApplications));
let mockRules: ComplianceRuleRecord[] = JSON.parse(JSON.stringify(initialRules));
let mockRefRecords: SyntheticReferenceRecord[] = JSON.parse(JSON.stringify(initialReferenceRecords));
let mockReportsList: ReportRecord[] = JSON.parse(JSON.stringify(initialReports));
let mockAuditEvents: AuditEventRecord[] = [
  {
    id: 1,
    application_id: 1,
    application_number: "APP-2026-AICTE-0101",
    event_type: "APPLICATION_CREATED",
    actor: "Registrar (Apex Institute)",
    details: "Application package APP-2026-AICTE-0101 submitted with 5 supporting documents.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    ip_address: "127.0.0.1"
  },
  {
    id: 2,
    application_id: 2,
    application_number: "APP-2026-AICTE-0102",
    event_type: "ASSESSMENT_RUN",
    actor: "Dr. A. Sharma (Senior Assessor)",
    details: "Automated compliance assessment flagged 2 High Severity findings (Expired Fire NOC & Name mismatch).",
    timestamp: new Date().toISOString(),
    ip_address: "127.0.0.1"
  }
];

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {})
      },
      ...options
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    // Network failure (e.g. running on static Vercel host without local Flask backend)
    console.warn(`[VeriCore] Backend fetch failed for ${endpoint}. Falling back to internal demo state.`);
  }

  // Graceful fallback to client-side demo state
  return handleMockFallback<T>(endpoint, options);
}

function handleMockFallback<T>(endpoint: string, options?: RequestInit): T {
  const method = options?.method || "GET";
  const body = options?.body ? JSON.parse(options.body as string) : {};

  // 1. Health
  if (endpoint === "/health") {
    return {
      status: "UP",
      service: "VeriCore Regulatory Compliance & Verification API",
      version: "1.0.0-SIH26261 (Demo Fallback)",
      timestamp: new Date().toISOString(),
      database: {
        status: "HEALTHY",
        engine: "SQLite 3 / Mock",
        active_applications: mockApps.length
      },
      components: {
        pdf_parser: "PyMuPDF (fitz) v2.0 Active",
        ocr_engine: "Tesseract OCR / Embedded Parser",
        ocr_available: false,
        ai_extractor: "Local Deterministic NLP Engine Active",
        llm_provider: "None (Deterministic Engine Default)",
        report_generator: "ReportLab Enterprise Engine Active"
      },
      demo_mode: {
        enabled: true,
        disclaimer: "Client-side demo sandbox active for SIH26261. Not an official AICTE authority."
      }
    } as T;
  }

  // 2. Dashboard
  if (endpoint === "/dashboard") {
    const openFindings = mockApps.flatMap((a) => a.findings || []).filter((f) => f.status === "OPEN");
    const high = openFindings.filter((f) => f.severity === "HIGH" || f.severity === "CRITICAL").length;
    const med = openFindings.filter((f) => f.severity === "MEDIUM").length;
    const low = openFindings.filter((f) => f.severity === "LOW" || f.severity === "INFO").length;

    const statusDist: Record<string, number> = {};
    const catDist: Record<string, number> = {};
    for (const a of mockApps) {
      statusDist[a.status] = (statusDist[a.status] || 0) + 1;
      catDist[a.category] = (catDist[a.category] || 0) + 1;
    }

    const priorityQueue = mockApps
      .filter((a) => a.failed_findings_count > 0 || a.status === "FLAGGED_DISCREPANCIES")
      .map((a) => ({
        id: a.id,
        application_number: a.application_number,
        institution_name: a.institution_name,
        status: a.status,
        urgent_findings: a.failed_findings_count,
        created_at: a.created_at
      }));

    return {
      kpis: {
        total_applications: mockApps.length,
        awaiting_review: mockApps.filter((a) => a.status === "PENDING_REVIEW" || a.status === "IN_REVIEW").length,
        flagged_discrepancies: mockApps.filter((a) => a.status === "FLAGGED_DISCREPANCIES").length,
        completed_reviews: mockApps.filter((a) => a.status === "VERIFIED_COMPLIANT" || a.status === "REJECTED").length,
        open_findings_count: openFindings.length,
        high_severity_count: high,
        medium_severity_count: med,
        low_severity_count: low
      },
      status_distribution: statusDist,
      category_distribution: catDist,
      priority_queue: priorityQueue,
      recent_activity: mockAuditEvents.slice(0, 8)
    } as T;
  }

  // 3. Applications List
  if (endpoint.startsWith("/applications?") || endpoint === "/applications") {
    if (method === "POST") {
      const newApp: ApplicationRecord = {
        id: mockApps.length + 1,
        application_number: `APP-2026-AICTE-${Math.floor(1000 + Math.random() * 9000)}`,
        institution_name: body.institution_name,
        institution_code: body.institution_code,
        category: body.category || "Engineering & Technology",
        application_category: body.application_category || "Extension of Approval (EOA)",
        state: body.state || "Karnataka",
        city: body.city || "Bengaluru",
        academic_year: body.academic_year || "2025-2026",
        status: "PENDING_REVIEW",
        assigned_reviewer: "Dr. A. Sharma (Senior Assessor)",
        reviewer_notes: "",
        reviewer_recommendation: "PENDING",
        document_count: 0,
        finding_count: 0,
        failed_findings_count: 0,
        warning_findings_count: 0,
        passed_findings_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        documents: [],
        findings: [],
        audit_events: []
      };
      mockApps.unshift(newApp);
      return newApp as T;
    }

    return {
      items: mockApps,
      pagination: {
        total: mockApps.length,
        page: 1,
        page_size: 10,
        total_pages: 1
      }
    } as T;
  }

  // 4. Single Application Detail
  const appMatch = endpoint.match(/^\/applications\/(\d+)$/);
  if (appMatch) {
    const appId = Number(appMatch[1]);
    const found = mockApps.find((a) => a.id === appId) || mockApps[0];

    if (method === "PATCH") {
      if (body.status) found.status = body.status;
      if (body.reviewer_notes !== undefined) found.reviewer_notes = body.reviewer_notes;
      if (body.reviewer_recommendation) found.reviewer_recommendation = body.reviewer_recommendation;
      found.updated_at = new Date().toISOString();
      return found as T;
    }

    return found as T;
  }

  // 5. Findings Adjudication
  const findingMatch = endpoint.match(/^\/findings\/(\d+)$/);
  if (findingMatch) {
    const fId = Number(findingMatch[1]);
    for (const a of mockApps) {
      const target = (a.findings || []).find((f) => f.id === fId);
      if (target) {
        target.status = body.status || "RESOLVED";
        target.resolution_notes = body.resolution_notes || "";
        target.resolved_by = body.resolved_by || "Dr. A. Sharma";
        target.resolved_at = new Date().toISOString();

        // Recalculate app failed count
        a.failed_findings_count = (a.findings || []).filter(
          (f) => (f.severity === "HIGH" || f.severity === "CRITICAL") && f.status === "OPEN"
        ).length;
        if (a.failed_findings_count === 0) {
          a.status = "VERIFIED_COMPLIANT";
        }
        return target as T;
      }
    }
  }

  // 6. Rules List
  if (endpoint === "/rules") {
    if (method === "POST") {
      const newRule: ComplianceRuleRecord = {
        id: mockRules.length + 1,
        rule_id: body.rule_id || `CUSTOM-${Math.floor(100 + Math.random() * 900)}`,
        name: body.name,
        category: body.category || "COMPLETENESS",
        description: body.description,
        official_reference: body.official_reference || "Custom Compliance Rule",
        required_documents: [],
        required_fields: [],
        severity: body.severity || "MEDIUM",
        is_enabled: true,
        version: "v2025.custom",
        effective_date: "2025-04-01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockRules.push(newRule);
      return newRule as T;
    }
    return mockRules as T;
  }

  const ruleMatch = endpoint.match(/^\/rules\/(\d+)$/);
  if (ruleMatch) {
    const rId = Number(ruleMatch[1]);
    const r = mockRules.find((item) => item.id === rId);
    if (r && body.is_enabled !== undefined) {
      r.is_enabled = body.is_enabled;
    }
    return r as T;
  }

  // 7. Reference Records
  if (endpoint.startsWith("/reference-records")) {
    if (method === "POST") {
      const newRef: SyntheticReferenceRecord = {
        id: mockRefRecords.length + 1,
        institution_code: body.institution_code,
        institution_name: body.institution_name,
        reference_identifier: `REF-SYN-AICTE-${Math.floor(100 + Math.random() * 900)}`,
        state: body.state || "Karnataka",
        approval_status: "APPROVED_IN_REGISTRY",
        valid_from: "2020-01-01",
        valid_to: "2027-12-31",
        land_area_acres: body.land_area_acres || 5.0,
        source_type: "SYNTHETIC_REGISTRY_MOCK",
        disclaimer: "Synthetic demonstration record — not an official AICTE registry.",
        last_verified: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockRefRecords.push(newRef);
      return newRef as T;
    }
    return {
      items: mockRefRecords,
      disclaimer: "Synthetic demonstration records — not an official AICTE registry."
    } as T;
  }

  // 8. Reports
  if (endpoint === "/reports") {
    return mockReportsList as T;
  }

  if (endpoint.match(/^\/applications\/\d+\/reports$/)) {
    const newReport: ReportRecord = {
      id: mockReportsList.length + 1,
      application_id: 1,
      application_number: "APP-2026-AICTE-0101",
      institution_name: "Apex Institute of Technology & Management",
      report_identifier: `RPT-VERICORE-${Math.floor(100000 + Math.random() * 900000)}`,
      title: "Compliance Assessment Report",
      file_size: 15400,
      generated_by: body.generated_by || "Dr. A. Sharma (Senior Assessor)",
      status: "FINAL",
      summary: "Compliance scrutiny complete. All statutory findings adjudicated.",
      created_at: new Date().toISOString()
    };
    mockReportsList.unshift(newReport);
    return newReport as T;
  }

  // 9. Audit Events
  if (endpoint.startsWith("/audit-events")) {
    return mockAuditEvents as T;
  }

  // 10. Seed Demo
  if (endpoint === "/demo/seed") {
    mockApps = JSON.parse(JSON.stringify(initialApplications));
    mockRules = JSON.parse(JSON.stringify(initialRules));
    mockRefRecords = JSON.parse(JSON.stringify(initialReferenceRecords));
    return { status: "SUCCESS", message: "Demo database reset and initialized." } as T;
  }

  return {} as T;
}

export const api = {
  // System health
  getHealth: () => request<HealthStatus>("/health"),

  // Dashboard
  getDashboard: () => request<DashboardData>("/dashboard"),

  // Applications
  getApplications: (params?: {
    search?: string;
    status?: string;
    category?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.status) q.append("status", params.status);
    if (params?.category) q.append("category", params.category);
    if (params?.sort_by) q.append("sort_by", params.sort_by);
    if (params?.sort_order) q.append("sort_order", params.sort_order);
    if (params?.page) q.append("page", params.page.toString());
    if (params?.page_size) q.append("page_size", params.page_size.toString());
    return request<{ items: ApplicationRecord[]; pagination: any }>(`/applications?${q.toString()}`);
  },

  getApplication: (id: number) => request<ApplicationRecord>(`/applications/${id}`),

  createApplication: (payload: {
    institution_name: string;
    institution_code: string;
    category: string;
    application_category: string;
    state: string;
    city: string;
    academic_year: string;
    contact_email?: string;
    contact_phone?: string;
  }) => request<ApplicationRecord>("/applications", {
    method: "POST",
    body: JSON.stringify(payload)
  }),

  updateApplication: (id: number, payload: {
    status?: string;
    reviewer_notes?: string;
    reviewer_recommendation?: string;
    assigned_reviewer?: string;
    actor?: string;
  }) => request<ApplicationRecord>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }),

  // Documents
  uploadDocument: (appId: number, file: File, categoryHint: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", categoryHint);

    return fetch(`${API_BASE}/applications/${appId}/documents`, {
      method: "POST",
      body: formData
    }).then(async res => {
      if (!res.ok) {
        return handleMockFallback<DocumentRecord>(`/applications/${appId}/documents`, { method: "POST" });
      }
      return res.json() as Promise<DocumentRecord>;
    }).catch(() => {
      return handleMockFallback<DocumentRecord>(`/applications/${appId}/documents`, { method: "POST" });
    });
  },

  getDocument: (id: number) => request<DocumentRecord>(`/documents/${id}`),

  getDocumentFileUrl: (id: number) => `${API_BASE}/documents/${id}/file`,

  reprocessDocument: (id: number) => request<DocumentRecord>(`/documents/${id}/extract`, {
    method: "POST"
  }),

  correctField: (docId: number, payload: { field_id: number; corrected_value: string; actor?: string }) =>
    request<ExtractedField>(`/documents/${docId}/fields`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  // Verification & Findings
  runAssessment: (appId: number, actor?: string) =>
    request<{ message: string; findings_count: number; findings: VerificationFinding[]; application_status: string }>(
      `/applications/${appId}/assess`,
      {
        method: "POST",
        body: JSON.stringify({ actor: actor || "Reviewer Desk Manual Run" })
      }
    ),

  resolveFinding: (findingId: number, payload: {
    status: string;
    resolution_notes: string;
    resolved_by?: string;
  }) => request<VerificationFinding>(`/findings/${findingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }),

  // Compliance Rules
  getRules: () => request<ComplianceRuleRecord[]>("/rules"),

  createRule: (payload: {
    name: string;
    rule_id?: string;
    category: string;
    description: string;
    official_reference?: string;
    severity?: string;
  }) => request<ComplianceRuleRecord>("/rules", {
    method: "POST",
    body: JSON.stringify(payload)
  }),

  updateRule: (id: number, payload: { is_enabled?: boolean; description?: string; severity?: string }) =>
    request<ComplianceRuleRecord>(`/rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  // Synthetic Reference Registry
  getReferenceRecords: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<{ items: SyntheticReferenceRecord[]; disclaimer: string }>(`/reference-records${q}`);
  },

  createReferenceRecord: (payload: {
    institution_code: string;
    institution_name: string;
    state: string;
    land_area_acres: number;
    sample_registration_no?: string;
  }) => request<SyntheticReferenceRecord>("/reference-records", {
    method: "POST",
    body: JSON.stringify(payload)
  }),

  // Reports
  getReports: () => request<ReportRecord[]>("/reports"),

  generateReport: (appId: number, generatedBy?: string) =>
    request<ReportRecord>(`/applications/${appId}/reports`, {
      method: "POST",
      body: JSON.stringify({ generated_by: generatedBy || "Dr. A. Sharma (Senior Assessor)" })
    }),

  getReportDownloadUrl: (id: number) => `${API_BASE}/reports/${id}/download`,

  // Audit Events
  getAuditEvents: (params?: { search?: string; event_type?: string; application_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.event_type) q.append("event_type", params.event_type);
    if (params?.application_id) q.append("application_id", params.application_id.toString());
    return request<AuditEventRecord[]>(`/audit-events?${q.toString()}`);
  },

  // Demo Controls
  seedDemo: () => request<{ status: string; message: string }>("/demo/seed", {
    method: "POST"
  })
};
