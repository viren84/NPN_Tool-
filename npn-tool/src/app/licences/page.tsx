"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

// Types
interface Licence {
  id: string; licenceNumber: string; productName: string; productNameFr: string;
  dosageForm: string; routeOfAdmin: string; companyCode: string; companyName: string;
  applicationClass: string; submissionType: string; productStatus: string;
  licenceDate: string; revisedDate: string; importedFrom: string;
  licencePdfPath: string; notes: string;
  medicinalIngredientsJson: string; nonMedIngredientsJson: string;
  claimsJson: string; risksJson: string; dosesJson: string;
  amendments: Array<{ id: string; amendmentType: string; status: string; description: string }>;
}

interface SourceFile { name: string; path: string; size: number; ext: string }
interface Attachment { id: string; fileName: string; fileType: string; fileSize: number; docCategory: string; createdAt: string; uploadedBy?: { name: string } }
interface ScanResult { folder: string; status: string; licenceNumber?: string; productName?: string; error?: string }

function jp(json: string | undefined): unknown[] {
  if (!json) return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700", non_active: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-700", suspended: "bg-yellow-100 text-yellow-700",
};

export default function LicencesPage() {
  const [user, setUser] = useState<{ id: string; name: string; role: string; username: string } | null>(null);
  const [licences, setLicences] = useState<Licence[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importTab, setImportTab] = useState<"single" | "folder" | "scan">("single");
  const [scanPath, setScanPath] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const folderRef = useRef<HTMLInputElement>(null);

  // Detail panel
  const [selected, setSelected] = useState<Licence | null>(null);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(setUser).catch(() => { window.location.href = "/login"; });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/licences${q}`);
    if (res.ok) setLicences(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (lic: Licence) => {
    setSelected(lic);
    const [attRes, filesRes] = await Promise.all([
      fetch(`/api/attachments?entityType=licence&entityId=${lic.id}`),
      lic.licencePdfPath ? fetch(`/api/files/list?path=${encodeURIComponent(lic.licencePdfPath)}`) : null,
    ]);
    setAttachments(attRes.ok ? await attRes.json() : []);
    setSourceFiles(filesRes?.ok ? await filesRes.json() : []);
  };

  const doDelete = async (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); setDeleteError(""); return; }
    // Show loading
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/licences/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || `Delete failed (${res.status})`);
        setDeleting(false);
        return;
      }
      // Close panel if deleting the selected item
      if (selected?.id === id) { setSelected(null); setSourceFiles([]); setAttachments([]); }
      // Reset states
      setConfirmDel(null);
      // Force refresh
      const freshRes = await fetch(`/api/licences${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      if (freshRes.ok) setLicences(await freshRes.json());
    } catch {
      setDeleteError("Network error — could not delete");
    }
    setDeleting(false);
  };

  // Folder upload
  const handleFolderUpload = async (files: FileList) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return;
    setScanning(true); setScanResults([]);

    // Group by folder
    const groups: Map<string, Array<{ file: File; path: string }>> = new Map();
    for (const f of pdfs) {
      const rp = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      const parts = rp.replace(/\\/g, "/").split("/");
      if (parts.some(p => p.toLowerCase() === "old")) continue;
      const folder = parts.length >= 3 ? parts[parts.length - 2] : parts.length > 1 ? parts[0] : "ungrouped";
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder)!.push({ file: f, path: rp });
    }

    const results: ScanResult[] = [];
    for (const [folderName, gFiles] of groups) {
      try {
        const fd = new FormData();
        gFiles.forEach((g, i) => { fd.append(`file_${i}`, g.file); fd.append(`path_${i}`, g.path); });
        const res = await fetch("/api/upload/batch", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          for (const r of data.results) {
            if (r.status === "success" && r.extractedData) {
              // Auto-save — check for duplicates first
              const ed = r.extractedData;
              if (ed.licenceNumber) {
                const existing = await fetch(`/api/licences?q=${ed.licenceNumber}`).then(r => r.json());
                if (existing.some((l: Licence) => l.licenceNumber === ed.licenceNumber)) {
                  results.push({ folder: r.folderName, status: "skipped", licenceNumber: ed.licenceNumber as string, productName: (ed.productName as string) || r.folderName, error: "Already exists" });
                  continue;
                }
              }
              await fetch("/api/licences", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  licenceNumber: ed.licenceNumber || "", productName: ed.productName || r.folderName,
                  productNameFr: ed.productNameFr || "", dosageForm: ed.dosageForm || "",
                  routeOfAdmin: ed.routeOfAdmin || "", companyName: ed.companyName || "",
                  companyCode: ed.companyCode || "", applicationClass: ed.applicationClass || "",
                  submissionType: ed.submissionType || "", licenceDate: ed.licenceDate || "",
                  medicinalIngredientsJson: JSON.stringify(ed.medicinalIngredients || []),
                  nonMedIngredientsJson: JSON.stringify(ed.nonMedicinalIngredients || []),
                  claimsJson: JSON.stringify(ed.claims || []),
                  risksJson: JSON.stringify(ed.risks || []),
                  dosesJson: JSON.stringify(ed.doses || []),
                  importedFrom: "folder_upload",
                }),
              });
              results.push({ folder: r.folderName, status: "success", licenceNumber: ed.licenceNumber, productName: ed.productName || r.folderName });
            } else {
              results.push({ folder: r.folderName, status: "error", error: r.error || "AI extraction failed" });
            }
          }
        } else {
          results.push({ folder: folderName, status: "error", error: "Upload failed" });
        }
      } catch { results.push({ folder: folderName, status: "error", error: "Network error" }); }
    }
    setScanResults(results);

    // AUTO: Save uploaded PDFs as attachments for each created licence
    for (const [, gFiles] of groups) {
      for (const gf of gFiles) {
        // Find the licence that was just created for this group
        const matchResult = results.find(r => r.status === "success" && gFiles.some(f => f.path.includes(r.folder)));
        if (matchResult?.licenceNumber) {
          const licences = await fetch(`/api/licences?q=${matchResult.licenceNumber}`).then(r => r.json());
          const lic = licences.find((l: Licence) => l.licenceNumber === matchResult.licenceNumber);
          if (lic) {
            const fd = new FormData();
            fd.append("file", gf.file);
            fd.append("entityType", "licence");
            fd.append("entityId", lic.id);
            fd.append("docCategory", gf.file.name.toUpperCase().startsWith("IL") ? "il_letter" : gf.file.name.toUpperCase().startsWith("PL") ? "pl_licence" : "other");
            await fetch("/api/attachments", { method: "POST", body: fd });
          }
        }
      }
    }

    // AUTO: Run LNHPD sync to fill claims, risks, doses
    await fetch("/api/sync/lnhpd", { method: "POST" });

    setScanning(false);
    await load();
  };

  // Folder scan (server-side)
  const doScan = async () => {
    if (!scanPath.trim()) return;
    setScanning(true); setScanResults([]);
    try {
      const res = await fetch("/api/upload/scan-folder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: scanPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResults(data.results || []);
      }
    } catch { /* ignore */ }

    // AUTO: Run LNHPD sync after scan too
    await fetch("/api/sync/lnhpd", { method: "POST" });

    setScanning(false);
    await load();
  };

  if (!user) return null;

  const activeCount = licences.filter(l => l.productStatus === "active").length;
  const archivedCount = licences.filter(l => l.productStatus !== "active").length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      {/* Main Content */}
      <main className={`flex-1 ml-64 p-6 ${selected ? "mr-[540px]" : ""} transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Active Licences</h2>
            <p className="text-xs text-gray-500">{activeCount} active · {archivedCount} archived</p>
          </div>
          <div className="flex gap-2">
            <a href="/api/licences/export?format=csv" download
              className="px-3 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 text-xs">
              CSV
            </a>
            <a href="/api/licences/export-excel" download
              className="px-3 py-2.5 border border-green-300 text-green-700 text-sm rounded-lg hover:bg-green-50 text-xs">
              Excel
            </a>
            <button onClick={() => { setShowImport(true); setScanResults([]); }}
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Import
            </button>
          </div>
        </div>

        {/* Search */}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by NPN or product name..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-4 bg-white" />

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
                <th className="text-left px-4 py-3">NPN</th>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Form</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Issued</th>
                <th className="text-right px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : licences.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-400 mb-2">No licences yet</p>
                  <button onClick={() => setShowImport(true)} className="text-sm text-red-600 hover:text-red-800 font-medium">Import from PDFs</button>
                </td></tr>
              ) : licences.map(lic => {
                const isArchived = lic.productStatus !== "active";
                return (
                <tr key={lic.id}
                  onClick={() => openDetail(lic)}
                  className={`cursor-pointer transition-colors ${selected?.id === lic.id ? "bg-blue-50" : isArchived ? "opacity-50 hover:opacity-75" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 font-medium">{lic.licenceNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {lic.productName}
                    {isArchived && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">archived</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lic.dosageForm}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lic.applicationClass}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lic.productStatus] || "bg-gray-100 text-gray-500"}`}>{lic.productStatus}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{lic.licenceDate}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {confirmDel === lic.id ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1">
                          <button onClick={() => doDelete(lic.id)} disabled={deleting}
                            className="text-xs bg-red-600 text-white px-2.5 py-1 rounded disabled:opacity-50">
                            {deleting ? "Deleting..." : "Confirm"}
                          </button>
                          <button onClick={() => { setConfirmDel(null); setDeleteError(""); }} disabled={deleting}
                            className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Cancel</button>
                        </div>
                        {deleteError && <p className="text-xs text-red-600 max-w-[150px] text-right">{deleteError}</p>}
                      </div>
                    ) : (
                      <button onClick={() => doDelete(lic.id)}
                        className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded hover:bg-red-100 font-medium">Delete</button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* ========== DETAIL PANEL (right slide-out) ========== */}
      {selected && (() => {
        const sl = selected;
        const ings = jp(sl.medicinalIngredientsJson);
        const claims = jp(sl.claimsJson);
        const risks = jp(sl.risksJson);
        const doses = jp(sl.dosesJson);
        return (
        <div className="fixed top-0 right-0 w-[540px] h-full bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
          {/* Sticky header */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex justify-between items-start bg-white">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">{sl.productName}</h3>
              {sl.productNameFr && <p className="text-xs text-gray-400 italic truncate">{sl.productNameFr}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">NPN {sl.licenceNumber}</span>
              <a href={`/api/licences/${sl.id}/export?format=csv&purpose=download`} download className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">CSV</a>
              <button onClick={() => { setSelected(null); setSourceFiles([]); setAttachments([]); }} className="text-gray-400 hover:text-gray-600 text-lg ml-1">&times;</button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Product Info Grid */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-4 gap-x-4 gap-y-2.5 text-xs">
                <div><p className="text-gray-400 mb-0.5">Form</p><p className="font-medium text-gray-900">{sl.dosageForm || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Route</p><p className="font-medium text-gray-900">{sl.routeOfAdmin || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Class</p><p className="font-medium text-gray-900">{sl.applicationClass || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Type</p><p className="font-medium text-gray-900">{sl.submissionType || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Issued</p><p className="font-medium text-gray-900">{sl.licenceDate || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Revised</p><p className="font-medium text-gray-900">{sl.revisedDate || "—"}</p></div>
                <div className="col-span-2"><p className="text-gray-400 mb-0.5">Company</p><p className="font-medium text-gray-900 truncate">{sl.companyName || "—"} ({sl.companyCode})</p></div>
              </div>
            </div>

            {/* Ingredients */}
            {ings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medicinal Ingredients</h4>
                <div className="flex flex-wrap gap-1.5">
                  {ings.map((ing: unknown, i: number) => {
                    const it = ing as Record<string, string>;
                    return <span key={i} className="text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg">{it.name || it.properName || "?"} {it.quantity ? `${it.quantity}${it.unit ? " " + it.unit : ""}` : ""}</span>;
                  })}
                </div>
              </div>
            )}

            {/* Claims */}
            {claims.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Claims ({claims.length})</h4>
                {claims.map((c: unknown, i: number) => (
                  <p key={i} className="text-xs text-gray-700 mb-1 leading-relaxed">• {typeof c === "string" ? c : (c as Record<string, string>)?.text || ""}</p>
                ))}
              </div>
            )}

            {/* Dosage */}
            {doses.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dosage</h4>
                {doses.map((d: unknown, i: number) => {
                  const ds = d as Record<string, string>;
                  return <p key={i} className="text-xs text-gray-700 mb-1">{ds.population}: {ds.dose} {ds.frequency} — {ds.directions}</p>;
                })}
              </div>
            )}

            {/* Risk */}
            {risks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Info ({risks.length})</h4>
                {risks.slice(0, 5).map((r: unknown, i: number) => (
                  <p key={i} className="text-xs text-gray-600 mb-1">• {typeof r === "string" ? r : (r as Record<string, string>)?.text || ""}</p>
                ))}
                {risks.length > 5 && <p className="text-xs text-gray-400">+{risks.length - 5} more</p>}
              </div>
            )}

            {/* Source Files */}
            {sourceFiles.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Source Files</h4>
                <div className="space-y-2">
                  {sourceFiles.map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0 ${
                            f.ext === "pdf" ? (f.name.toUpperCase().startsWith("IL") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700") :
                            f.ext === "xml" ? "bg-yellow-100 text-yellow-700" :
                            f.ext === "zip" ? "bg-purple-100 text-purple-700" :
                            f.ext === "docx" ? "bg-indigo-100 text-indigo-700" :
                            "bg-gray-200 text-gray-600"
                          }`}>{f.ext}</span>
                          <span className="text-sm text-gray-900 truncate">{f.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{Math.round(f.size / 1024)}KB</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {["pdf", "jpg", "jpeg", "png", "xml", "txt", "html", "csv"].includes(f.ext) && (
                            <a href={`/api/files/view?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs border border-gray-300 text-gray-700 px-2.5 py-1 rounded hover:bg-gray-100">View</a>
                          )}
                          <a href={`/api/files/download?path=${encodeURIComponent(f.path)}`} download
                            className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700">Download</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attached Documents</h4>
                <label className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 cursor-pointer">
                  + Upload
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const fd = new FormData(); fd.append("file", file); fd.append("entityType", "licence"); fd.append("entityId", sl.id);
                    await fetch("/api/attachments", { method: "POST", body: fd });
                    const res = await fetch(`/api/attachments?entityType=licence&entityId=${sl.id}`);
                    if (res.ok) setAttachments(await res.json());
                  }} />
                </label>
              </div>
              {attachments.length === 0 ? (
                <p className="text-xs text-gray-400">No documents attached yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">{att.fileType}</span>
                        <span className="text-sm text-gray-900">{att.fileName}</span>
                      </div>
                      <div className="flex gap-2">
                        <a href={`/api/attachments/${att.id}`} download className="text-xs text-blue-600 hover:text-blue-800">Download</a>
                        <button onClick={async () => {
                          await fetch(`/api/attachments/${att.id}`, { method: "DELETE" });
                          const res = await fetch(`/api/attachments?entityType=licence&entityId=${sl.id}`);
                          if (res.ok) setAttachments(await res.json());
                        }} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ========== IMPORT MODAL ========== */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setShowImport(false); setScanResults([]); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Import Licences</h3>
              <button onClick={() => { setShowImport(false); setScanResults([]); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 flex gap-4 border-b border-gray-100 shrink-0">
              {[
                { key: "single" as const, label: "Single PDF" },
                { key: "folder" as const, label: "Select Folder" },
                { key: "scan" as const, label: "Scan Local Path" },
              ].map(t => (
                <button key={t.key} onClick={() => { setImportTab(t.key); setScanResults([]); }}
                  className={`pb-3 text-sm font-medium border-b-2 ${importTab === t.key ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {importTab === "single" && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Upload a single IL (Issuance Letter) or PL (Product Licence) PDF. AI will extract all data automatically.</p>
                  <label className="block w-full py-8 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 font-medium text-sm text-center cursor-pointer">
                    {scanning ? "Processing..." : "Click to Select PDF"}
                    <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setScanning(true); setScanResults([]);
                      const fd = new FormData(); fd.append("file", file); fd.append("context", "licence_pdf");
                      const res = await fetch("/api/upload/process", { method: "POST", body: fd });
                      if (res.ok) {
                        const data = await res.json();
                        const ed = data.extractedData || {};
                        if (ed.licenceNumber || ed.productName) {
                          // Check duplicate
                          const existing = await fetch(`/api/licences?q=${ed.licenceNumber || ""}`).then(r => r.json());
                          if (ed.licenceNumber && existing.some((l: Licence) => l.licenceNumber === ed.licenceNumber)) {
                            setScanResults([{ folder: file.name, status: "skipped", licenceNumber: ed.licenceNumber, productName: ed.productName, error: "NPN already exists" }]);
                          } else {
                            await fetch("/api/licences", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                licenceNumber: ed.licenceNumber || "", productName: ed.productName || file.name,
                                productNameFr: ed.productNameFr || "", dosageForm: ed.dosageForm || "",
                                routeOfAdmin: ed.routeOfAdmin || "", companyName: ed.companyName || "",
                                companyCode: ed.companyCode || "", applicationClass: ed.applicationClass || "",
                                submissionType: ed.submissionType || "", licenceDate: ed.licenceDate || "",
                                medicinalIngredientsJson: JSON.stringify(ed.medicinalIngredients || []),
                                nonMedIngredientsJson: JSON.stringify(ed.nonMedicinalIngredients || []),
                                claimsJson: JSON.stringify(ed.claims || []),
                                risksJson: JSON.stringify(ed.risks || []),
                                dosesJson: JSON.stringify(ed.doses || []),
                                importedFrom: "single_pdf",
                              }),
                            });
                            setScanResults([{ folder: file.name, status: "success", licenceNumber: ed.licenceNumber, productName: ed.productName || file.name }]);

                            // AUTO: Attach the uploaded PDF to the licence
                            const newLicences = await fetch(`/api/licences?q=${ed.licenceNumber || ""}`).then(r => r.json());
                            const newLic = newLicences.find((l: Licence) => l.licenceNumber === (ed.licenceNumber || ""));
                            if (newLic) {
                              const attFd = new FormData();
                              attFd.append("file", file);
                              attFd.append("entityType", "licence");
                              attFd.append("entityId", newLic.id);
                              attFd.append("docCategory", file.name.toUpperCase().startsWith("IL") ? "il_letter" : "pl_licence");
                              await fetch("/api/attachments", { method: "POST", body: attFd });
                            }

                            // AUTO: Run LNHPD sync
                            await fetch("/api/sync/lnhpd", { method: "POST" });
                            await load();
                          }
                        } else {
                          setScanResults([{ folder: file.name, status: "error", error: "Could not extract licence data from this PDF" }]);
                        }
                      } else {
                        setScanResults([{ folder: file.name, status: "error", error: "Upload failed" }]);
                      }
                      setScanning(false);
                    }} />
                  </label>
                  <p className="text-xs text-gray-400 mt-2">Supports Health Canada IL and PL PDF files. You can also upload multiple files by selecting a folder.</p>
                </div>
              )}

              {importTab === "folder" && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Select a folder containing product subfolders. Each subfolder should have IL and PL PDF files.</p>
                  <input ref={folderRef} type="file" className="hidden"
                    {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
                    onChange={e => e.target.files && handleFolderUpload(e.target.files)} />
                  <button onClick={() => folderRef.current?.click()} disabled={scanning}
                    className="w-full py-8 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 font-medium text-sm disabled:opacity-50">
                    {scanning ? "Processing..." : "Click to Select Folder"}
                  </button>
                </div>
              )}

              {importTab === "scan" && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Paste the full folder path. The server will read all product subfolders and import IL + PL PDFs automatically.</p>
                  <div className="flex gap-2">
                    <input type="text" value={scanPath} onChange={e => setScanPath(e.target.value)}
                      placeholder="C:\Users\...\NPN_S"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                    <button onClick={doScan} disabled={scanning || !scanPath.trim()}
                      className="px-6 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 shrink-0">
                      {scanning ? "Scanning..." : "Scan & Import"}
                    </button>
                  </div>
                </div>
              )}

              {/* Progress / Results */}
              {scanning && (
                <div className="mt-6 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Reading PDFs and extracting data with AI...</p>
                  <p className="text-xs text-gray-400 mt-1">This may take a minute for large folders</p>
                </div>
              )}

              {scanResults.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Results</h4>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600">{scanResults.filter(r => r.status === "success").length} imported</span>
                      <span className="text-yellow-600">{scanResults.filter(r => r.status === "skipped" || r.status === "duplicate_archived").length} skipped</span>
                      <span className="text-red-600">{scanResults.filter(r => r.status === "error").length} errors</span>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {scanResults.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                        r.status === "success" ? "bg-green-50" : r.status === "error" ? "bg-red-50" : "bg-yellow-50"
                      }`}>
                        <span className="text-gray-800">{r.productName || r.folder}</span>
                        <span className={r.status === "success" ? "text-green-600" : r.status === "error" ? "text-red-600" : "text-yellow-600"}>
                          {r.status === "success" ? `NPN ${r.licenceNumber}` : r.error || r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setShowImport(false); setScanResults([]); }}
                    className="w-full mt-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">
                    Done — Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
