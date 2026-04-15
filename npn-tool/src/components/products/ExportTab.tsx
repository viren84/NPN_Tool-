"use client";

import { useState, useEffect } from "react";

interface DocOption {
  documentType: string;
  label: string;
  numberedLabel: string;
  status: string;
  hasContent: boolean;
}

export default function ExportTab({ productId, applicationId }: { productId: string; applicationId: string | null }) {
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    fetch(`/api/applications/${applicationId}/export-pdf?list=true`)
      .then(r => r.ok ? r.json() : { documents: [] })
      .then(d => { setDocs(d.documents || []); setSelected(new Set((d.documents || []).map((doc: DocOption) => doc.documentType))); });
  }, [applicationId]);

  const toggleDoc = (type: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map(d => d.documentType)));
  };

  const downloadSelected = () => {
    if (!applicationId || selected.size === 0) return;
    const types = Array.from(selected).join(",");
    window.open(`/api/applications/${applicationId}/export-pdf?docTypes=${types}`, "_blank");
  };

  const downloadAll = () => {
    if (!applicationId) return;
    window.open(`/api/applications/${applicationId}/export-pdf`, "_blank");
  };

  const downloadSingle = (type: string) => {
    if (!applicationId) return;
    window.open(`/api/applications/${applicationId}/export-pdf?docType=${type}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Excel Exports */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Excel Exports</h3>
        <div className="grid grid-cols-2 gap-3">
          {applicationId && (
            <a href={`/api/applications/${applicationId}/export-preset`}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <span className="text-green-700 text-xs font-bold">XLS</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Application Preset</p>
                <p className="text-xs text-gray-500">7 sheets: product, ingredients, claims, dosage, risk, NMI, data sources</p>
              </div>
            </a>
          )}
          <a href="/api/applications/export-template"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 text-xs font-bold">TPL</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Blank Template</p>
              <p className="text-xs text-gray-500">Empty mapping template for external tools</p>
            </div>
          </a>
        </div>
      </div>

      {/* PDF Document Downloads */}
      {applicationId && docs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">PDF Documents ({docs.length})</h3>
            <div className="flex gap-2">
              <button onClick={downloadSelected} disabled={selected.size === 0}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                Download Selected ({selected.size})
              </button>
              <button onClick={downloadAll}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Download All
              </button>
            </div>
          </div>

          {/* Select all / none */}
          <div className="mb-3 flex items-center gap-2">
            <button onClick={toggleAll} className="text-xs text-gray-500 hover:text-gray-700">
              {selected.size === docs.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-1">
            {docs.map(d => (
              <div key={d.documentType}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selected.has(d.documentType) ? "bg-red-50 border border-red-200" : "hover:bg-gray-50 border border-transparent"
                }`}
                onClick={() => toggleDoc(d.documentType)}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selected.has(d.documentType)} onChange={() => toggleDoc(d.documentType)}
                    className="w-4 h-4 text-red-600 rounded" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.numberedLabel}</p>
                    <p className="text-xs text-gray-400">{d.status}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); downloadSingle(d.documentType); }}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  Single PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!applicationId && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Create a PLA Application from this product to generate and export documents.</p>
        </div>
      )}
    </div>
  );
}
