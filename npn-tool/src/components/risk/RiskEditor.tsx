"use client";

import { useState } from "react";

interface Risk {
  id: string; riskType: string; textEn: string; textFr: string;
  fromMonograph: boolean; monographName: string;
}

const RISK_TYPES = [
  { value: "caution", label: "Cautions", color: "bg-yellow-50 border-yellow-200" },
  { value: "warning", label: "Warnings", color: "bg-orange-50 border-orange-200" },
  { value: "contraindication", label: "Contraindications", color: "bg-red-50 border-red-200" },
  { value: "adverse_reaction", label: "Known Adverse Reactions", color: "bg-purple-50 border-purple-200" },
];

export default function RiskEditor({
  appId, risks, isEditable, onReload,
}: {
  appId: string; risks: Risk[]; isEditable: boolean; onReload: () => Promise<void>;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [newText, setNewText] = useState("");

  const addRisk = async () => {
    if (!newText.trim() || !adding) return;
    await fetch(`/api/applications/${appId}/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ riskType: adding, textEn: newText }),
    });
    setNewText(""); setAdding(null);
    await onReload();
  };

  const deleteRisk = async (id: string) => {
    await fetch(`/api/applications/${appId}/risk/${id}`, { method: "DELETE" });
    await onReload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Risk Information ({risks.length} items)</h3>
      </div>

      {RISK_TYPES.map(type => {
        const typeRisks = risks.filter(r => r.riskType === type.value);
        return (
          <div key={type.value} className={`rounded-xl border p-5 ${type.color}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">{type.label} ({typeRisks.length})</h4>
              {isEditable && (
                <button onClick={() => setAdding(type.value)}
                  className="text-xs text-gray-600 hover:text-gray-800 bg-white px-2 py-1 rounded border border-gray-200">+ Add</button>
              )}
            </div>
            {typeRisks.length === 0 && (
              <p className="text-xs text-gray-400">None defined</p>
            )}
            {typeRisks.map(risk => (
              <div key={risk.id} className="flex items-start gap-2 mb-2">
                <span className="text-sm text-gray-800 flex-1">{risk.textEn}</span>
                {risk.fromMonograph && (
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full shrink-0 border border-gray-200">
                    {risk.monographName}
                  </span>
                )}
                {isEditable && !risk.fromMonograph && (
                  <button onClick={() => deleteRisk(risk.id)} className="text-xs text-red-600 hover:text-red-800 font-medium shrink-0">Delete</button>
                )}
              </div>
            ))}
            {adding === type.value && (
              <div className="flex gap-2 mt-3">
                <input type="text" value={newText} onChange={e => setNewText(e.target.value)}
                  placeholder={`Add ${type.label.toLowerCase()}...`}
                  onKeyDown={e => e.key === "Enter" && addRisk()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                <button onClick={addRisk} disabled={!newText.trim()}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">Add</button>
                <button onClick={() => { setAdding(null); setNewText(""); }}
                  className="px-3 py-2 text-sm text-gray-500 hover:bg-white rounded-lg">Cancel</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
