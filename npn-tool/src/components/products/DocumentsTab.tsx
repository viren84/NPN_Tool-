"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ProductDoc {
  id: string; title: string; fileName: string; fileType: string; fileSize: number;
  stage: string; docType: string; extractionStatus: string; extractionError: string;
  extractedDataJson: string; createdAt: string;
}

const DOC_TYPES = ["coa", "supplier_spec", "study", "marketing_material", "competitor_label", "market_report", "other"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab({ productId, productStage, isEditable }: { productId: string; productStage: string; isEditable: boolean }) {
  const [docs, setDocs] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState("other");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/products/${productId}/documents`);
      if (r.ok) setDocs(await r.json());
      else setError("Failed to load documents");
    } catch { setError("Network error loading documents"); }
    setLoading(false);
  }, [productId]);

  useEffect(() => { reload(); }, [reload]);

  const ALLOWED_TYPES = ["pdf", "xlsx", "xls", "csv", "doc", "docx", "jpg", "jpeg", "png", "txt"];

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_TYPES.includes(ext)) {
      setError(`File type .${ext} not allowed. Accepted: ${ALLOWED_TYPES.join(", ")}`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("stage", productStage);
      fd.append("docType", docType);
      fd.append("title", file.name);
      const r = await fetch(`/api/products/${productId}/documents`, { method: "POST", body: fd });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "Upload failed"); }
    } catch { setError("Network error during upload"); }
    setUploading(false);
    reload();
  };

  const deleteDoc = async (docId: string) => {
    await fetch(`/api/products/${productId}/documents/${docId}`, { method: "DELETE" });
    reload();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">{error}</div>}
      {/* Upload section */}
      {isEditable && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Upload Document</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 shrink-0">
              {uploading ? "Uploading..." : "Choose File"}
            </button>
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          <p className="text-xs text-gray-400 mt-2">PDFs will be auto-extracted by AI. Max 50MB.</p>
        </div>
      )}

      {/* Document list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Documents ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-gray-500">{d.fileType.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.title || d.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {d.docType.replace(/_/g, " ")} · {d.stage} · {formatSize(d.fileSize)} · {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    d.extractionStatus === "completed" ? "bg-green-100 text-green-700" :
                    d.extractionStatus === "processing" ? "bg-yellow-100 text-yellow-700" :
                    d.extractionStatus === "failed" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>{d.extractionStatus}</span>
                  {isEditable && (
                    <button onClick={() => deleteDoc(d.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
