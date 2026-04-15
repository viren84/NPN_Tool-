"use client";

const DOSAGE_FORMS = ["Capsule", "Tablet", "Softgel", "Powder", "Liquid", "Cream", "Spray", "Lozenge", "Chewable", "Gummy", "Other"];
const ROUTES = ["Oral", "Sublingual", "Topical", "Nasal", "Inhalation", "Other"];
const CONDITIONS = [
  "stress", "sleep", "joint_health", "heart_health", "immune", "digestion",
  "energy", "cognitive", "weight_management", "skin_health", "bone_health",
  "eye_health", "respiratory", "detox", "prenatal", "mens_health", "womens_health", "other",
];

function formatLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

interface Props {
  form: Record<string, string>;
  setForm: (fn: (f: Record<string, string>) => Record<string, string>) => void;
  isEditable: boolean;
}

export default function OverviewTab({ form, setForm, isEditable }: Props) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={!isEditable}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <input value={form.brandName || ""} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} disabled={!isEditable}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                <select value={form.dosageForm || ""} onChange={e => setForm(f => ({ ...f, dosageForm: e.target.value }))} disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
                  <option value="">Select...</option>
                  {DOSAGE_FORMS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                <select value={form.routeOfAdmin || ""} onChange={e => setForm(f => ({ ...f, routeOfAdmin: e.target.value }))} disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
                  <option value="">Select...</option>
                  {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority || "medium"} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
                  {["low", "medium", "high", "critical"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <input value={form.assignedTo || ""} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" placeholder="Team member" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Product Concept</h3>
          <textarea value={form.productConcept || ""} onChange={e => setForm(f => ({ ...f, productConcept: e.target.value }))} disabled={!isEditable}
            rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none bg-white text-gray-900" placeholder="What this product does..." />
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Target Condition</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Condition</label>
              <select value={form.targetCondition || ""} onChange={e => setForm(f => ({ ...f, targetCondition: e.target.value }))} disabled={!isEditable}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
                <option value="">Select condition...</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{formatLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition Detail</label>
              <input value={form.targetConditionDetail || ""} onChange={e => setForm(f => ({ ...f, targetConditionDetail: e.target.value }))} disabled={!isEditable}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" placeholder="e.g., chronic stress in working adults 25-45" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Regulatory</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Application Class</span><span className="font-medium">{form.applicationClass || "Not set"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Target Market</span><span className="font-medium">{form.targetMarket || "Canada"}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} disabled={!isEditable}
            rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none bg-white text-gray-900" placeholder="Internal notes..." />
        </div>
      </div>
    </div>
  );
}
