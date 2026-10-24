import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { NewApplicationWizard } from "./pages/NewApplicationWizard";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { DocumentVerificationPage } from "./pages/DocumentVerificationPage";
import { ComplianceRulesPage } from "./pages/ComplianceRulesPage";
import { ReferenceRegistryPage } from "./pages/ReferenceRegistryPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AuditTrailPage } from "./pages/AuditTrailPage";
import { SettingsPage } from "./pages/SettingsPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/new" element={<NewApplicationWizard />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="documents" element={<DocumentVerificationPage />} />
          <Route path="rules" element={<ComplianceRulesPage />} />
          <Route path="reference-registry" element={<ReferenceRegistryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-trail" element={<AuditTrailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
