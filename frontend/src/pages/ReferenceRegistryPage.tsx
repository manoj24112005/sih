import React, { useEffect, useState } from "react";
import {
  Database,
  Search,
  Plus,
  RefreshCw,
  ShieldAlert,
  Building,
  CheckCircle,
  ExternalLink,
  X
} from "lucide-react";
import { api } from "../services/api";
import { SyntheticReferenceRecord } from "../types";
import { Badge } from "../components/ui/Badge";

export const ReferenceRegistryPage: React.FC = () => {
  const [records, setRecords] = useState<SyntheticReferenceRecord[]>([]);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  const [newRecord, setNewRecord] = useState({
    institution_code: "",
    institution_name: "",
    state: "Karnataka",
    land_area_acres: 5.0,
    sample_registration_no: ""
  });
  const [creating, setCreating] = useState<boolean>(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getReferenceRecords(search);
      setRecords(res.items);
    } catch (err) {
      console.error("Failed to load reference records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.createReferenceRecord(newRecord);
      setCreateModalOpen(false);
      setNewRecord({
        institution_code: "",
        institution_name: "",
        state: "Karnataka",
        land_area_acres: 5.0,
        sample_registration_no: ""
      });
      await fetchRecords();
    } catch (err) {
      alert("Failed to create record");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Synthetic Reference Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulated institutional database for benchmark testing and cross-referencing PID parameters in a sandboxed environment.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Synthetic Record</span>
        </button>
      </div>

      {/* Prominent Disclaimer Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Synthetic Demonstration Records Notice</h4>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            These records are purely synthetic mock data generated for prototype evaluation during the Smart India Hackathon.
            A successful match indicates agreement with this local test dataset and must <b>never</b> be represented as official approval,
            genuine institutional endorsement, or live connection to the AICTE production registry.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Institution Code, Name, or State..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">{records.length} Records</span>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Permanent ID (PID)</th>
                <th className="px-4 py-3">Institution Name</th>
                <th className="px-4 py-3">Reference Identifier</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Approval Status</th>
                <th className="px-4 py-3">Sample Registration</th>
                <th className="px-4 py-3">Validity Span</th>
                <th className="px-4 py-3 text-right">Land Area</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 text-teal-600 animate-spin mx-auto mb-2" />
                    Querying synthetic registry...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No synthetic records match your search query.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {rec.institution_code}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {rec.institution_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-teal-700 whitespace-nowrap">
                      {rec.reference_identifier}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      {rec.state}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant="success">Approved in Mock Registry</Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {rec.sample_registration_no || "N/A"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {rec.valid_from} &rarr; {rec.valid_to}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                      {rec.land_area_acres} Acres
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RECORD MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Register Synthetic Benchmark Institution
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Permanent ID (PID)</label>
                <input
                  type="text"
                  required
                  value={newRecord.institution_code}
                  onChange={(e) => setNewRecord({ ...newRecord, institution_code: e.target.value })}
                  placeholder="e.g. 1-8472910482"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  required
                  value={newRecord.institution_name}
                  onChange={(e) => setNewRecord({ ...newRecord, institution_name: e.target.value })}
                  placeholder="e.g. Saraswati College of Engineering"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  required
                  value={newRecord.state}
                  onChange={(e) => setNewRecord({ ...newRecord, state: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Land Area (Acres)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newRecord.land_area_acres}
                  onChange={(e) => setNewRecord({ ...newRecord, land_area_acres: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Sample Registration / Order No</label>
                <input
                  type="text"
                  value={newRecord.sample_registration_no}
                  onChange={(e) => setNewRecord({ ...newRecord, sample_registration_no: e.target.value })}
                  placeholder="e.g. REG-SYN-2022-881"
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
                  {creating ? "Adding..." : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
