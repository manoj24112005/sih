import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck2,
  FileText,
  ShieldAlert,
  Database,
  FileSpreadsheet,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navItems = [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/applications", label: "Applications", icon: FileCheck2 },
    { to: "/documents", label: "Document Verification", icon: FileText },
    { to: "/rules", label: "Compliance Rules", icon: ShieldAlert },
    { to: "/reference-registry", label: "Reference Registry", icon: Database },
    { to: "/reports", label: "Reports", icon: FileSpreadsheet },
    { to: "/audit-trail", label: "Audit Trail", icon: History },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-white tracking-tight text-base leading-none">
                VeriCore
              </span>
              <span className="text-[10px] text-slate-400 truncate mt-1">
                Institutional Compliance
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 focus:outline-none"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-teal-400 border-l-2 border-teal-500"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Environment Label Footer */}
      <div className="p-3 border-t border-slate-800">
        <div
          className={`flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-800 text-xs ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-slate-200 uppercase tracking-wider text-[10px]">
                LOCAL DEMO
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                SIH26261 Prototype
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
