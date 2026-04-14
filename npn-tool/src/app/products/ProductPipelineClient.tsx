"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductData {
  id: string;
  name: string;
  brandName: string;
  stage: string;
  priority: string;
  assignedTo: string;
  dosageForm: string;
  routeOfAdmin: string;
  productConcept: string;
  npnNumber: string;
  updatedAt: string;
}

interface Props {
  user: { name: string; role: string };
  initialProducts: ProductData[];
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

const STAGES = [
  "research",
  "formulation",
  "stability",
  "filing",
  "under_review",
  "approved",
  "production",
  "launch",
  "active",
  "amendment",
  "renewal",
  "suspended",
  "cancelled",
  "archived",
  "withdrawn",
] as const;

type Stage = (typeof STAGES)[number];

const stageColors: Record<Stage, string> = {
  // Early (blue)
  research: "bg-blue-100 text-blue-700",
  formulation: "bg-blue-100 text-blue-700",
  stability: "bg-blue-100 text-blue-700",
  // Pending (yellow)
  filing: "bg-yellow-100 text-yellow-800",
  under_review: "bg-yellow-100 text-yellow-800",
  // Active (green)
  approved: "bg-green-100 text-green-700",
  production: "bg-green-100 text-green-700",
  launch: "bg-green-100 text-green-700",
  // Active bold
  active: "bg-green-200 text-green-800 font-semibold",
  // Maintenance (purple)
  amendment: "bg-purple-100 text-purple-700",
  renewal: "bg-purple-100 text-purple-700",
  // Terminal (gray/red)
  suspended: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-600",
  withdrawn: "bg-gray-200 text-gray-700",
};

const stageFilterColors: Record<Stage, { active: string; inactive: string }> = {
  research:     { active: "bg-blue-600 text-white",   inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  formulation:  { active: "bg-blue-600 text-white",   inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  stability:    { active: "bg-blue-600 text-white",   inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  filing:       { active: "bg-yellow-500 text-white",  inactive: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
  under_review: { active: "bg-yellow-500 text-white",  inactive: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
  approved:     { active: "bg-green-600 text-white",  inactive: "bg-green-50 text-green-700 hover:bg-green-100" },
  production:   { active: "bg-green-600 text-white",  inactive: "bg-green-50 text-green-700 hover:bg-green-100" },
  launch:       { active: "bg-green-600 text-white",  inactive: "bg-green-50 text-green-700 hover:bg-green-100" },
  active:       { active: "bg-green-700 text-white",  inactive: "bg-green-100 text-green-800 hover:bg-green-200" },
  amendment:    { active: "bg-purple-600 text-white",  inactive: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
  renewal:      { active: "bg-purple-600 text-white",  inactive: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
  suspended:    { active: "bg-red-600 text-white",    inactive: "bg-red-50 text-red-700 hover:bg-red-100" },
  cancelled:    { active: "bg-red-600 text-white",    inactive: "bg-red-50 text-red-700 hover:bg-red-100" },
  archived:     { active: "bg-gray-600 text-white",   inactive: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
  withdrawn:    { active: "bg-gray-700 text-white",   inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
};

const priorityColors: Record<string, string> = {
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700 font-semibold",
};

// ---------------------------------------------------------------------------
// Dosage & Route options
// ---------------------------------------------------------------------------

const DOSAGE_FORMS = [
  "Capsule",
  "Tablet",
  "Softgel",
  "Powder",
  "Liquid",
  "Tincture",
  "Cream",
  "Oil",
  "Spray",
  "Lozenge",
  "Chewable",
  "Gummy",
  "Suppository",
  "Other",
];

const ROUTES = [
  "Oral",
  "Sublingual",
  "Topical",
  "Nasal",
  "Rectal",
  "Inhalation",
  "Other",
];

const PRIORITIES = ["low", "medium", "high", "critical"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatStageLabel(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductPipelineClient({ user, initialProducts }: Props) {
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New product form state
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formDosage, setFormDosage] = useState("");
  const [formRoute, setFormRoute] = useState("");
  const [formConcept, setFormConcept] = useState("");
  const [formPriority, setFormPriority] = useState("medium");

  // Refresh products from API
  useEffect(() => {
    setLoading(true);
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  // ---------------------------------------------------------------------------
  // Stage counts
  // ---------------------------------------------------------------------------

  const stageCounts: Record<string, number> = {};
  for (const s of STAGES) stageCounts[s] = 0;
  for (const p of products) {
    if (stageCounts[p.stage] !== undefined) stageCounts[p.stage]++;
  }

  // ---------------------------------------------------------------------------
  // Filtered products
  // ---------------------------------------------------------------------------

  const filtered = activeStage
    ? products.filter((p) => p.stage === activeStage)
    : products;

  // ---------------------------------------------------------------------------
  // New product submit
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          brandName: formBrand.trim(),
          dosageForm: formDosage,
          routeOfAdmin: formRoute,
          productConcept: formConcept.trim(),
          priority: formPriority,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create product.");
        setSaving(false);
        return;
      }

      const newProduct = await res.json();
      setProducts((prev) => [newProduct, ...prev]);

      // Reset form
      setFormName("");
      setFormBrand("");
      setFormDosage("");
      setFormRoute("");
      setFormConcept("");
      setFormPriority("medium");
      setShowModal(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user as never} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Product Pipeline</h2>
            <p className="text-sm text-gray-500 mt-1">
              {products.length} product{products.length !== 1 ? "s" : ""} across {STAGES.length} lifecycle stages
            </p>
          </div>
          <button
            onClick={() => { setShowModal(true); setError(""); }}
            className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Product
          </button>
        </div>

        {/* Stage filter bar */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2 min-w-max">
            {/* All pill */}
            <button
              onClick={() => setActiveStage(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeStage === null
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({products.length})
            </button>
            {STAGES.map((stage) => {
              const count = stageCounts[stage];
              const isActive = activeStage === stage;
              const colors = stageFilterColors[stage];
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStage(isActive ? null : stage)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                    isActive ? colors.active : colors.inactive
                  }`}
                >
                  {formatStageLabel(stage)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Product cards grid */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm text-gray-500">
              {activeStage
                ? `No products in "${formatStageLabel(activeStage)}" stage.`
                : "No products in the pipeline yet. Click \"New Product\" to get started."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <a
                key={product.id}
                href={`/products/${product.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
              >
                {/* Top: Name + Stage badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors truncate">
                      {product.name}
                    </h3>
                    {product.brandName && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{product.brandName}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
                      stageColors[product.stage as Stage] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {formatStageLabel(product.stage)}
                  </span>
                </div>

                {/* Priority badge (only high/critical) */}
                {(product.priority === "high" || product.priority === "critical") && (
                  <div className="mb-3">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        priorityColors[product.priority] || ""
                      }`}
                    >
                      {product.priority === "critical" ? "CRITICAL" : "HIGH"} priority
                    </span>
                  </div>
                )}

                {/* Details grid */}
                <div className="space-y-2 text-xs text-gray-500">
                  {product.assignedTo && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{product.assignedTo}</span>
                    </div>
                  )}

                  {(product.dosageForm || product.routeOfAdmin) && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <span className="truncate">
                        {[product.dosageForm, product.routeOfAdmin].filter(Boolean).join(" / ")}
                      </span>
                    </div>
                  )}

                  {product.npnNumber && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="font-mono text-gray-700">NPN {product.npnNumber}</span>
                    </div>
                  )}
                </div>

                {/* Footer: last updated */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Updated {relativeTime(product.updatedAt)}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      {/* ================================================================ */}
      {/* New Product Modal */}
      {/* ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!saving) setShowModal(false); }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">New Product</h3>
              <button
                onClick={() => { if (!saving) setShowModal(false); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ashwagandha Root Extract 600mg"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                  autoFocus
                />
              </div>

              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="e.g. WellnessExtract"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              {/* Dosage Form + Route (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                  <select
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select...</option>
                    {DOSAGE_FORMS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                  <select
                    value={formRoute}
                    onChange={(e) => setFormRoute(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select...</option>
                    {ROUTES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Concept */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Concept</label>
                <textarea
                  value={formConcept}
                  onChange={(e) => setFormConcept(e.target.value)}
                  rows={3}
                  placeholder="Describe the product concept, target claims, intended use..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { if (!saving) setShowModal(false); }}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {saving ? "Creating..." : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
