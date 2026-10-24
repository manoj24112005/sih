import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  ExternalLink,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert
} from "lucide-react";
import { api } from "../services/api";
import { ApplicationRecord } from "../types";
import { Badge } from "../components/ui/Badge";

export const ApplicationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "ALL";

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.getApplications({
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize
      });
      setApplications(res.items);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder, page, pageSize]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED_COMPLIANT":
        return <Badge variant="success">Verified Compliant</Badge>;
      case "FLAGGED_DISCREPANCIES":
        return <Badge variant="danger">Flagged Discrepancies</Badge>;
      case "IN_REVIEW":
        return <Badge variant="warning">In Review</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Rejected</Badge>;
      case "PENDING_REVIEW":
      default:
        return <Badge variant="neutral">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Applications Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage, scrutinize, and review institutional approval packages under regulatory compliance frameworks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchApplications}
            className="p-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            to="/applications/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Application ID, Institution Name, or Code..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="FLAGGED_DISCREPANCIES">Flagged Discrepancies</option>
            <option value="VERIFIED_COMPLIANT">Verified Compliant</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium shrink-0">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="ALL">All Categories</option>
            <option value="Engineering & Technology">Engineering & Technology</option>
            <option value="Technical University">Technical University</option>
            <option value="Polytechnic">Polytechnic</option>
            <option value="Management">Management</option>
          </select>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  onClick={() => handleSort("application_number")}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Application ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("institution_name")}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Institution & PID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3">Category & AY</th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3">Findings</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Assigned Assessor</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 text-teal-600 animate-spin mx-auto mb-2" />
                    Fetching application records...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No applications found</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Try adjusting search filters or click "New Application" to create one.
                    </p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-medium text-slate-900 whitespace-nowrap">
                      <Link
                        to={`/applications/${app.id}`}
                        className="hover:text-teal-700 hover:underline"
                      >
                        {app.application_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {app.institution_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        PID: {app.institution_code} &bull; {app.city}, {app.state}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{app.category}</div>
                      <div className="text-[10px] text-slate-400">AY {app.academic_year}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {app.failed_findings_count > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {app.failed_findings_count} Flagged
                        </span>
                      ) : app.warning_findings_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                          {app.warning_findings_count} Warnings
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Compliant
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                      {app.document_count} files
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap truncate max-w-[150px]">
                      {app.assigned_reviewer}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs transition-colors"
                      >
                        <span>Open Case</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{applications.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalCount}</span> applications
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-slate-700 font-medium">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={applications.length < pageSize}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
