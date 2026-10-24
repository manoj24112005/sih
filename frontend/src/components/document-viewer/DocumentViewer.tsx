import React, { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { api } from "../../services/api";

interface DocumentViewerProps {
  documentId: number | null;
  documentName?: string;
  category?: string;
  initialPage?: number;
  totalPages?: number;
  highlightText?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  documentName = "Select a document",
  category = "OTHER",
  initialPage = 1,
  totalPages = 2,
  highlightText = ""
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchText, setSearchText] = useState<string>(highlightText);

  // Sync initial page if changed from external finding click
  React.useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, documentId]);

  if (!documentId) {
    return (
      <div className="h-full min-h-[420px] bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <h4 className="font-semibold text-slate-700 text-sm">No Document Selected</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select a supporting document from the list above or click an evidence finding to view the original certificate.
        </p>
      </div>
    );
  }

  const fileUrl = `${api.getDocumentFileUrl(documentId)}#page=${currentPage}`;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Viewer Toolbar */}
      <div className="px-3 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="font-medium truncate max-w-[200px]" title={documentName}>
            {documentName}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase tracking-wider shrink-0">
            {category.replace(/_/g, " ")}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-200">
              {currentPage} / {totalPages || 2}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 2, p + 1))}
              disabled={currentPage >= (totalPages || 2)}
              className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              className="p-0.5 text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 min-w-[34px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
              className="p-0.5 text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download & External Open */}
          <a
            href={api.getDocumentFileUrl(documentId)}
            target="_blank"
            rel="noopener noreferrer"
            download={documentName}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title="Download Original File"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <a
            href={api.getDocumentFileUrl(documentId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Search within document sub-bar */}
      <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search within extracted text..."
            className="bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>
        {searchText && (
          <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
            Keyword Active
          </span>
        )}
      </div>

      {/* PDF / Document Embed Container */}
      <div className="flex-1 bg-slate-200/70 p-2 overflow-auto flex items-center justify-center min-h-[460px]">
        <div
          className="w-full h-full bg-white rounded shadow-sm overflow-hidden flex flex-col"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
        >
          <iframe
            key={`${documentId}-${currentPage}`}
            src={fileUrl}
            title={documentName}
            className="w-full h-[540px] border-none"
          />
        </div>
      </div>

      {/* Viewer Footer Status */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span>Extracted via PyMuPDF Parser (2.0)</span>
        </div>
        <span>Evidence Verification Ready</span>
      </div>
    </div>
  );
};
