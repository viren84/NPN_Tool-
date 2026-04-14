"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

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

function formatStage(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

interface Product {
  id: string; name: string; brandName: string; stage: string; priority: string;
  assignedTo: string; dosageForm: string; routeOfAdmin: string; productConcept: string;
  targetMarket: string; applicationClass: string; npnNumber: string; applicationId: string | null;
  reviewStatus: string; reviewerId: string; reviewNotes: string; notes: string;
  handoffReady: boolean; createdAt: string; updatedAt: string;
}

interface TeamUser {
  id: string;
  name: string;
  role: string;
}

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
  const [form, setForm] = useState({
    name: product.name, brandName: product.brandName, dosageForm: product.dosageForm,
    routeOfAdmin: product.routeOfAdmin, productConcept: product.productConcept,
    priority: product.priority, assignedTo: product.assignedTo, notes: product.notes,
    targetMarket: product.targetMarket,
  });

  const [selectedReviewerId, setSelectedReviewerId] = useState("");
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
      setForm(f => ({ ...f, name: updated.name, brandName: updated.brandName, dosageForm: updated.dosageForm, routeOfAdmin: updated.routeOfAdmin, productConcept: updated.productConcept, priority: updated.priority, assignedTo: updated.assignedTo, notes: updated.notes, targetMarket: updated.targetMarket }));
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

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push("/products")} className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Pipeline
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {product.brandName && <span>{product.brandName} &middot; </span>}
              {product.dosageForm && <span>{product.dosageForm} &middot; </span>}
              {product.npnNumber && <span>NPN {product.npnNumber} &middot; </span>}
              Created {new Date(product.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full ${stageColors[product.stage] || "bg-gray-100 text-gray-600"}`}>
              {formatStage(product.stage)}
            </span>
            {isEditable && (
              <button onClick={() => save()} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        {/* Stage Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STAGES.map((stage, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <div key={stage} className="flex items-center">
                  <button
                    onClick={() => isEditable && moveStage(stage)}
                    disabled={!isEditable}
                    className={`px-2 py-1 text-xs rounded-full transition-all ${
                      isCurrent ? "bg-red-600 text-white font-bold" :
                      isPast ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    }`}
                    title={`Move to ${formatStage(stage)}`}
                  >
                    {formatStage(stage)}
                  </button>
                  {i < STAGES.length - 1 && (
                    <svg className={`w-4 h-4 mx-0.5 ${isPast ? "text-green-400" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage transition buttons */}
        <div className="flex gap-3 mb-6">
          {prevStage && isEditable && (
            <button onClick={() => moveStage(prevStage)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              &larr; Back to {formatStage(prevStage)}
            </button>
          )}
          {nextStage && isEditable && (
            <button onClick={() => moveStage(nextStage)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Move to {formatStage(nextStage)} &rarr;
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Product Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={!isEditable}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                  <input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} disabled={!isEditable}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                    <select value={form.dosageForm} onChange={e => setForm(f => ({ ...f, dosageForm: e.target.value }))} disabled={!isEditable}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Select...</option>
                      {DOSAGE_FORMS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                    <select value={form.routeOfAdmin} onChange={e => setForm(f => ({ ...f, routeOfAdmin: e.target.value }))} disabled={!isEditable}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Select...</option>
                      {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} disabled={!isEditable}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {["low", "medium", "high", "critical"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} disabled={!isEditable}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Team member name" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Concept</h3>
              <textarea value={form.productConcept} onChange={e => setForm(f => ({ ...f, productConcept: e.target.value }))} disabled={!isEditable}
                rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Describe the product concept..." />
            </div>
          </div>

          {/* Right: Status & Review */}
          <div className="space-y-6">
            {/* Review Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Review Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    product.reviewStatus === "approved" ? "bg-green-100 text-green-700" :
                    product.reviewStatus === "rejected" ? "bg-red-100 text-red-700" :
                    product.reviewStatus === "in_review" || product.reviewStatus === "requested" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {product.reviewStatus === "none" ? "No review requested" : formatStage(product.reviewStatus)}
                  </span>
                </div>
                {product.reviewNotes && (
                  <div>
                    <span className="text-sm text-gray-600">Reviewer Notes</span>
                    <p className="text-sm text-gray-800 mt-1 p-2 bg-gray-50 rounded">{product.reviewNotes}</p>
                  </div>
                )}
                {isEditable && product.reviewStatus === "none" && (
                  <div className="space-y-2">
                    <select
                      value={selectedReviewerId}
                      onChange={(e) => setSelectedReviewerId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      <option value="">Select reviewer...</option>
                      {teamUsers.filter(u => u.id !== user.id).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (!selectedReviewerId) return;
                        await fetch(`/api/products/${product.id}/review`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ reviewerId: selectedReviewerId }),
                        });
                        const r = await fetch(`/api/products/${product.id}`);
                        if (r.ok) setProduct(await r.json());
                      }}
                      disabled={!selectedReviewerId}
                      className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Review
                    </button>
                  </div>
                )}
                {isEditable && product.reviewStatus === "requested" && product.reviewerId === user.id && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">You are the assigned reviewer</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetch(`/api/products/${product.id}/review`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ decision: "approved", notes: "" }),
                          });
                          const r = await fetch(`/api/products/${product.id}`);
                          if (r.ok) setProduct(await r.json());
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          const notes = prompt("What changes are needed?");
                          if (notes === null) return;
                          await fetch(`/api/products/${product.id}/review`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ decision: "needs_changes", notes }),
                          });
                          const r = await fetch(`/api/products/${product.id}`);
                          if (r.ok) setProduct(await r.json());
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Changes
                      </button>
                      <button
                        onClick={async () => {
                          const notes = prompt("Reason for rejection?");
                          if (notes === null) return;
                          await fetch(`/api/products/${product.id}/review`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ decision: "rejected", notes }),
                          });
                          const r = await fetch(`/api/products/${product.id}`);
                          if (r.ok) setProduct(await r.json());
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Regulatory Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Regulatory</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Application Class</span><span className="font-medium">{product.applicationClass || "Not set"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">NPN Number</span><span className="font-medium">{product.npnNumber || "Pending"}</span></div>
                {product.applicationId ? (
                  <a href={`/applications/${product.applicationId}`} className="block text-sm text-red-600 hover:text-red-700 font-medium mt-2">
                    View PLA Application &rarr;
                  </a>
                ) : isEditable && (
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/applications", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          productName: product.name,
                          brandName: product.brandName,
                          dosageForm: product.dosageForm,
                          routeOfAdmin: product.routeOfAdmin,
                          applicationClass: product.applicationClass || "I",
                          productConcept: product.productConcept,
                        }),
                      });
                      if (res.ok) {
                        const app = await res.json();
                        // Link the product to the new application
                        await fetch(`/api/products/${product.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ applicationId: app.id, stage: "filing" }),
                        });
                        router.push(`/applications/${app.id}`);
                      }
                    }}
                    className="w-full mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create PLA Application
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} disabled={!isEditable}
                rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Internal notes..." />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
