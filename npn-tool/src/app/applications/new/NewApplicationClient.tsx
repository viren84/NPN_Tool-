"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import WizardStepper from "@/components/WizardStepper";

const dosageForms = [
  "Capsule", "Tablet", "Softgel", "Liquid", "Powder", "Chewable Tablet",
  "Lozenge", "Cream", "Ointment", "Spray", "Drops", "Tea/Infusion", "Other",
];

const routes = [
  "Oral", "Topical", "Sublingual", "Nasal", "Inhalation", "Other",
];

type DataSource = "imported" | "ai_researched" | "manual";

const sourceBadge: Record<DataSource, { label: string; color: string }> = {
  imported: { label: "Imported", color: "bg-blue-100 text-blue-700" },
  ai_researched: { label: "AI Research", color: "bg-purple-100 text-purple-700" },
  manual: { label: "", color: "" },
};

function SourceBadge({ source }: { source?: DataSource }) {
  if (!source || source === "manual") return null;
  const { label, color } = sourceBadge[source];
  return <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded ${color}`}>{label}</span>;
}

export default function NewApplicationClient({
  user,
}: {
  user: { id: string; name: string; role: string; username: string };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    productName: "",
    productConcept: "",
    dosageForm: "",
    routeOfAdmin: "Oral",
    targetClaims: "",
    preferredIngredients: "",
  });
  const [dataSources, setDataSources] = useState<Record<string, DataSource>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionSummary, setExtractionSummary] = useState<{
    ingredientCount: number; claimCount: number; dosageGroupCount: number; riskCount: number; confidence: number; warnings: string[];
  } | null>(null);

  // Upload research PDF → AI extracts → redirects to editor
  const handleResearchUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus({ type: "error", message: "Only PDF files are supported for research import." });
      return;
    }
    setUploading(true);
    setUploadStatus(null);
    setExtractionSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/applications/import-research", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadStatus({ type: "error", message: data.error || "Import failed" });
        setUploading(false);
        return;
      }

      setUploadStatus({
        type: "success",
        message: `Created "${data.productName}" from ${file.name}`,
      });
      setExtractionSummary(data.extracted);

      // Redirect to the editor after a brief moment
      setTimeout(() => router.push(`/applications/${data.id}`), 1500);
    } catch {
      setUploadStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  // Upload preset Excel → creates full app → redirects to editor
  const handlePresetUpload = async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setUploadStatus({ type: "error", message: "Only Excel (.xlsx) files are supported for preset import." });
      return;
    }
    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/applications/import-preset", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadStatus({ type: "error", message: data.error || "Import failed" });
        setUploading(false);
        return;
      }

      setUploadStatus({
        type: "success",
        message: `Imported "${data.productName}" from preset Excel`,
      });
      setTimeout(() => router.push(`/applications/${data.id}`), 1000);
    } catch {
      setUploadStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".pdf")) handleResearchUpload(file);
    else if (file.name.match(/\.xlsx?$/i)) handlePresetUpload(file);
    else setUploadStatus({ type: "error", message: "Drop a PDF (research doc) or Excel (preset) file." });
  };

  const handleCreate = async () => {
    if (!form.productName.trim()) return;
    setLoading(true);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: form.productName,
        productConcept: [
          form.productConcept,
          form.targetClaims && `Target claims: ${form.targetClaims}`,
          form.preferredIngredients && `Preferred ingredients: ${form.preferredIngredients}`,
        ].filter(Boolean).join("\n\n"),
        dosageForm: form.dosageForm,
        routeOfAdmin: form.routeOfAdmin,
      }),
    });

    if (res.ok) {
      const app = await res.json();
      router.push(`/applications/${app.id}/ingredients`);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 p-6 min-w-0">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">New PLA Application</h2>
            <p className="text-sm text-gray-500 mt-1">
              Step 1 of 10 — Upload a research document, import a preset, or fill in manually.
            </p>
          </div>

          {/* Upload Zone */}
          <div
            className={`mb-6 border-2 border-dashed rounded-xl p-6 transition-colors ${
              isDragging ? "border-red-400 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {uploading ? "Processing..." : "Drop a file here, or choose an option below"}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                PDF (research document) or Excel (preset template)
              </p>

              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">AI is extracting application data...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Upload Research PDF
                  </button>
                  <button
                    onClick={() => excelInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Import Preset Excel
                  </button>
                  <a
                    href="/api/applications/export-template"
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Download Template
                  </a>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleResearchUpload(e.target.files[0])} />
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handlePresetUpload(e.target.files[0])} />
            </div>

            {/* Upload status */}
            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                uploadStatus.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {uploadStatus.message}
              </div>
            )}

            {/* Extraction summary */}
            {extractionSummary && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-1">AI Extraction Results</p>
                <div className="flex gap-4 text-xs text-blue-600">
                  <span>{extractionSummary.ingredientCount} ingredients</span>
                  <span>{extractionSummary.claimCount} claims</span>
                  <span>{extractionSummary.dosageGroupCount} dosage groups</span>
                  <span>{extractionSummary.riskCount} risk items</span>
                  <span>Confidence: {Math.round(extractionSummary.confidence * 100)}%</span>
                </div>
                {extractionSummary.warnings.length > 0 && (
                  <p className="text-xs text-blue-500 mt-1">
                    Notes: {extractionSummary.warnings.join("; ")}
                  </p>
                )}
                <p className="text-xs text-blue-500 mt-2">Redirecting to editor...</p>
              </div>
            )}
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-gray-50 px-3 text-xs text-gray-400">or fill in manually</span></div>
          </div>

          <WizardStepper activeStep={0} />

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                    <SourceBadge source={dataSources["productName"]} />
                  </label>
                  <input
                    type="text"
                    value={form.productName}
                    onChange={(e) => { setForm({ ...form, productName: e.target.value }); setDataSources((s) => ({ ...s, productName: "manual" })); }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., WE Vitamin D3 1000 IU"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage Form
                      <SourceBadge source={dataSources["dosageForm"]} />
                    </label>
                    <select
                      value={form.dosageForm}
                      onChange={(e) => { setForm({ ...form, dosageForm: e.target.value }); setDataSources((s) => ({ ...s, dosageForm: "manual" })); }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {dosageForms.map((df) => (
                        <option key={df} value={df}>{df}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route of Administration
                      <SourceBadge source={dataSources["routeOfAdmin"]} />
                    </label>
                    <select
                      value={form.routeOfAdmin}
                      onChange={(e) => { setForm({ ...form, routeOfAdmin: e.target.value }); setDataSources((s) => ({ ...s, routeOfAdmin: "manual" })); }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {routes.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Product Concept
                <SourceBadge source={dataSources["productConcept"]} />
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Describe what you want this product to do. AI will use this to research the best ingredients and filing strategy.
              </p>
              <textarea
                value={form.productConcept}
                onChange={(e) => { setForm({ ...form, productConcept: e.target.value }); setDataSources((s) => ({ ...s, productConcept: "manual" })); }}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="e.g., A high-potency vitamin E supplement using tocotrienol complex for cardiovascular and antioxidant support..."
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Optional Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Health Claims</label>
                  <textarea
                    value={form.targetClaims}
                    onChange={(e) => setForm({ ...form, targetClaims: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="e.g., Helps support cardiovascular health. Source of antioxidant."
                  />
                  <p className="text-xs text-gray-400 mt-1">AI will match these against monograph-approved claim wording</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Ingredients (if any)</label>
                  <textarea
                    value={form.preferredIngredients}
                    onChange={(e) => setForm({ ...form, preferredIngredients: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="e.g., Tocotrienol complex from palm oil, 100mg per softgel"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={loading || !form.productName.trim()}
                className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? "Creating..." : "Next: AI Ingredient Research"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
