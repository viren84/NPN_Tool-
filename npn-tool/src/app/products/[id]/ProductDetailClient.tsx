"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import { DEFAULT_RESEARCH_PROMPTS, fillPromptTemplate } from "@/lib/constants/research-prompts";

// ── Constants ──
const STAGES = [
  "research", "formulation", "stability", "filing", "under_review",
  "approved", "production", "launch", "active", "amendment",
  "renewal", "suspended", "cancelled", "archived", "withdrawn",
] as const;

const stageColors: Record<string, string> = {
  research: "bg-blue-100 text-blue-700", formulation: "bg-blue-100 text-blue-700", stability: "bg-blue-100 text-blue-700",
  filing: "bg-yellow-100 text-yellow-800", under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700", production: "bg-green-100 text-green-700", launch: "bg-green-100 text-green-700",
  active: "bg-green-200 text-green-800 font-semibold",
  amendment: "bg-purple-100 text-purple-700", renewal: "bg-purple-100 text-purple-700",
  suspended: "bg-red-100 text-red-700", cancelled: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-600", withdrawn: "bg-gray-200 text-gray-700",
};

const DOSAGE_FORMS = ["Capsule", "Tablet", "Softgel", "Powder", "Liquid", "Cream", "Spray", "Lozenge", "Chewable", "Gummy", "Other"];
const ROUTES = ["Oral", "Sublingual", "Topical", "Nasal", "Inhalation", "Other"];
const DOC_TYPES = [
  { value: "coa", label: "Certificate of Analysis (COA)" },
  { value: "supplier_spec", label: "Supplier Specification" },
  { value: "study", label: "Research Study / Clinical Trial" },
  { value: "competitor_label", label: "Competitor Label / Product" },
  { value: "market_report", label: "Market Research Report" },
  { value: "marketing_material", label: "Marketing Material" },
  { value: "other", label: "Other Document" },
];
const TABS = [
  { key: "overview", label: "Overview", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" },
  { key: "documents", label: "Documents", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { key: "research", label: "AI Research", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "review", label: "Review & Notes", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function formatStage(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

interface Product {
  id: string; name: string; brandName: string; stage: string; priority: string;
  assignedTo: string; dosageForm: string; routeOfAdmin: string; productConcept: string;
  targetMarket: string; applicationClass: string; npnNumber: string; applicationId: string | null;
  reviewStatus: string; reviewerId: string; reviewNotes: string; notes: string;
  handoffReady: boolean; createdAt: string; updatedAt: string;
}
interface TeamUser { id: string; name: string; role: string; }
interface ProductDoc { id: string; stage: string; docType: string; title: string; fileName: string; fileSize: number; filePath: string; extractionStatus: string; extractedDataJson: string; createdAt: string; }
// ── Component ──
export default function ProductDetailClient({
  user, product: initialProduct, teamUsers = [],
}: {
  user: { id: string; name: string; role: string; username: string };
  product: Product;
  teamUsers?: TeamUser[];
}) {
  const router = useRouter();
  const [product, setProduct] = useState(initialProduct);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState({
    name: product.name, brandName: product.brandName, dosageForm: product.dosageForm,
    routeOfAdmin: product.routeOfAdmin, productConcept: product.productConcept,
    priority: product.priority, assignedTo: product.assignedTo, notes: product.notes,
    targetMarket: product.targetMarket,
  });
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  // Documents state
  const [docs, setDocs] = useState<ProductDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("other");
  const fileRef = useRef<HTMLInputElement>(null);

  // Prompt generator state
  const [researchType, setResearchType] = useState("ingredient_research");

  const currentIdx = STAGES.indexOf(product.stage as typeof STAGES[number]);
  const isEditable = user.role !== "viewer";
  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
  const prevStage = currentIdx > 0 ? STAGES[currentIdx - 1] : null;

  // Load documents when tab switches
  useEffect(() => {
    if (activeTab === "documents") {
      fetch(`/api/products/${product.id}/documents`).then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setDocs(d); });
    }
    // research tab is now a prompt generator — no API fetch needed
  }, [activeTab, product.id]);

  const save = async (extra?: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/products/${product.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...extra }) });
    if (res.ok) { const u = await res.json(); setProduct(u); setForm(f => ({ ...f, name: u.name, brandName: u.brandName, dosageForm: u.dosageForm, routeOfAdmin: u.routeOfAdmin, productConcept: u.productConcept, priority: u.priority, assignedTo: u.assignedTo, notes: u.notes, targetMarket: u.targetMarket })); }
    setSaving(false);
  };
  const moveStage = (s: string) => save({ stage: s });

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("stage", product.stage);
    fd.append("docType", uploadDocType);
    fd.append("title", file.name);
    const res = await fetch(`/api/products/${product.id}/documents`, { method: "POST", body: fd });
    if (res.ok) {
      const newDoc = await res.json();
      setDocs(prev => [newDoc, ...prev]);
    }
    setUploading(false);
    e.target.value = "";
  };

  const extractionBadge = (status: string) => {
    if (status === "completed") return "bg-green-100 text-green-700";
    if (status === "processing") return "bg-yellow-100 text-yellow-700 animate-pulse";
    if (status === "failed") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.jpg,.png,.txt" className="hidden" onChange={uploadFile} />

      <main className="flex-1 p-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={() => router.push("/products")} className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Pipeline
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {product.brandName && <>{product.brandName} &middot; </>}
              {product.dosageForm && <>{product.dosageForm} &middot; </>}
              {product.npnNumber && <>NPN {product.npnNumber} &middot; </>}
              Created {new Date(product.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full ${stageColors[product.stage] || "bg-gray-100 text-gray-600"}`}>{formatStage(product.stage)}</span>
            {isEditable && <button onClick={() => save()} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>}
          </div>
        </div>

        {/* Stage Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center">
                <button onClick={() => isEditable && moveStage(stage)} disabled={!isEditable}
                  className={`px-2 py-1 text-xs rounded-full transition-all ${i === currentIdx ? "bg-red-600 text-white font-bold" : i < currentIdx ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                  {formatStage(stage)}
                </button>
                {i < STAGES.length - 1 && <svg className={`w-3 h-3 mx-0.5 ${i < currentIdx ? "text-green-400" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
              </div>
            ))}
          </div>
        </div>

        {/* Stage buttons */}
        <div className="flex gap-3 mb-4">
          {prevStage && isEditable && <button onClick={() => moveStage(prevStage)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">&larr; {formatStage(prevStage)}</button>}
          {nextStage && isEditable && <button onClick={() => moveStage(nextStage)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{formatStage(nextStage)} &rarr;</button>}
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 mb-6">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} /></svg>
              {tab.label}
              {tab.key === "documents" && docs.length > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{docs.length}</span>}
              {tab.key === "research" && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">9</span>}
            </button>
          ))}
        </div>

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={!isEditable} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                    <input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} disabled={!isEditable} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                      <select value={form.dosageForm} onChange={e => setForm(f => ({ ...f, dosageForm: e.target.value }))} disabled={!isEditable} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Select...</option>{DOSAGE_FORMS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                      <select value={form.routeOfAdmin} onChange={e => setForm(f => ({ ...f, routeOfAdmin: e.target.value }))} disabled={!isEditable} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Select...</option>{ROUTES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} disabled={!isEditable} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        {["low","medium","high","critical"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                      <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} disabled={!isEditable} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Team member" /></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Product Concept</h3>
                <textarea value={form.productConcept} onChange={e => setForm(f => ({ ...f, productConcept: e.target.value }))} disabled={!isEditable}
                  rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Describe the product concept..." />
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Regulatory</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Application Class</span><span className="font-medium">{product.applicationClass || "Not set"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">NPN Number</span><span className="font-medium">{product.npnNumber || "Pending"}</span></div>
                  {product.applicationId ? (
                    <a href={`/applications/${product.applicationId}`} className="block text-sm text-red-600 hover:text-red-700 font-medium mt-2">View PLA Application &rarr;</a>
                  ) : isEditable && (
                    <button onClick={async () => {
                      const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productName: product.name, brandName: product.brandName, dosageForm: product.dosageForm, routeOfAdmin: product.routeOfAdmin, applicationClass: product.applicationClass || "I", productConcept: product.productConcept }) });
                      if (res.ok) { const app = await res.json(); await fetch(`/api/products/${product.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: app.id, stage: "filing" }) }); router.push(`/applications/${app.id}`); }
                    }} className="w-full mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Create PLA Application</button>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-gray-900">{docs.length}</p><p className="text-xs text-gray-500">Documents</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-gray-900">9</p><p className="text-xs text-gray-500">Prompt Types</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-gray-900">{formatStage(product.stage).split(" ")[0]}</p><p className="text-xs text-gray-500">Stage</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ DOCUMENTS TAB ══════════ */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Upload area */}
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-sm text-gray-600 mb-3">Upload research documents — COAs, studies, competitor labels, market reports</p>
              <div className="flex items-center justify-center gap-3">
                <select value={uploadDocType} onChange={e => setUploadDocType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {uploading ? "Uploading..." : "Choose File"}
                </button>
              </div>
            </div>

            {/* Document list */}
            {docs.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No documents uploaded yet. Upload research PDFs above.</div>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.title || doc.fileName}</p>
                          <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(0)} KB &middot; {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.filePath && (
                          <>
                            <a href={`/api/files/view?path=${encodeURIComponent(doc.filePath)}`} target="_blank" rel="noopener noreferrer"
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium">View</a>
                            <a href={`/api/files/download?path=${encodeURIComponent(doc.filePath)}`}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium">Download</a>
                          </>
                        )}
                        <button onClick={async () => {
                          if (!confirm(`Delete "${doc.fileName}"?`)) return;
                          const res = await fetch(`/api/products/${product.id}/documents/${doc.id}`, { method: "DELETE" });
                          if (res.ok) setDocs(prev => prev.filter(d => d.id !== doc.id));
                        }} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium">Delete</button>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${extractionBadge(doc.extractionStatus)}`}>{doc.extractionStatus}</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{doc.docType}</span>
                      </div>
                    </div>
                    {doc.extractionStatus === "completed" && doc.extractedDataJson && doc.extractedDataJson !== "{}" && (
                      <details className="mt-3 border-t border-gray-100 pt-3">
                        <summary className="text-xs text-purple-600 cursor-pointer font-medium hover:text-purple-800">View AI-Extracted Data</summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto text-gray-700 max-h-48 overflow-y-auto">{JSON.stringify(JSON.parse(doc.extractedDataJson), null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ RESEARCH PROMPTS TAB ══════════ */}
        {activeTab === "research" && (() => {
          const selectedPrompt = DEFAULT_RESEARCH_PROMPTS.find(p => p.key === researchType) || DEFAULT_RESEARCH_PROMPTS[0];
          const generatedPrompt = fillPromptTemplate(selectedPrompt.template, {
            productName: product.name, name: product.name, brandName: product.brandName,
            productConcept: product.productConcept, dosageForm: product.dosageForm,
            routeOfAdmin: product.routeOfAdmin, stage: product.stage, targetMarket: product.targetMarket,
          });
          const copyPrompt = () => { navigator.clipboard.writeText(generatedPrompt); };
          const downloadPrompt = () => {
            const blob = new Blob([generatedPrompt], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${product.name.replace(/\s+/g, "_")}_${researchType}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          };
          return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Research Prompt Generator</h3>
                  <p className="text-sm text-gray-500 mt-1">Select a research type, copy the prompt, paste into your AI tool (ChatGPT, Claude, Perplexity), then upload results back in the Documents tab.</p>
                </div>
              </div>

              {/* Research type selector */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {DEFAULT_RESEARCH_PROMPTS.map(rt => (
                  <button key={rt.key} onClick={() => setResearchType(rt.key)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${researchType === rt.key ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className="text-sm font-medium text-gray-900"><span className="mr-1.5">{rt.icon}</span>{rt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Generated prompt */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">{selectedPrompt.icon} {selectedPrompt.label} — Ready to Copy</span>
                  <div className="flex gap-2">
                    <button onClick={copyPrompt} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy Prompt
                    </button>
                    <button onClick={downloadPrompt} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Download .txt
                    </button>
                  </div>
                </div>
                <pre className="p-4 text-xs text-gray-700 bg-white max-h-96 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">{generatedPrompt}</pre>
              </div>
            </div>

            {/* Workflow instructions */}
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <h4 className="font-semibold text-purple-900 mb-3">How to use this prompt</h4>
              <ol className="text-sm text-purple-800 space-y-2 list-decimal list-inside">
                <li><strong>Copy</strong> the prompt above (or download as .txt)</li>
                <li><strong>Paste</strong> into your AI tool — ChatGPT, Claude, Perplexity, or any LLM</li>
                <li><strong>Get the research output</strong> — the prompt asks for structured JSON so results are consistent</li>
                <li><strong>Save the output</strong> as a PDF or text file</li>
                <li><strong>Upload</strong> it back here in the <button onClick={() => setActiveTab("documents")} className="text-purple-700 underline font-medium">Documents tab</button> — select the matching document type</li>
              </ol>
            </div>
          </div>
          );
        })()}

        {/* ══════════ REVIEW & NOTES TAB ══════════ */}
        {activeTab === "review" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Review Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${product.reviewStatus === "approved" ? "bg-green-100 text-green-700" : product.reviewStatus === "rejected" ? "bg-red-100 text-red-700" : product.reviewStatus === "in_review" || product.reviewStatus === "requested" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                    {product.reviewStatus === "none" ? "No review requested" : formatStage(product.reviewStatus)}
                  </span>
                </div>
                {product.reviewNotes && <div><span className="text-sm text-gray-600">Reviewer Notes</span><p className="text-sm text-gray-800 mt-1 p-2 bg-gray-50 rounded">{product.reviewNotes}</p></div>}
                {isEditable && product.reviewStatus === "none" && (
                  <div className="space-y-2">
                    <select value={selectedReviewerId} onChange={e => setSelectedReviewerId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="">Select reviewer...</option>
                      {teamUsers.filter(u => u.id !== user.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                    <button onClick={async () => { if (!selectedReviewerId) return; await fetch(`/api/products/${product.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewerId: selectedReviewerId }) }); const r = await fetch(`/api/products/${product.id}`); if (r.ok) setProduct(await r.json()); }} disabled={!selectedReviewerId}
                      className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Request Review</button>
                  </div>
                )}
                {isEditable && product.reviewStatus === "requested" && product.reviewerId === user.id && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">You are the assigned reviewer</p>
                    <div className="flex gap-2">
                      <button onClick={async () => { await fetch(`/api/products/${product.id}/review`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "approved", notes: "" }) }); const r = await fetch(`/api/products/${product.id}`); if (r.ok) setProduct(await r.json()); }}
                        className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                      <button onClick={async () => { const n = prompt("What changes are needed?"); if (n === null) return; await fetch(`/api/products/${product.id}/review`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "needs_changes", notes: n }) }); const r = await fetch(`/api/products/${product.id}`); if (r.ok) setProduct(await r.json()); }}
                        className="flex-1 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Changes</button>
                      <button onClick={async () => { const n = prompt("Reason for rejection?"); if (n === null) return; await fetch(`/api/products/${product.id}/review`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "rejected", notes: n }) }); const r = await fetch(`/api/products/${product.id}`); if (r.ok) setProduct(await r.json()); }}
                        className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Internal Notes</h3>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} disabled={!isEditable}
                rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Internal notes, meeting summaries, decisions..." />
              {isEditable && <button onClick={() => save()} disabled={saving} className="mt-3 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50">{saving ? "Saving..." : "Save Notes"}</button>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
