"use client";

import { useState } from "react";

const UNITS = ["mg", "mcg", "g", "mL", "IU", "%", "CFU", "billion CFU"];
const PURPOSES = ["root", "leaf", "seed", "fruit", "bark", "whole plant", "flower", "rhizome", "aerial parts"];
const EXTRACT_TYPES = ["", "Standardized extract", "Tincture", "Infusion", "Decoction", "Dry extract", "Fluid extract", "Pressed juice"];

interface Props {
  appId: string;
  ingredientId: string | null;
  ingredient?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

export default function IngredientForm({ appId, ingredientId, ingredient, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    properName: (ingredient?.properName as string) || "",
    commonName: (ingredient?.commonName as string) || "",
    scientificName: (ingredient?.scientificName as string) || "",
    casNumber: (ingredient?.casNumber as string) || "",
    quantity: (ingredient?.quantity as number) || 0,
    quantityUnit: (ingredient?.quantityUnit as string) || "mg",
    potency: (ingredient?.potency as number) || 0,
    potencyUnit: (ingredient?.potencyUnit as string) || "",
    standardization: (ingredient?.standardization as string) || "",
    sourceMaterial: (ingredient?.sourceMaterial as string) || "",
    organismPart: (ingredient?.organismPart as string) || "",
    extractType: (ingredient?.extractType as string) || "",
    extractSolvent: (ingredient?.extractSolvent as string) || "",
    extractRatio: (ingredient?.extractRatio as string) || "",
    driedHerbEquiv: (ingredient?.driedHerbEquiv as string) || "",
    syntheticFlag: (ingredient?.syntheticFlag as boolean) || false,
    nanomaterialFlag: (ingredient?.nanomaterialFlag as boolean) || false,
    animalTissueFlag: (ingredient?.animalTissueFlag as boolean) || false,
    animalSource: (ingredient?.animalSource as string) || "",
    monographName: (ingredient?.monographName as string) || "",
    monographCompliant: (ingredient?.monographCompliant as boolean) || false,
    supplierName: (ingredient?.supplierName as string) || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.properName.trim()) return;
    setSaving(true);
    const url = ingredientId
      ? `/api/applications/${appId}/ingredients/${ingredientId}`
      : `/api/applications/${appId}/ingredients`;
    await fetch(url, {
      method: ingredientId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved();
  };

  const set = (key: string, val: unknown) => setForm({ ...form, [key]: val });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">{ingredientId ? "Edit" : "Add"} Medicinal Ingredient</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-5">
          {/* Names */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Identification</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">Proper Name *</label>
                <input type="text" value={form.properName} onChange={e => set("properName", e.target.value)}
                  placeholder="e.g., Ascorbic acid"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Common Name</label>
                <input type="text" value={form.commonName} onChange={e => set("commonName", e.target.value)}
                  placeholder="e.g., Vitamin C"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Scientific Name</label>
                <input type="text" value={form.scientificName} onChange={e => set("scientificName", e.target.value)}
                  placeholder="e.g., L-Ascorbic acid"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-500">CAS Number</label>
                <input type="text" value={form.casNumber} onChange={e => set("casNumber", e.target.value)}
                  placeholder="e.g., 50-81-7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Supplier</label>
                <input type="text" value={form.supplierName} onChange={e => set("supplierName", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Quantity & Potency</h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500">Quantity *</label>
                <input type="number" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Unit</label>
                <select value={form.quantityUnit} onChange={e => set("quantityUnit", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Potency</label>
                <input type="number" value={form.potency} onChange={e => set("potency", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Standardization</label>
                <input type="text" value={form.standardization} onChange={e => set("standardization", e.target.value)}
                  placeholder="e.g., 95% curcuminoids"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
            </div>
          </div>

          {/* Source */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Source & Extract</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">Source Material</label>
                <input type="text" value={form.sourceMaterial} onChange={e => set("sourceMaterial", e.target.value)}
                  placeholder="e.g., Curcuma longa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Organism Part</label>
                <select value={form.organismPart} onChange={e => set("organismPart", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  <option value="">N/A</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Extract Type</label>
                <select value={form.extractType} onChange={e => set("extractType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  {EXTRACT_TYPES.map(t => <option key={t} value={t}>{t || "None"}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-500">Extract Solvent</label>
                <input type="text" value={form.extractSolvent} onChange={e => set("extractSolvent", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Extract Ratio</label>
                <input type="text" value={form.extractRatio} onChange={e => set("extractRatio", e.target.value)}
                  placeholder="e.g., 4:1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">DHE / QCE</label>
                <input type="text" value={form.driedHerbEquiv} onChange={e => set("driedHerbEquiv", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Flags & Monograph</h4>
            <div className="flex flex-wrap gap-6 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.syntheticFlag} onChange={e => set("syntheticFlag", e.target.checked)} className="rounded" />
                Synthetic
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.nanomaterialFlag} onChange={e => set("nanomaterialFlag", e.target.checked)} className="rounded" />
                Nanomaterial
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.animalTissueFlag} onChange={e => set("animalTissueFlag", e.target.checked)} className="rounded" />
                Animal Tissue
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.monographCompliant} onChange={e => set("monographCompliant", e.target.checked)} className="rounded" />
                Monograph Compliant
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Monograph Name</label>
                <input type="text" value={form.monographName} onChange={e => set("monographName", e.target.value)}
                  placeholder="e.g., Vitamin C"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              {form.animalTissueFlag && (
                <div>
                  <label className="text-xs text-gray-500">Animal Source (species/tissue)</label>
                  <input type="text" value={form.animalSource} onChange={e => set("animalSource", e.target.value)}
                    placeholder="e.g., Bovine gelatin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !form.properName.trim()}
            className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? "Saving..." : ingredientId ? "Update" : "Add Ingredient"}
          </button>
        </div>
      </div>
    </div>
  );
}
