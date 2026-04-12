"use client";

import { useState } from "react";

interface Item {
  id: string; ingredientName: string; purpose: string; quantity: number | null;
  unit: string; animalTissueFlag: boolean; sortOrder: number;
}

const PURPOSES = ["Binder/Filler", "Disintegrant", "Lubricant", "Coating", "Anti-caking", "Capsule shell",
  "Softgel shell", "Plasticizer", "Vehicle", "Carrier", "Humectant", "pH adjuster", "Flavouring",
  "Sweetener", "Preservative", "Colorant", "Flavour enhancer"];

export default function NonMedTable({
  appId, items, dosageForm, isEditable, onReload,
}: {
  appId: string; items: Item[]; dosageForm: string; isEditable: boolean; onReload: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [newAnimal, setNewAnimal] = useState(false);

  const loadPresets = async () => {
    if (!dosageForm) { alert("Set dosage form in Overview tab first"); return; }
    await fetch(`/api/applications/${appId}/non-med-ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadPreset: dosageForm }),
    });
    await onReload();
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    await fetch(`/api/applications/${appId}/non-med-ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientName: newName, purpose: newPurpose, animalTissueFlag: newAnimal }),
    });
    setNewName(""); setNewPurpose(""); setNewAnimal(false); setAdding(false);
    await onReload();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/applications/${appId}/non-med-ingredients/${id}`, { method: "DELETE" });
    await onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Non-Medicinal Ingredients ({items.length})</h3>
        {isEditable && (
          <div className="flex gap-2">
            <button onClick={loadPresets}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Load {dosageForm || "Dosage Form"} Presets
            </button>
            <button onClick={() => setAdding(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              + Add
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ingredient Name</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Purpose</th>
              <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Animal Tissue</th>
              {isEditable && <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{item.ingredientName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.purpose}</td>
                <td className="px-4 py-3 text-center">
                  {item.animalTissueFlag && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Yes</span>}
                </td>
                {isEditable && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteItem(item.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                No non-medicinal ingredients. Use presets or add manually.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Microcrystalline cellulose"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
          </div>
          <div className="w-48">
            <label className="text-xs text-gray-500">Purpose</label>
            <select value={newPurpose} onChange={e => setNewPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
              <option value="">Select...</option>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs pb-2">
            <input type="checkbox" checked={newAnimal} onChange={e => setNewAnimal(e.target.checked)} />
            Animal
          </label>
          <button onClick={addItem} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Add</button>
          <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
        </div>
      )}
    </div>
  );
}
