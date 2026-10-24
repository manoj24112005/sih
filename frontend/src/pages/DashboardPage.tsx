import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  Database,
  Building2,
  FileText,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { api } from "../services/api";
import { DashboardData } from "../types";
import { Badge } from "../components/ui/Badge";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [reportingPeriod, setReportingPeriod] = useState("AY 2025-2026 (All)");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await api.seedDemo();
      await loadDashboard();
    } catch (err) {
      alert("Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading compliance metrics from database...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_applications: 0,
    awaiting_review: 0,
    flagged_discrepancies: 0,
    completed_reviews: 0,
    open_findings_count: 0,
    high_severity_count: 0,
    medium_severity_count: 0,
    low_severity_count: 0
  };

  // Prepare chart data from database
  const statusChartData = Object.entries(data?.status_distribution || {}).map(([key, val]) => ({
    name: key.replace(/_/g, " "),
    count: val
  }));

  const categoryChartData = Object.entries(data?.category_distribution || {}).map(([key, val]) => ({
    name: key,
    value: val
  }));

  const COLORS = ["#0f766e", "#3b82f6", "#e11d48", "#f59e0b", "#64748b"];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Compliance Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of institutional approval submissions, document extraction pipelines, and regulatory findings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <select
            value={reportingPeriod}
            onChange={(e) => setReportingPeriod(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option>AY 2025-2026 (All)</option>
            <option>Extension of Approval (EOA)</option>
            <option>New Institution Approvals</option>
            <option>Increase in Intake</option>
          </select>

          {/* Seed demo data button */}
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Seeds sample institutions with real PDFs"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>{seeding ? "Seeding..." : "Load Demo Data"}</span>
          </button>

          {/* Secondary action */}
          <Link
            to="/applications"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>View Applications</span>
          </Link>

          {/* Primary action */}
          <Link
            to="/applications/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* Synthetic Data Notice Banner */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <b>Decision Support System:</b> All calculations are generated live from local database records. Matches compare against synthetic demonstration registries.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">v1.0.0-SIH26261</span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Applications</span>
            <div className="p-2 bg-slate-100 rounded-md">
              <FileCheck2 className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {kpis.total_applications}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active cases in verification registry
            </p>
          </div>
        </div>

        {/* Awaiting Review */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Awaiting Review</span>
            <div className="p-2 bg-amber-50 rounded-md">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {kpis.awaiting_review}
            </div>
            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
              Requires assessor evaluation
            </p>
          </div>
        </div>

        {/* Flagged Discrepancies */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Flagged Findings</span>
            <div className="p-2 bg-rose-50 rounded-md">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-rose-600 font-mono">
              {kpis.high_severity_count}
            </div>
            <p className="text-[11px] text-rose-700 mt-1 font-medium">
              High severity inconsistencies detected
            </p>
          </div>
        </div>

        {/* Completed Reviews */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Reviews</span>
            <div className="p-2 bg-emerald-50 rounded-md">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {kpis.completed_reviews}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              Verified compliant or adjudicated
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend / Status Distribution */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Application Review Status Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Live breakdown of applications currently undergoing automated verification
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    angle={-10}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 12,
                      border: "none"
                    }}
                  />
                  <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No application data available yet. Click "Load Demo Data" to populate.
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Institutional Category
              </h3>
              <p className="text-xs text-slate-500">Distribution by institution type</p>
            </div>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-52 w-full flex-1">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 11
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No categories recorded
              </div>
            )}
          </div>

          <div className="mt-2 space-y-1 text-xs">
            {categoryChartData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <span className="font-mono font-medium">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Review Queue & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Review Queue */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Priority Review Queue
              </h3>
              <p className="text-xs text-slate-500">
                Applications with flagged discrepancies requiring human adjudication
              </p>
            </div>
            <Link
              to="/applications?status=FLAGGED_DISCREPANCIES"
              className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.priority_queue && data.priority_queue.length > 0 ? (
              data.priority_queue.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/applications/${item.id}`}
                      className="font-medium text-slate-900 hover:text-teal-700 text-xs block truncate"
                    >
                      {item.institution_name}
                    </Link>
                    <span className="text-[11px] font-mono text-slate-500 mt-0.5 block">
                      {item.application_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.urgent_findings > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        {item.urgent_findings} High Severity
                      </span>
                    )}
                    <Link
                      to={`/applications/${item.id}`}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                      title="Open Case"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No flagged applications in priority queue.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Recent Audit Trail Events
              </h3>
              <p className="text-xs text-slate-500">
                Real-time chronological events from the system audit log
              </p>
            </div>
            <Link
              to="/audit-trail"
              className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
            >
              Full log <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_activity && data.recent_activity.length > 0 ? (
              data.recent_activity.map((aud) => (
                <div key={aud.id} className="text-xs flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 font-medium leading-snug">
                      {aud.details}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{aud.actor}</span>
                      <span>&bull;</span>
                      <span>{new Date(aud.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No audit events recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
