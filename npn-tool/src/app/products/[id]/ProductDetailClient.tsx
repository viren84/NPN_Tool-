"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import OverviewTab from "@/components/products/OverviewTab";
import ResearchTab from "@/components/products/ResearchTab";
import DocumentsTab from "@/components/products/DocumentsTab";
import ExportTab from "@/components/products/ExportTab";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

function formatStage(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

// ---------------------------------------------------------------------------
// Tab definitions (visibility depends on stage)
// ---------------------------------------------------------------------------

const TABS = [
  { key: "overview", label: "Overview", minStage: 0 },
  { key: "research", label: "Research & Intel", minStage: 0 },
  { key: "documents", label: "Documents", minStage: 0 },
  { key: "export", label: "Export", minStage: 0 },
] as const;

type TabKey = typeof TABS[number]["key"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string; name: string; brandName: string; stage: string; priority: string;
  assignedTo: string; dosageForm: string; routeOfAdmin: string; productConcept: string;
  targetMarket: string; targetCondition: string; targetConditionDetail: string;
  applicationClass: string; npnNumber: string; applicationId: string | null;
  reviewStatus: string; reviewerId: string; reviewNotes: string; notes: string;
  handoffReady: boolean; createdAt: string; updatedAt: string;
}

interface TeamUser { id: string; name: string; role: string; }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductDetailClient({
  user, product: initialProduct, teamUsers = [],
}: {
  user: { id: string; name: string; role: string; username: string };
  product: Product;
  teamUsers?: TeamUser[];
}) {
  const router = useRouter();
  const [product, setProduct] = useState(initialProduct);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [saving, setSaving] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  const [form, setForm] = useState<Record<string, string>>({
    name: product.name, brandName: product.brandName, dosageForm: product.dosageForm,
    routeOfAdmin: product.routeOfAdmin, productConcept: product.productConcept,
    priority: product.priority, assignedTo: product.assignedTo, notes: product.notes,
    targetMarket: product.targetMarket, targetCondition: product.targetCondition || "",
    targetConditionDetail: product.targetConditionDetail || "",
    applicationClass: product.applicationClass,
  });

  const currentIdx = STAGES.indexOf(product.stage as typeof STAGES[number]);
  const isEditable = user.role !== "viewer";

  const save = async (extra?: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...extra }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProduct(updated);
    }
    setSaving(false);
  };

  const moveStage = (newStage: string) => save({ stage: newStage });
  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
  const prevStage = currentIdx > 0 ? STAGES[currentIdx - 1] : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 p-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={() => router.push("/products")} className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Pipeline
            </button>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {product.brandName && <span>{product.brandName} &middot; </span>}
              {product.dosageForm && <span>{product.dosageForm} &middot; </span>}
              {product.targetCondition && <span>{formatStage(product.targetCondition)} &middot; </span>}
              {product.npnNumber && <span>NPN {product.npnNumber} &middot; </span>}
              Created {new Date(product.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs rounded-full ${stageColors[product.stage] || "bg-gray-100 text-gray-600"}`}>
              {formatStage(product.stage)}
            </span>
            {/* Review badge */}
            {product.reviewStatus !== "none" && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                product.reviewStatus === "approved" ? "bg-green-100 text-green-700" :
                product.reviewStatus === "rejected" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>{formatStage(product.reviewStatus)}</span>
            )}
            {isEditable && (
              <button onClick={() => save()} disabled={saving} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Stage Timeline (compact) */}
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 mb-4 overflow-x-auto">
          <div className="flex items-center gap-0.5 min-w-max">
            {STAGES.map((stage, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <div key={stage} className="flex items-center">
                  <button
                    onClick={() => isEditable && moveStage(stage)}
                    disabled={!isEditable}
                    className={`px-1.5 py-0.5 text-[10px] rounded-full transition-all ${
                      isCurrent ? "bg-red-600 text-white font-bold" :
                      isPast ? "bg-green-100 text-green-700" :
                      "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {formatStage(stage)}
                  </button>
                  {i < STAGES.length - 1 && <svg className={`w-3 h-3 ${isPast ? "text-green-300" : "text-gray-200"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage transition + review */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {prevStage && isEditable && (
              <button onClick={() => moveStage(prevStage)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                &larr; {formatStage(prevStage)}
              </button>
            )}
            {nextStage && isEditable && (
              <button onClick={() => moveStage(nextStage)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {formatStage(nextStage)} &rarr;
              </button>
            )}
            {product.applicationId ? (
              <a href={`/applications/${product.applicationId}`} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                View PLA &rarr;
              </a>
            ) : isEditable && (
              <button onClick={async () => {
                const res = await fetch("/api/applications", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productName: product.name, brandName: product.brandName, dosageForm: product.dosageForm, routeOfAdmin: product.routeOfAdmin, applicationClass: product.applicationClass || "I", productConcept: product.productConcept }),
                });
                if (res.ok) { const app = await res.json(); await save({ applicationId: app.id, stage: "filing" }); router.push(`/applications/${app.id}`); }
              }} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">
                + Create PLA
              </button>
            )}
          </div>
          {/* Review controls */}
          {isEditable && product.reviewStatus === "none" && (
            <div className="flex items-center gap-2">
              <select value={selectedReviewerId} onChange={e => setSelectedReviewerId(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-900">
                <option value="">Reviewer...</option>
                {teamUsers.filter(u => u.id !== user.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button disabled={!selectedReviewerId} onClick={async () => {
                await fetch(`/api/products/${product.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewerId: selectedReviewerId }) });
                const r = await fetch(`/api/products/${product.id}`); if (r.ok) setProduct(await r.json());
              }} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                Request Review
              </button>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <OverviewTab form={form} setForm={setForm} isEditable={isEditable} />
        )}
        {activeTab === "research" && (
          <ResearchTab productId={product.id} isEditable={isEditable} />
        )}
        {activeTab === "documents" && (
          <DocumentsTab productId={product.id} productStage={product.stage} isEditable={isEditable} />
        )}
        {activeTab === "export" && (
          <ExportTab productId={product.id} applicationId={product.applicationId} />
        )}
      </main>
    </div>
  );
}
