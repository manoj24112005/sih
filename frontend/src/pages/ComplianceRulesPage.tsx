import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  BookOpen,
  Filter,
  ExternalLink,
  ShieldCheck,
  X
} from "lucide-react";
import { api } from "../services/api";
import { ComplianceRuleRecord } from "../types";
import { Badge } from "../components/ui/Badge";

export const ComplianceRulesPage: React.FC = () => {
  const [rules, setRules] = useState<ComplianceRuleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // New Rule Form
  const [newRule, setNewRule] = useState({
    name: "",
    category: "COMPLETENESS",
    severity: "HIGH",
    description: "",
    official_reference: "AICTE Approval Process Handbook (APH) 2025-26"
  });
  const [creating, setCreating] = useState<boolean>(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.getRules();
      setRules(res);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (rule: ComplianceRuleRecord) => {
    try {
      await api.updateRule(rule.id, { is_enabled: !rule.is_enabled });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: !r.is_enabled } : r))
      );
    } catch (err) {
      alert("Failed to update rule state");
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.createRule(newRule);
      setCreateModalOpen(false);
      setNewRule({
        name: "",
        category: "COMPLETENESS",
        severity: "HIGH",
        description: "",
        official_reference: "AICTE Approval Process Handbook (APH) 2025-26"
      });
      await fetchRules();
    } catch (err) {
      alert("Failed to create rule");
    } finally {
      setCreating(false);
    }
  };

  const filteredRules = categoryFilter === "ALL"
    ? rules
    : rules.filter((r) => r.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Compliance Rules & Regulatory Norms
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic rule specifications governing institutional scrutiny, document mandatory checklists, and temporal validity.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Scrutiny Rule</span>
        </button>
      </div>

      {/* Official AICTE Reference Banner */}
      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-3">
        <BookOpen className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Illustrative Statutory Norms:</span>{" "}
          Rules are seeded based on the AICTE Approval Process Handbook (APH) 2025-26 (Chapter II Scrutiny Guidelines). When rules are edited, past completed audits remain historically versioned.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-medium shrink-0">Category Filter:</span>
        {[
          { key: "ALL", label: "All Rules" },
          { key: "COMPLETENESS", label: "Completeness" },
          { key: "CROSS_DOCUMENT", label: "Cross-Document" },
          { key: "DATES_VALIDITY", label: "Dates & Validity" },
          { key: "REFERENCE_RECORD", label: "Reference Registry" },
          { key: "DUPLICATE_DETECTION", label: "Duplicate Detection" },
          { key: "EXTRACTION_QUALITY", label: "Extraction Quality" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategoryFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              categoryFilter === tab.key
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Rule Identifier</th>
                <th className="px-4 py-3">Rule Name & Scrutiny Logic</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Official Citation</th>
                <th className="px-4 py-3">Version & Date</th>
                <th className="px-4 py-3 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 text-teal-600 animate-spin mx-auto mb-2" />
                    Loading rule catalog...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No rules found for this category.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {rule.rule_id}
                    </td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-semibold text-slate-900">{rule.name}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5 leading-snug line-clamp-2">
                        {rule.description}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase tracking-wider">
                        {rule.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant={rule.severity === "HIGH" ? "danger" : rule.severity === "MEDIUM" ? "warning" : "info"}>
                        {rule.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[11px] max-w-xs">
                      {rule.official_reference || "N/A"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <div>{rule.version}</div>
                      <div className="text-[10px] text-slate-400">Eff: {rule.effective_date}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          rule.is_enabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {rule.is_enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RULE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Define New Compliance Scrutiny Rule
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g. Sanitary Facility & Drinking Water Certificate Norm"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rule Category</label>
                <select
                  value={newRule.category}
                  onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800"
                >
                  <option value="COMPLETENESS">COMPLETENESS</option>
                  <option value="CROSS_DOCUMENT">CROSS_DOCUMENT</option>
                  <option value="DATES_VALIDITY">DATES_VALIDITY</option>
                  <option value="REFERENCE_RECORD">REFERENCE_RECORD</option>
                  <option value="DUPLICATE_DETECTION">DUPLICATE_DETECTION</option>
                  <option value="EXTRACTION_QUALITY">EXTRACTION_QUALITY</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Default Severity</label>
                <select
                  value={newRule.severity}
                  onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800"
                >
                  <option value="HIGH">HIGH (Blocks Approval)</option>
                  <option value="MEDIUM">MEDIUM (Warning Finding)</option>
                  <option value="LOW">LOW (Informational Note)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rule Description</label>
                <textarea
                  rows={3}
                  required
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Specify verification conditions and regulatory justification..."
                  className="w-full p-2.5 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Official Reference / APH Clause</label>
                <input
                  type="text"
                  value={newRule.official_reference}
                  onChange={(e) => setNewRule({ ...newRule, official_reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
