"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

const dosageForms = [
  "Capsule", "Tablet", "Softgel", "Liquid", "Powder", "Chewable Tablet",
  "Lozenge", "Cream", "Ointment", "Spray", "Drops", "Tea/Infusion", "Other",
];

const routes = [
  "Oral", "Topical", "Sublingual", "Nasal", "Inhalation", "Other",
];

export default function NewApplicationClient({
  user,
}: {
  user: { id: string; name: string; role: string; username: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    productName: "",
    productConcept: "",
    dosageForm: "",
    routeOfAdmin: "Oral",
    targetClaims: "",
    preferredIngredients: "",
  });
  const [loading, setLoading] = useState(false);

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

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">New PLA Application</h2>
            <p className="text-sm text-gray-500 mt-1">
              Step 1 of 10 — Describe your product. AI will research ingredients and recommend the best approach.
            </p>
          </div>

          {/* Wizard Progress */}
          <div className="flex items-center gap-2 mb-8">
            {["Concept", "Research", "Ingredients", "Confirm", "COAs", "Documents", "Review", "Validate", "Package", "Submit"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  i === 0 ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${i === 0 ? "text-red-700 font-medium" : "text-gray-400"} hidden xl:inline`}>
                  {step}
                </span>
                {i < 9 && <div className="w-4 h-px bg-gray-300" />}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.productName}
                    onChange={(e) => setForm({ ...form, productName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., WE Vitamin D3 1000 IU"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                    <select
                      value={form.dosageForm}
                      onChange={(e) => setForm({ ...form, dosageForm: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {dosageForms.map((df) => (
                        <option key={df} value={df}>{df}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Route of Administration</label>
                    <select
                      value={form.routeOfAdmin}
                      onChange={(e) => setForm({ ...form, routeOfAdmin: e.target.value })}
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
              <h3 className="font-semibold text-gray-900 mb-4">Product Concept</h3>
              <p className="text-xs text-gray-500 mb-3">
                Describe what you want this product to do. AI will use this to research the best ingredients and filing strategy.
              </p>
              <textarea
                value={form.productConcept}
                onChange={(e) => setForm({ ...form, productConcept: e.target.value })}
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
