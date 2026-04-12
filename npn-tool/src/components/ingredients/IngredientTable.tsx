"use client";

import { useState } from "react";
import IngredientForm from "./IngredientForm";

interface Ingredient {
  id: string; properName: string; commonName: string; scientificName: string;
  quantity: number; quantityUnit: string; monographName: string; monographCompliant: boolean;
  animalTissueFlag: boolean; syntheticFlag: boolean; sourceMaterial: string;
  supplierName: string; sortOrder: number;
}

export default function IngredientTable({
  appId, ingredients, isEditable, onReload,
}: {
  appId: string; ingredients: Ingredient[]; isEditable: boolean; onReload: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const deleteIngredient = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/applications/${appId}/ingredients/${id}`, { method: "DELETE" });
    await onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Medicinal Ingredients ({ingredients.length})</h3>
        {isEditable && (
          <button onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Ingredient
          </button>
        )}
      </div>

      {ingredients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400 mb-3">No medicinal ingredients yet</p>
          <p className="text-xs text-gray-400">Click "Add Ingredient" or use "AI Research" to find ingredients</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Proper Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Common Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Scientific Name</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Quantity</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Source</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Monograph</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Flags</th>
                {isEditable && <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ingredients.map(ing => (
                <tr key={ing.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ing.properName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ing.commonName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 italic">{ing.scientificName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">{ing.quantity} {ing.quantityUnit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ing.sourceMaterial || (ing.syntheticFlag ? "Synthetic" : "—")}</td>
                  <td className="px-4 py-3">
                    {ing.monographCompliant ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        {ing.monographName || "Yes"}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">No monograph</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ing.animalTissueFlag && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded mr-1">Animal</span>}
                    {ing.syntheticFlag && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Synth</span>}
                  </td>
                  {isEditable && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditingId(ing.id); setShowForm(true); }}
                        className="text-xs text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                      <button onClick={() => deleteIngredient(ing.id, ing.properName)}
                        className="text-xs text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <IngredientForm
          appId={appId}
          ingredientId={editingId}
          ingredient={editingId ? ingredients.find(i => i.id === editingId) as unknown as Record<string, unknown> : undefined}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await onReload(); }}
        />
      )}
    </div>
  );
}
