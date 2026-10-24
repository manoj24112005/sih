import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  User,
  Clock,
  ArrowRight
} from "lucide-react";
import { api } from "../services/api";
import { AuditEventRecord } from "../types";
import { Badge } from "../components/ui/Badge";

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [search, setSearch] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditEvents({
        search: search.trim() || undefined,
        event_type: eventTypeFilter !== "ALL" ? eventTypeFilter : undefined
      });
      setEvents(res);
    } catch (err) {
      console.error("Failed to load audit events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, eventTypeFilter]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case "APPLICATION_CREATED":
        return <Badge variant="info">Application Created</Badge>;
      case "DOCUMENT_UPLOADED":
        return <Badge variant="neutral">Document Uploaded</Badge>;
      case "ASSESSMENT_RUN":
        return <Badge variant="warning">Assessment Executed</Badge>;
      case "FINDING_RESOLVED":
        return <Badge variant="success">Finding Resolved</Badge>;
      case "FIELD_CORRECTED":
        return <Badge variant="primary">Field Corrected</Badge>;
      case "REPORT_GENERATED":
        return <Badge variant="success">Report Generated</Badge>;
      default:
        return <Badge variant="neutral">{type.replace(/_/g, " ")}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Audit Trail & Compliance Log
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chronological, immutable record of every document ingestion, automated assessment execution, field correction, and reviewer adjudication.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          className="p-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-600 transition-colors self-start sm:self-auto"
          title="Refresh log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by details or assessor actor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Event Type:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="ALL">All Events</option>
            <option value="APPLICATION_CREATED">Application Created</option>
            <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
            <option value="ASSESSMENT_RUN">Assessment Executed</option>
            <option value="FINDING_RESOLVED">Finding Resolved</option>
            <option value="FIELD_CORRECTED">Field Corrected</option>
            <option value="REPORT_GENERATED">Report Generated</option>
          </select>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Actor / Agent</th>
                <th className="px-4 py-3">Event Particulars & Context</th>
                <th className="px-4 py-3">Before &rarr; After State</th>
                <th className="px-4 py-3 text-right">Related Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 text-teal-600 animate-spin mx-auto mb-2" />
                    Fetching audit event stream...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No audit events match your filter.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "medium"
                      })}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getEventBadge(ev.event_type)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      {ev.actor}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 leading-snug max-w-md">
                      {ev.details}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {ev.before_value || ev.after_value ? (
                        <span>
                          <span className="text-slate-400">{ev.before_value || "None"}</span> &rarr;{" "}
                          <span className="text-teal-700 font-semibold">{ev.after_value || "Updated"}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {ev.application_id ? (
                        <Link
                          to={`/applications/${ev.application_id}`}
                          className="hover:text-teal-700 hover:underline"
                        >
                          Case #{ev.application_id}
                        </Link>
                      ) : (
                        <span className="text-slate-400">System</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Security Note */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          <b>Integrity Notice:</b> Events are recorded in the local SQLite audit log with timestamps and actor identities. For multi-node government deployment, an RFC 3161 digital timestamping authority can be connected.
        </span>
      </div>
    </div>
  );
};
