import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  User,
  Shield,
  ExternalLink,
  ChevronRight,
  Menu,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download
} from "lucide-react";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Generate breadcrumbs from pathname
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumbMap: Record<string, string> = {
    applications: "Applications",
    new: "New Application",
    documents: "Document Verification",
    rules: "Compliance Rules",
    "reference-registry": "Reference Registry",
    reports: "Reports",
    "audit-trail": "Audit Trail",
    settings: "Settings",
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/applications?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-900 font-medium">
            VeriCore
          </Link>
          {pathParts.length > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1;
            const routeTo = `/${pathParts.slice(0, index + 1).join("/")}`;
            const label = breadcrumbMap[part] || (part.startsWith("APP-") || !isNaN(Number(part)) ? `Case #${part}` : part);

            return (
              <React.Fragment key={routeTo}>
                {isLast ? (
                  <span className="text-slate-900 font-medium truncate max-w-[200px]">
                    {label}
                  </span>
                ) : (
                  <>
                    <Link to={routeTo} className="hover:text-slate-900 truncate max-w-[150px]">
                      {label}
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Quick Search, Notifications, Profile, Environment */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search institution or PID..."
            className="w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all text-slate-900"
          />
        </form>

        {/* SIH Documentation PDF Button */}
        <a
          href="/SIH26261_VeriCore_Project_Documentation.pdf"
          target="_blank"
          rel="noopener noreferrer"
          download="SIH26261_VeriCore_Project_Documentation.pdf"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-teal-200 bg-teal-50 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition-colors shadow-xs"
          title="Download Official SIH Project Documentation PDF (SIH26261)"
        >
          <Download className="w-3.5 h-3.5 text-teal-600" />
          <span>SIH Docs PDF</span>
        </a>

        {/* Demo Environment Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-800">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          <span>Synthetic Sandbox</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 relative focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100 font-semibold text-slate-800 flex items-center justify-between">
                <span>Recent System Alerts</span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">2 New</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                <div className="p-3 hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Fire NOC Discrepancy Flagged</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Bharatiya Technical Academy NOC expired on 15-Mar-2025.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">10 mins ago</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Apex Institute Assessment Ready</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">All 5 documents cross-verified with 95% confidence score.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">25 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 border-t border-slate-100 text-center">
                <Link
                  to="/audit-trail"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-teal-700 font-medium hover:underline inline-flex items-center gap-1"
                >
                  View full audit log <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Reviewer Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
              AS
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                Dr. A. Sharma
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                Senior Compliance Assessor
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800">Dr. A. Sharma</p>
                <p className="text-slate-500 text-[11px]">sharma.assessor@vericore.local</p>
                <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                  Role: Regulatory Assessor
                </span>
              </div>
              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                System Settings
              </Link>
              <Link
                to="/rules"
                onClick={() => setProfileOpen(false)}
                className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Rule Configurations
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <div className="px-4 py-1.5 text-slate-400 text-[11px]">
                Demo Mode &bull; v1.0.0
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
