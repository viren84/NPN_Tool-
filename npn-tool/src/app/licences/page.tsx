"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import { HEALTH_CONDITIONS, CONDITION_KEYS } from "@/lib/constants/health-conditions";

// Types
interface Licence {
  id: string; licenceNumber: string; productName: string; productNameFr: string;
  dosageForm: string; routeOfAdmin: string; companyCode: string; companyName: string;
  applicationClass: string; submissionType: string; productStatus: string;
  licenceDate: string; revisedDate: string; receiptDate: string; importedFrom: string;
  lnhpdId: string; licencePdfPath: string; notes: string;
  medicinalIngredientsJson: string; nonMedIngredientsJson: string;
  claimsJson: string; risksJson: string; dosesJson: string;
  healthConditionsJson: string;
  amendments: Array<{ id: string; amendmentType: string; status: string; description: string }>;
}

interface SourceFile { name: string; path: string; size: number; ext: string }
interface Attachment { id: string; fileName: string; fileType: string; fileSize: number; docCategory: string; createdAt: string; uploadedBy?: { name: string } }
interface ScanResult { folder: string; status: string; licenceNumber?: string; productName?: string; error?: string }

interface PreviewItem {
  id: string;
  source: "single" | "folder" | "scan";
  folderName: string;
  fileCount: number;
  extractedData: Record<string, unknown>;
  licenceNumber: string;
  productName: string;
  status: "new" | "duplicate" | "error";
  existingLicence?: Licence;
  duplicateAction: "replace" | "skip" | "attach";
  error?: string;
  files: File[];
  serverFolderPath?: string;
  serverPdfFiles?: string[];
}

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
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);

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

  // Multi-PDF upload (Tab 1)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);

  // Detail panel upload progress
  const [detailUploading, setDetailUploading] = useState(false);
  const [detailUploadProgress, setDetailUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Multi-select & bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Import confirmation flow
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [importPhase, setImportPhase] = useState<"select" | "scanning" | "preview" | "importing" | "done">("select");
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

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

  // Folder upload — EXTRACT ONLY (builds previewItems for confirmation)
  const handleFolderUpload = async (files: FileList) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return;
    setImportPhase("scanning"); setPreviewItems([]); setScanResults([]);

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

    const items: PreviewItem[] = [];
    for (const [folderName, gFiles] of groups) {
      try {
        const fd = new FormData();
        gFiles.forEach((g, i) => { fd.append(`file_${i}`, g.file); fd.append(`path_${i}`, g.path); });
        const res = await fetch("/api/upload/batch", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          for (const r of data.results) {
            if (r.status === "success" && r.extractedData) {
              const ed = r.extractedData;
              const npn = (ed.licenceNumber as string) || "";
              const pname = (ed.productName as string) || r.folderName || folderName;

              // Check duplicate
              let dupLicence: Licence | undefined;
              if (npn) {
                try {
                  const dupRes = await fetch(`/api/licences?q=${npn}`);
                  if (dupRes.ok) {
                    const existing: Licence[] = await dupRes.json();
                    dupLicence = existing.find(l => l.licenceNumber === npn);
                  }
                } catch { /* continue */ }
              }

              items.push({
                id: crypto.randomUUID(), source: "folder", folderName: r.folderName || folderName,
                fileCount: gFiles.length, extractedData: ed, licenceNumber: npn, productName: pname,
                status: dupLicence ? "duplicate" : "new", existingLicence: dupLicence,
                duplicateAction: "attach", error: undefined, files: gFiles.map(g => g.file),
              });
            } else {
              items.push({
                id: crypto.randomUUID(), source: "folder", folderName: r.folderName || folderName,
                fileCount: gFiles.length, extractedData: {}, licenceNumber: "", productName: r.folderName || folderName,
                status: "error", duplicateAction: "skip", error: r.error || "AI extraction failed", files: [],
              });
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          items.push({
            id: crypto.randomUUID(), source: "folder", folderName,
            fileCount: gFiles.length, extractedData: {}, licenceNumber: "", productName: folderName,
            status: "error", duplicateAction: "skip", error: errData.error || `Batch upload failed (${res.status})`, files: [],
          });
        }
      } catch (e) {
        items.push({
          id: crypto.randomUUID(), source: "folder", folderName,
          fileCount: gFiles.length, extractedData: {}, licenceNumber: "", productName: folderName,
          status: "error", duplicateAction: "skip", error: e instanceof Error ? e.message : "Network error", files: [],
        });
      }
    }

    setPreviewItems(items);
    setImportPhase("preview");
  };

  // Folder scan (server-side) — PREVIEW ONLY (builds previewItems)
  const doScan = async () => {
    if (!scanPath.trim()) return;
    setImportPhase("scanning"); setPreviewItems([]); setScanResults([]);
    try {
      const res = await fetch("/api/upload/scan-folder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: scanPath, preview: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const items: PreviewItem[] = (data.results || []).map((r: Record<string, unknown>) => ({
          id: crypto.randomUUID(), source: "scan" as const,
          folderName: (r.folder as string) || "",
          fileCount: Array.isArray(r.pdfFiles) ? (r.pdfFiles as string[]).length : 0,
          extractedData: (r.extractedData as Record<string, unknown>) || {},
          licenceNumber: (r.licenceNumber as string) || "",
          productName: (r.productName as string) || (r.folder as string) || "",
          status: r.status === "duplicate" ? "duplicate" as const : r.status === "error" || r.status === "skipped" ? "error" as const : "new" as const,
          existingLicence: r.existingLicenceId ? { id: r.existingLicenceId as string } as Licence : undefined,
          duplicateAction: "attach" as const,
          error: (r.error as string) || undefined,
          files: [] as File[],
          serverFolderPath: (r.folderPath as string) || "",
          serverPdfFiles: Array.isArray(r.pdfFiles) ? (r.pdfFiles as string[]) : [],
        }));
        setPreviewItems(items);
        setImportPhase("preview");
      } else {
        const errData = await res.json().catch(() => ({}));
        setPreviewItems([{
          id: crypto.randomUUID(), source: "scan", folderName: scanPath,
          fileCount: 0, extractedData: {}, licenceNumber: "", productName: scanPath,
          status: "error", duplicateAction: "skip", error: errData.error || `Scan failed (${res.status})`, files: [],
        }]);
        setImportPhase("preview");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error — could not reach server";
      setPreviewItems([{
        id: crypto.randomUUID(), source: "scan", folderName: scanPath,
        fileCount: 0, extractedData: {}, licenceNumber: "", productName: scanPath,
        status: "error", duplicateAction: "skip", error: msg, files: [],
      }]);
      setImportPhase("preview");
    }
  };

  // ---- Multi-PDF processing — EXTRACT ONLY (builds previewItems) ----
  const processMultiplePdfs = async (files: File[]) => {
    if (!files.length) return;
    setImportPhase("scanning"); setPreviewItems([]); setScanResults([]); setPendingFiles([]);
    const items: PreviewItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
      try {
        const fd = new FormData(); fd.append("file", file); fd.append("context", "licence_pdf");
        const res = await fetch("/api/upload/process", { method: "POST", body: fd });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          items.push({
            id: crypto.randomUUID(), source: "single", folderName: file.name,
            fileCount: 1, extractedData: {}, licenceNumber: "", productName: file.name,
            status: "error", duplicateAction: "skip", error: errData.error || `Upload failed (${res.status})`, files: [file],
          });
          continue;
        }

        const data = await res.json();
        const ed = data.extractedData || {};

        if (ed.error || (!ed.licenceNumber && !ed.productName)) {
          items.push({
            id: crypto.randomUUID(), source: "single", folderName: file.name,
            fileCount: 1, extractedData: ed, licenceNumber: "", productName: file.name,
            status: "error", duplicateAction: "skip",
            error: ed.error ? String(ed.error) : "AI could not find a licence number or product name", files: [file],
          });
          continue;
        }

        // Check duplicate
        const npn = (ed.licenceNumber as string) || "";
        let dupLicence: Licence | undefined;
        if (npn) {
          try {
            const dupRes = await fetch(`/api/licences?q=${npn}`);
            if (dupRes.ok) {
              const existing: Licence[] = await dupRes.json();
              dupLicence = existing.find(l => l.licenceNumber === npn);
            }
          } catch { /* continue */ }
        }

        items.push({
          id: crypto.randomUUID(), source: "single", folderName: file.name,
          fileCount: 1, extractedData: ed, licenceNumber: npn,
          productName: (ed.productName as string) || file.name,
          status: dupLicence ? "duplicate" : "new", existingLicence: dupLicence,
          duplicateAction: "attach", error: undefined, files: [file],
        });
      } catch (e) {
        items.push({
          id: crypto.randomUUID(), source: "single", folderName: file.name,
          fileCount: 1, extractedData: {}, licenceNumber: "", productName: file.name,
          status: "error", duplicateAction: "skip", error: e instanceof Error ? e.message : "Network error", files: [file],
        });
      }
    }

    setUploadProgress(null);

    // Consolidate items with the same NPN into one PreviewItem (merge files)
    const consolidated: PreviewItem[] = [];
    const npnMap = new Map<string, PreviewItem>();
    for (const item of items) {
      if (!item.licenceNumber || item.status === "error") {
        consolidated.push(item);
        continue;
      }
      const existing = npnMap.get(item.licenceNumber);
      if (existing) {
        // Same NPN already seen — merge files into the existing entry
        existing.files.push(...item.files);
        existing.fileCount = existing.files.length;
        existing.folderName = `${existing.folderName}, ${item.folderName}`;
      } else {
        npnMap.set(item.licenceNumber, item);
        consolidated.push(item);
      }
    }

    setPreviewItems(consolidated);
    setImportPhase("preview");
  };

  // ---- Execute confirmed import (called from preview confirmation) ----
  const executeImport = async () => {
    setImportPhase("importing");
    const toProcess = previewItems.filter(p => p.status === "new" || (p.status === "duplicate" && p.duplicateAction !== "skip"));
    setImportProgress({ current: 0, total: toProcess.length });
    const results: ScanResult[] = [];
    // Track NPNs created in this batch to prevent same-batch duplicates
    const createdInBatch = new Map<string, string>(); // NPN → licence ID

    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      setImportProgress({ current: i + 1, total: toProcess.length });

      try {
        // Safety guard: if this NPN was already created earlier in this batch, just attach files
        if (item.licenceNumber && createdInBatch.has(item.licenceNumber) && item.status === "new") {
          const existingId = createdInBatch.get(item.licenceNumber)!;
          for (const file of item.files) {
            try {
              const attFd = new FormData();
              attFd.append("file", file); attFd.append("entityType", "licence"); attFd.append("entityId", existingId);
              attFd.append("docCategory", file.name.toUpperCase().startsWith("IL") ? "il_letter" : file.name.toUpperCase().startsWith("PL") ? "pl_licence" : "other");
              await fetch("/api/attachments", { method: "POST", body: attFd });
            } catch { /* continue */ }
          }
          results.push({ folder: item.folderName, status: "success", licenceNumber: item.licenceNumber, productName: item.productName, error: "Attached to same-batch NPN" });
          continue;
        }

        if (item.status === "new" || item.duplicateAction === "replace") {
          // REPLACE: delete existing first
          if (item.duplicateAction === "replace" && item.existingLicence?.id) {
            await fetch("/api/licences/bulk-delete", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [item.existingLicence.id] }),
            });
          }

          if (item.source === "scan" && item.serverFolderPath) {
            // Tab 3: re-call scan-folder for this single folder (without preview)
            const scanRes = await fetch("/api/upload/scan-folder", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ folderPath: item.serverFolderPath }),
            });
            if (scanRes.ok) {
              results.push({ folder: item.folderName, status: "success", licenceNumber: item.licenceNumber, productName: item.productName });
            } else {
              const errData = await scanRes.json().catch(() => ({}));
              results.push({ folder: item.folderName, status: "error", error: errData.error || "Import failed" });
            }
          } else {
            // Tab 1 & 2: create licence from extractedData + attach files
            const ed = item.extractedData;
            const createRes = await fetch("/api/licences", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                licenceNumber: item.licenceNumber, productName: item.productName,
                productNameFr: (ed.productNameFr as string) || "", dosageForm: (ed.dosageForm as string) || "",
                routeOfAdmin: (ed.routeOfAdmin as string) || "", companyName: (ed.companyName as string) || "",
                companyCode: (ed.companyCode as string) || "", applicationClass: (ed.applicationClass as string) || "",
                submissionType: (ed.submissionType as string) || "", licenceDate: (ed.licenceDate as string) || "",
                medicinalIngredientsJson: JSON.stringify(ed.medicinalIngredients || []),
                nonMedIngredientsJson: JSON.stringify(ed.nonMedicinalIngredients || []),
                claimsJson: JSON.stringify(ed.claims || []),
                risksJson: JSON.stringify(ed.risks || []),
                dosesJson: JSON.stringify(ed.doses || []),
                importedFrom: item.source === "single" ? "single_pdf" : "folder_upload",
              }),
            });
            if (createRes.ok) {
              const created = await createRes.json();
              // Track this NPN so subsequent items with the same NPN just attach
              if (created.id && item.licenceNumber) {
                createdInBatch.set(item.licenceNumber, created.id);
              }
              // Attach files using the new licence ID
              if (created.id) {
                // Attach files
                for (const file of item.files) {
                  try {
                    const attFd = new FormData();
                    attFd.append("file", file); attFd.append("entityType", "licence"); attFd.append("entityId", created.id);
                    attFd.append("docCategory", file.name.toUpperCase().startsWith("IL") ? "il_letter" : file.name.toUpperCase().startsWith("PL") ? "pl_licence" : "other");
                    await fetch("/api/attachments", { method: "POST", body: attFd });
                  } catch { /* continue */ }
                }
                // Auto-enrich from LNHPD (non-blocking)
                fetch(`/api/sync/lnhpd/${created.id}`, { method: "POST" }).catch(() => {});
              }
              results.push({ folder: item.folderName, status: "success", licenceNumber: item.licenceNumber, productName: item.productName });
            } else {
              results.push({ folder: item.folderName, status: "error", error: "Failed to save licence" });
            }
          }
        } else if (item.duplicateAction === "attach" && item.existingLicence?.id) {
          // ATTACH: just upload files to existing licence
          for (const file of item.files) {
            try {
              const attFd = new FormData();
              attFd.append("file", file); attFd.append("entityType", "licence"); attFd.append("entityId", item.existingLicence.id);
              attFd.append("docCategory", file.name.toUpperCase().startsWith("IL") ? "il_letter" : file.name.toUpperCase().startsWith("PL") ? "pl_licence" : "other");
              await fetch("/api/attachments", { method: "POST", body: attFd });
            } catch { /* continue */ }
          }
          results.push({ folder: item.folderName, status: "success", licenceNumber: item.licenceNumber, productName: item.productName, error: "Attached to existing NPN" });
        }
      } catch (e) {
        results.push({ folder: item.folderName, status: "error", error: e instanceof Error ? e.message : "Import failed" });
      }
    }

    // Add skipped + error items to results
    for (const item of previewItems.filter(p => p.status === "duplicate" && p.duplicateAction === "skip")) {
      results.push({ folder: item.folderName, status: "skipped", licenceNumber: item.licenceNumber, productName: item.productName, error: "Skipped by user" });
    }
    for (const item of previewItems.filter(p => p.status === "error")) {
      results.push({ folder: item.folderName, status: "error", error: item.error });
    }

    setScanResults(results);
    setImportProgress(null);
    setImportPhase("done");

    // Per-product LNHPD sync already fired after each create above
    await load();
  };

  // Drag-and-drop handlers for Tab 1
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (dropped.length) setPendingFiles(prev => [...prev, ...dropped]);
  };

  // Add files from file picker
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (selected.length) setPendingFiles(prev => [...prev, ...selected]);
    e.target.value = ""; // Reset so same files can be re-selected
  };

  // Remove a file from pending list
  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Detail panel: stable upload handler (avoids stale closure in IIFE)
  const handleDetailUpload = async (files: File[], licenceId: string) => {
    if (!files.length || !licenceId) return;
    setDetailUploading(true);
    setDetailUploadProgress({ current: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        setDetailUploadProgress({ current: i + 1, total: files.length });
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("entityType", "licence");
        fd.append("entityId", licenceId);
        await fetch("/api/attachments", { method: "POST", body: fd });
      }
      const res = await fetch(`/api/attachments?entityType=licence&entityId=${licenceId}`);
      if (res.ok) setAttachments(await res.json());
    } catch (e) {
      console.error("Upload failed:", e);
    }
    setDetailUploading(false);
    setDetailUploadProgress(null);
  };

  // ---- Multi-select helpers ----
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === licences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(licences.map(l => l.id)));
    }
  };

  // Keep select-all checkbox indeterminate state in sync
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < licences.length;
    }
  }, [selectedIds, licences.length]);

  // Clear selection when search changes (results change)
  useEffect(() => { setSelectedIds(new Set()); }, [search]);

  // Bulk delete
  const doBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    setBulkProgress({ current: 0, total: selectedIds.size });
    try {
      const res = await fetch("/api/licences/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkProgress({ current: data.deleted, total: selectedIds.size });
        // Close detail panel if deleted item was selected
        if (selected && selectedIds.has(selected.id)) {
          setSelected(null); setSourceFiles([]); setAttachments([]);
        }
        setSelectedIds(new Set());
        await load();
      }
    } catch { /* network error */ }
    setBulkDeleting(false);
    setBulkProgress(null);
    setShowBulkConfirm(false);
  };

  if (!user) return null;

  const activeCount = licences.filter(l => l.productStatus === "active").length;
  const archivedCount = licences.filter(l => l.productStatus !== "active").length;

  // Condition filtering + search
  const getConditions = (lic: Licence): string[] => {
    try { return JSON.parse(lic.healthConditionsJson || "[]"); } catch { return []; }
  };
  const conditionCounts: Record<string, number> = {};
  for (const key of CONDITION_KEYS) conditionCounts[key] = 0;
  let unclassifiedCount = 0;
  for (const lic of licences) {
    const conds = getConditions(lic);
    if (conds.length === 0) unclassifiedCount++;
    for (const c of conds) if (conditionCounts[c] !== undefined) conditionCounts[c]++;
  }
  const usedConditions = CONDITION_KEYS.filter(k => conditionCounts[k] > 0);

  const filteredLicences = licences.filter(lic => {
    // Condition filter
    if (activeCondition === "__unclassified") {
      if (getConditions(lic).length > 0) return false;
    } else if (activeCondition) {
      if (!getConditions(lic).includes(activeCondition)) return false;
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      if (!lic.licenceNumber.toLowerCase().includes(q) && !lic.productName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const allSelected = filteredLicences.length > 0 && selectedIds.size === filteredLicences.length;

  const classifyAll = async () => {
    setClassifying(true);
    try {
      await fetch("/api/licences/classify-conditions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      // Reload licences
      const res = await fetch("/api/licences");
      if (res.ok) setLicences(await res.json());
    } catch { /* silently handle */ }
    setClassifying(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      {/* Main Content */}
      <main className="flex-1 p-6 min-w-0 transition-all">
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
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-3 bg-white" />

        {/* Health Condition Filter Bar */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex items-center gap-2 pb-1 min-w-max">
            <button onClick={() => setActiveCondition(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeCondition === null ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              All ({licences.length})
            </button>
            {usedConditions.map(key => {
              const cond = HEALTH_CONDITIONS[key];
              const isActive = activeCondition === key;
              return (
                <button key={key} onClick={() => setActiveCondition(isActive ? null : key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    isActive ? "bg-gray-800 text-white" : cond.color + " hover:opacity-80"
                  }`}>
                  {cond.label} ({conditionCounts[key]})
                </button>
              );
            })}
            {unclassifiedCount > 0 && (
              <button onClick={() => setActiveCondition(activeCondition === "__unclassified" ? null : "__unclassified")}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  activeCondition === "__unclassified" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                Unclassified ({unclassifiedCount})
              </button>
            )}
            <button onClick={classifyAll} disabled={classifying}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1 ml-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {classifying ? "Classifying..." : "AI Classify"}
            </button>
          </div>
        </div>

        {/* Bulk Action Toolbar — appears when rows are selected */}
        {selectedIds.size > 0 && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center justify-between animate-in">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-red-800">{selectedIds.size} selected</span>
              <button onClick={() => setShowBulkConfirm(true)} disabled={bulkDeleting}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {bulkDeleting ? `Deleting ${bulkProgress?.current || 0}/${bulkProgress?.total || 0}...` : "Delete Selected"}
              </button>
              <a href={`/api/licences/export?format=csv&ids=${Array.from(selectedIds).join(",")}`} download
                className="text-xs border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium">
                Export Selected CSV
              </a>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-600 hover:text-red-800 font-medium">
              Deselect All
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium sticky top-0 z-10">
                <th className="w-10 px-3 py-2.5">
                  <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                </th>
                <th className="text-left px-3 py-2.5">NPN</th>
                <th className="text-left px-3 py-2.5">Product</th>
                <th className="text-left px-3 py-2.5">Form</th>
                <th className="text-left px-3 py-2.5">Class</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Issued</th>
                <th className="text-right px-3 py-2.5 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : filteredLicences.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm text-gray-400 mb-2">No licences imported yet</p>
                  <button onClick={() => setShowImport(true)} className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">Import from PDFs</button>
                </td></tr>
              ) : filteredLicences.map(lic => {
                const isArchived = lic.productStatus !== "active";
                const isChecked = selectedIds.has(lic.id);
                const dotColor = lic.productStatus === "active" ? "text-green-500" : lic.productStatus === "cancelled" ? "text-red-500" : lic.productStatus === "suspended" ? "text-yellow-500" : "text-gray-400";
                return (
                <tr key={lic.id}
                  onClick={() => openDetail(lic)}
                  className={`cursor-pointer transition-colors ${
                    isChecked ? "bg-red-50/50" :
                    selected?.id === lic.id ? "bg-blue-50" :
                    isArchived ? "opacity-50 hover:opacity-75" :
                    "hover:bg-gray-50"
                  }`}>
                  <td className="w-10 px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(lic.id)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                  </td>
                  <td className="px-3 py-2.5 text-sm font-mono text-blue-600 font-medium">{lic.licenceNumber}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lic.productName}
                      {isArchived && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">archived</span>}
                      {getConditions(lic).map(c => {
                        const cond = HEALTH_CONDITIONS[c];
                        return cond ? <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span> : null;
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{lic.dosageForm}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{lic.applicationClass}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${statusColors[lic.productStatus] || "bg-gray-100 text-gray-500"}`}>
                      <span className={`${dotColor} text-[8px]`}>&#9679;</span>
                      {lic.productStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{lic.licenceDate}</td>
                  <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    {selectedIds.size === 0 && (
                      confirmDel === lic.id ? (
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
                      )
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
        const nonMed = jp(sl.nonMedIngredientsJson);
        const claims = jp(sl.claimsJson);
        const risks = jp(sl.risksJson);
        const doses = jp(sl.dosesJson);
        return (
        <div className="w-[540px] shrink-0 h-screen sticky top-0 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col overflow-y-auto">
          {/* Sticky header */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex justify-between items-start bg-white">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">{sl.productName}</h3>
              {sl.productNameFr && <p className="text-xs text-gray-400 italic truncate">{sl.productNameFr}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">NPN {sl.licenceNumber}</span>
              <button disabled={syncing} onClick={async () => {
                setSyncing(true);
                try {
                  const res = await fetch(`/api/sync/lnhpd/${sl.id}`, { method: "POST" });
                  const data = await res.json();
                  console.log("[LNHPD Sync]", res.status, data);
                  if (res.ok && data.success) {
                    const licRes = await fetch(`/api/licences/${sl.id}`);
                    if (licRes.ok) { const fresh = await licRes.json(); setSelected(fresh); }
                    await load();
                  } else {
                    alert(`Sync failed: ${data.message || "Unknown error"}`);
                  }
                } catch (e) {
                  console.error("[LNHPD Sync] Error:", e);
                  alert("Sync failed: network error");
                }
                setSyncing(false);
              }} className={`text-xs px-2 py-1 rounded ${syncing ? "bg-purple-200 text-purple-400" : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`} title="Sync from Health Canada LNHPD">{syncing ? "Syncing..." : "Sync"}</button>
              <a href={`/api/licences/${sl.id}/export?format=csv&purpose=download`} download className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">CSV</a>
              <button onClick={() => { setSelected(null); setSourceFiles([]); setAttachments([]); }} className="text-gray-400 hover:text-gray-600 text-lg ml-1">&times;</button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Product Info Grid — redesigned for regulatory usefulness */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              {/* Row 1: Quick summary line */}
              {(() => {
                const d0 = doses.length > 0 ? doses[0] as Record<string, unknown> : null;
                const summaryParts: string[] = [];
                if (sl.dosageForm) summaryParts.push(sl.dosageForm);
                if (sl.routeOfAdmin) summaryParts.push(sl.routeOfAdmin);
                if (d0) {
                  const qty = d0.quantity_dose || d0.quantity;
                  const qtyUnit = d0.uom_type_desc_quantity_dose || d0.unit || "";
                  const freq = d0.frequency;
                  const freqUnit = d0.uom_type_desc_frequency || "";
                  const pop = d0.population_type_desc || "";
                  const ageMin = d0.age_minimum ? `${d0.age_minimum}+` : "";
                  const doseStr = qty ? `${qty} ${qtyUnit}`.trim() : "";
                  const freqStr = freq ? `${freq}x/${freqUnit}`.trim() : "";
                  const popStr = pop ? `${pop}${ageMin ? ` (${ageMin})` : ""}` : "";
                  if (doseStr || freqStr) summaryParts.push(`\u2022 ${[doseStr, freqStr, popStr].filter(Boolean).join(" \u2022 ")}`);
                }
                return summaryParts.length > 0 ? (
                  <p className="text-xs text-gray-600 font-medium leading-snug">{summaryParts.join(" \u2022 ")}</p>
                ) : null;
              })()}
              {/* Row 2: Key fields grid */}
              <div className="grid grid-cols-4 gap-x-4 gap-y-2.5 text-xs">
                <div><p className="text-gray-400 mb-0.5">Form</p><p className="font-medium text-gray-900">{sl.dosageForm || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Route</p><p className="font-medium text-gray-900">{sl.routeOfAdmin || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Class</p><p className="font-medium text-gray-900">{sl.applicationClass || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Type</p><p className="font-medium text-gray-900">{sl.submissionType || "—"}</p></div>
              </div>
              {/* Row 3: Dates */}
              <div className="grid grid-cols-4 gap-x-4 gap-y-2.5 text-xs">
                <div><p className="text-gray-400 mb-0.5">Issued</p><p className="font-medium text-gray-900">{sl.licenceDate || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Revised</p><p className="font-medium text-gray-900">{sl.revisedDate || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Received</p><p className="font-medium text-gray-900">{sl.receiptDate || "—"}</p></div>
                <div><p className="text-gray-400 mb-0.5">Status</p><p className="font-medium"><span className={`inline-flex items-center gap-1 ${sl.productStatus === "active" ? "text-green-700" : "text-red-600"}`}><span className={`w-1.5 h-1.5 rounded-full ${sl.productStatus === "active" ? "bg-green-500" : "bg-red-500"}`}></span>{sl.productStatus || "—"}</span></p></div>
              </div>
              {/* Row 4: Company + LNHPD link */}
              <div className="grid grid-cols-4 gap-x-4 text-xs">
                <div className="col-span-3"><p className="text-gray-400 mb-0.5">Company</p><p className="font-medium text-gray-900 truncate" title={`${sl.companyName} (${sl.companyCode})`}>{sl.companyName || "—"}{sl.companyCode ? ` (${sl.companyCode})` : ""}</p></div>
                <div><p className="text-gray-400 mb-0.5">LNHPD</p>{sl.lnhpdId ? <a href={`https://health-products.canada.ca/lnhpd-bdpsnh/info?licence=${sl.licenceNumber}&lang=en`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium">View on HC</a> : <p className="font-medium text-gray-400">—</p>}</div>
              </div>
            </div>

            {/* Medicinal Ingredients */}
            {ings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medicinal Ingredients ({ings.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {ings.map((ing: unknown, i: number) => {
                    const it = ing as Record<string, unknown>;
                    const name = (it.ingredient_name || it.name || it.properName || "?") as string;
                    const qty = (it.quantity || it.strength || "") as string | number;
                    const unit = (it.quantity_unit_of_measure || it.unit || it.strengthUnit || "") as string;
                    const src = (it.source_material || "") as string;
                    return <span key={i} className="text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg" title={src ? `Source: ${src}` : ""}>{name}{qty ? ` ${qty}` : ""}{unit ? ` ${unit}` : ""}</span>;
                  })}
                </div>
              </div>
            )}

            {/* Non-Medicinal Ingredients */}
            {nonMed.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Non-Medicinal Ingredients ({nonMed.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {nonMed.map((nm: unknown, i: number) => {
                    const n = typeof nm === "string" ? nm : ((nm as Record<string, string>)?.ingredient_name || (nm as Record<string, string>)?.name || "");
                    return n ? <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg border border-gray-200">{n}</span> : null;
                  })}
                </div>
              </div>
            )}

            {/* Approved Claims */}
            {claims.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Approved Claims ({claims.length})</h4>
                {claims.map((c: unknown, i: number) => {
                  const text = typeof c === "string" ? c : ((c as Record<string, string>)?.purpose || (c as Record<string, string>)?.text || "");
                  return text ? <p key={i} className="text-xs text-gray-700 mb-1 leading-relaxed">• {text}</p> : null;
                })}
              </div>
            )}

            {/* Recommended Dosage */}
            {doses.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Dosage ({doses.length})</h4>
                {doses.map((d: unknown, i: number) => {
                  const ds = d as Record<string, unknown>;
                  const pop = (ds.population_type_desc || ds.population || "General") as string;
                  const qty = (ds.quantity_dose || ds.dose || "") as string | number;
                  const qtyUnit = (ds.uom_type_desc_quantity_dose || "") as string;
                  const freq = (ds.frequency || "") as string | number;
                  const freqUnit = (ds.uom_type_desc_frequency || "") as string;
                  const dir = (ds.directions || "") as string;
                  return (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
                      <p className="text-xs font-semibold text-gray-800">{pop}</p>
                      <p className="text-xs text-gray-600">{qty ? `${qty} ${qtyUnit}` : ""}{freq ? `, ${freq}x ${freqUnit}` : ""}{dir ? ` — ${dir}` : ""}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Risk Information */}
            {risks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Information ({risks.length})</h4>
                {risks.map((r: unknown, i: number) => {
                  const rk = r as Record<string, string>;
                  const text = typeof r === "string" ? r : (rk.risk_text || rk.text || "");
                  const type = rk.risk_type_desc || rk.type || "";
                  return text ? (
                    <div key={i} className="mb-1.5">
                      {type && <p className="text-[10px] font-semibold text-amber-600 uppercase">{type}</p>}
                      <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                    </div>
                  ) : null;
                })}
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
                <label className={`text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 cursor-pointer ${detailUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {detailUploading ? (detailUploadProgress ? `Uploading ${detailUploadProgress.current}/${detailUploadProgress.total}...` : "Uploading...") : "+ Upload"}
                  <input type="file" multiple className="hidden" onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    if (files.length) handleDetailUpload(files, sl.id);
                  }} />
                </label>
              </div>
              {attachments.length === 0 ? (
                <p className="text-xs text-gray-400">No documents attached yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase shrink-0">{att.fileType}</span>
                        <span className="text-sm text-gray-900 truncate">{att.fileName}</span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {["pdf", "jpg", "jpeg", "png", "txt", "html", "csv"].includes(att.fileType) && (
                          <a href={`/api/attachments/${att.id}?inline=true`} target="_blank" rel="noopener noreferrer"
                            className="text-xs border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-100">View</a>
                        )}
                        <a href={`/api/attachments/${att.id}`} download
                          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">Download</a>
                        <button onClick={async () => {
                          await fetch(`/api/attachments/${att.id}`, { method: "DELETE" });
                          const res = await fetch(`/api/attachments?entityType=licence&entityId=${sl.id}`);
                          if (res.ok) setAttachments(await res.json());
                        }} className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 px-2 py-1 rounded hover:bg-red-50">Remove</button>
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
          <div className="fixed inset-0 bg-black/50" onClick={() => { if (importPhase !== "importing") { setShowImport(false); setScanResults([]); setPendingFiles([]); setPreviewItems([]); setImportPhase("select"); } }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                {(importPhase === "preview" || importPhase === "done") && (
                  <button onClick={() => { setImportPhase("select"); setPreviewItems([]); setScanResults([]); }}
                    className="text-gray-400 hover:text-gray-700 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back
                  </button>
                )}
                <h3 className="text-lg font-bold text-gray-900">
                  {importPhase === "preview" ? "Import Preview" : importPhase === "importing" ? "Importing..." : importPhase === "done" ? "Import Complete" : "Import Licences"}
                </h3>
              </div>
              <button onClick={() => { if (importPhase !== "importing") { setShowImport(false); setScanResults([]); setPendingFiles([]); setPreviewItems([]); setImportPhase("select"); } }}
                className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            {/* Tabs — only visible in select phase */}
            {importPhase === "select" && (
              <div className="px-6 pt-3 flex gap-4 border-b border-gray-100 shrink-0">
                {[
                  { key: "single" as const, label: "Upload PDFs" },
                  { key: "folder" as const, label: "Select Folder" },
                  { key: "scan" as const, label: "Scan Local Path" },
                ].map(t => (
                  <button key={t.key} onClick={() => { setImportTab(t.key); setScanResults([]); setPendingFiles([]); }}
                    className={`pb-3 text-sm font-medium border-b-2 ${importTab === t.key ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ===== PHASE: SELECT (original tab content) ===== */}
              {importPhase === "select" && (
                <>
                  {importTab === "single" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Upload one or more IL / PL PDF files. Select multiple with Ctrl+Click or drag and drop.</p>
                      <input ref={multiInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileSelect} />
                      <div ref={dropRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        onClick={() => multiInputRef.current?.click()}
                        className={`w-full py-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                          isDragging ? "border-blue-500 bg-blue-100" : "border-blue-300 hover:bg-blue-50 hover:border-blue-400"
                        }`}>
                        <svg className="w-8 h-8 mx-auto mb-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium text-blue-600">{isDragging ? "Drop PDF files here" : "Click to select PDFs or drag & drop"}</p>
                        <p className="text-xs text-gray-400 mt-1">PDF files only, 20MB max each</p>
                      </div>
                      {pendingFiles.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-gray-700">{pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} selected</h4>
                            <button onClick={() => setPendingFiles([])} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                            {pendingFiles.map((f, i) => (
                              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono uppercase shrink-0">PDF</span>
                                  <span className="text-sm text-gray-900 truncate">{f.name}</span>
                                  <span className="text-xs text-gray-400 shrink-0">{Math.round(f.size / 1024)}KB</span>
                                </div>
                                <button onClick={() => removePendingFile(i)} className="text-gray-400 hover:text-red-500 text-sm ml-2 shrink-0">&times;</button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => processMultiplePdfs(pendingFiles)}
                            className="w-full py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Upload & Extract {pendingFiles.length} PDF{pendingFiles.length > 1 ? "s" : ""}
                          </button>
                        </div>
                      )}
                      {!pendingFiles.length && <p className="text-xs text-gray-400 mt-2">Supports Health Canada IL and PL PDF files. Select multiple files at once.</p>}
                    </div>
                  )}

                  {importTab === "folder" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">Select a folder containing product subfolders. Each subfolder should have IL and PL PDF files.</p>
                      <input ref={folderRef} type="file" className="hidden"
                        {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
                        onChange={e => e.target.files && handleFolderUpload(e.target.files)} />
                      <button onClick={() => folderRef.current?.click()}
                        className="w-full py-8 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 font-medium text-sm">
                        Click to Select Folder
                      </button>
                    </div>
                  )}

                  {importTab === "scan" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">Paste the full folder path. The server will scan all product subfolders and preview IL + PL PDFs before importing.</p>
                      <div className="flex gap-2">
                        <input type="text" value={scanPath} onChange={e => setScanPath(e.target.value)}
                          placeholder="C:\Users\...\NPN_S"
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                        <button onClick={doScan} disabled={!scanPath.trim()}
                          className="px-6 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 shrink-0">
                          Scan & Preview
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ===== PHASE: SCANNING (spinner) ===== */}
              {importPhase === "scanning" && (
                <div className="py-12 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-700">Reading PDFs and extracting data with AI...</p>
                  <p className="text-xs text-gray-400 mt-2">This may take a minute for large folders</p>
                  {uploadProgress && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      File {uploadProgress.current} of {uploadProgress.total} — {uploadProgress.fileName}
                    </p>
                  )}
                </div>
              )}

              {/* ===== PHASE: PREVIEW (confirmation table) ===== */}
              {importPhase === "preview" && (
                <div>
                  {/* Summary counts */}
                  {(() => {
                    const newCount = previewItems.filter(p => p.status === "new").length;
                    const dupeCount = previewItems.filter(p => p.status === "duplicate").length;
                    const errCount = previewItems.filter(p => p.status === "error").length;
                    const importCount = previewItems.filter(p => p.status === "new" || (p.status === "duplicate" && p.duplicateAction !== "skip")).length;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Found {previewItems.length} product{previewItems.length !== 1 ? "s" : ""}</p>
                            <div className="flex gap-3 mt-1 text-xs">
                              {newCount > 0 && <span className="text-green-600 font-medium">{newCount} new</span>}
                              {dupeCount > 0 && <span className="text-yellow-600 font-medium">{dupeCount} duplicate{dupeCount !== 1 ? "s" : ""}</span>}
                              {errCount > 0 && <span className="text-red-600 font-medium">{errCount} error{errCount !== 1 ? "s" : ""}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Batch duplicate actions */}
                        {dupeCount > 0 && (
                          <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <span className="text-xs text-yellow-800 font-medium">Duplicates:</span>
                            <button onClick={() => setPreviewItems(prev => prev.map(p => p.status === "duplicate" ? { ...p, duplicateAction: "replace" } : p))}
                              className="text-xs px-2.5 py-1 bg-white border border-yellow-300 rounded text-yellow-800 hover:bg-yellow-100 font-medium">Replace All</button>
                            <button onClick={() => setPreviewItems(prev => prev.map(p => p.status === "duplicate" ? { ...p, duplicateAction: "skip" } : p))}
                              className="text-xs px-2.5 py-1 bg-white border border-yellow-300 rounded text-yellow-800 hover:bg-yellow-100 font-medium">Skip All</button>
                            <button onClick={() => setPreviewItems(prev => prev.map(p => p.status === "duplicate" ? { ...p, duplicateAction: "attach" } : p))}
                              className="text-xs px-2.5 py-1 bg-white border border-yellow-300 rounded text-yellow-800 hover:bg-yellow-100 font-medium">Attach All</button>
                          </div>
                        )}

                        {/* Preview items list */}
                        <div className="max-h-[45vh] overflow-y-auto space-y-2 mb-4">
                          {previewItems.map(item => (
                            <div key={item.id} className={`rounded-lg border px-4 py-3 ${
                              item.status === "new" ? "bg-green-50 border-green-200" :
                              item.status === "duplicate" ? "bg-yellow-50 border-yellow-200" :
                              "bg-red-50 border-red-200 opacity-70"
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    item.status === "new" ? "bg-green-200 text-green-800" :
                                    item.status === "duplicate" ? "bg-yellow-200 text-yellow-800" :
                                    "bg-red-200 text-red-800"
                                  }`}>
                                    {item.status === "new" ? "NEW" : item.status === "duplicate" ? "DUPE" : "ERR"}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName || item.folderName}</p>
                                    <p className="text-xs text-gray-500">
                                      {item.licenceNumber ? `NPN ${item.licenceNumber}` : "No NPN"}
                                      {item.fileCount > 0 && <span className="ml-2">{item.fileCount} file{item.fileCount !== 1 ? "s" : ""}</span>}
                                    </p>
                                  </div>
                                </div>

                                {/* Duplicate action buttons */}
                                {item.status === "duplicate" && (
                                  <div className="flex gap-1 shrink-0 ml-3">
                                    {(["replace", "skip", "attach"] as const).map(action => (
                                      <button key={action}
                                        onClick={() => setPreviewItems(prev => prev.map(p => p.id === item.id ? { ...p, duplicateAction: action } : p))}
                                        className={`text-[11px] px-2.5 py-1 rounded font-medium transition-colors ${
                                          item.duplicateAction === action
                                            ? action === "replace" ? "bg-orange-600 text-white" : action === "skip" ? "bg-gray-600 text-white" : "bg-blue-600 text-white"
                                            : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                                        }`}>
                                        {action === "replace" ? "Replace" : action === "skip" ? "Skip" : "Attach"}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Error message */}
                              {item.status === "error" && item.error && (
                                <p className="text-xs text-red-600 mt-1.5">{item.error}</p>
                              )}

                              {/* Duplicate info */}
                              {item.status === "duplicate" && item.existingLicence && (
                                <p className="text-xs text-yellow-700 mt-1.5">
                                  Existing: {item.existingLicence.productName || "—"} (NPN {item.existingLicence.licenceNumber || "—"})
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Footer: Cancel + Import button */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <button onClick={() => { setImportPhase("select"); setPreviewItems([]); }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                          </button>
                          <button onClick={executeImport} disabled={importCount === 0}
                            className="px-6 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium disabled:opacity-40 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Import {importCount} Product{importCount !== 1 ? "s" : ""}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ===== PHASE: IMPORTING (progress) ===== */}
              {importPhase === "importing" && (
                <div className="py-12 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-700">
                    Importing {importProgress?.current || 0} of {importProgress?.total || 0}...
                  </p>
                  {importProgress && (
                    <div className="w-full max-w-xs mx-auto mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== PHASE: DONE (results) ===== */}
              {importPhase === "done" && scanResults.length > 0 && (
                <div>
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
                  <button onClick={() => { setShowImport(false); setScanResults([]); setPreviewItems([]); setImportPhase("select"); }}
                    className="w-full mt-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">
                    Done — Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== BULK DELETE CONFIRMATION MODAL ========== */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => !bulkDeleting && setShowBulkConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {selectedIds.size} licence{selectedIds.size > 1 ? "s" : ""}?</h3>
              <p className="text-sm text-gray-500 mb-6">This will permanently remove the selected licences and their attachments. This cannot be undone.</p>

              {bulkDeleting && bulkProgress && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">Deleting {bulkProgress.current} of {bulkProgress.total}...</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowBulkConfirm(false)} disabled={bulkDeleting}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={doBulkDelete} disabled={bulkDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {bulkDeleting ? "Deleting..." : "Yes, Delete All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
