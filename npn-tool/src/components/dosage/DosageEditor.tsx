"use client";

import { useState } from "react";

interface DosGroup {
  id: string; population: string; ageRangeMin: number | null; ageRangeMax: number | null;
  minDose: number | null; maxDose: number | null; doseUnit: string;
  frequency: string; directions: string; withFood: boolean;
}

const POPULATIONS = [
  { value: "adults", label: "Adults (18+)" },
  { value: "children_12_17", label: "Children (12-17)" },
  { value: "children_6_12", label: "Children (6-12)" },
  { value: "children_2_6", label: "Children (2-6)" },
  { value: "pregnant", label: "Pregnant" },
  { value: "breastfeeding", label: "Breastfeeding" },
];

const FREQUENCIES = ["once_daily", "twice_daily", "three_times_daily", "four_times_daily", "as_needed", "with_each_meal"];

export default function DosageEditor({
  appId, groups, isEditable, onReload,
}: {
  appId: string; groups: DosGroup[]; isEditable: boolean; onReload: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  const addGroup = async (population: string) => {
    await fetch(`/api/applications/${appId}/dosage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ population }),
    });
    setAdding(false);
    await onReload();
  };

  const updateGroup = async (id: string, data: Partial<DosGroup>) => {
    await fetch(`/api/applications/${appId}/dosage/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await onReload();
  };

  const deleteGroup = async (id: string) => {
    await fetch(`/api/applications/${appId}/dosage/${id}`, { method: "DELETE" });
    await onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Dosage & Directions ({groups.length} groups)</h3>
        {isEditable && (
          <button onClick={() => setAdding(true)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
            + Add Population Group
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 self-center mr-2">Select population:</span>
          {POPULATIONS.map(p => (
            <button key={p.value} onClick={() => addGroup(p.value)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">{p.label}</button>
          ))}
          <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      )}

      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {POPULATIONS.find(p => p.value === group.population)?.label || group.population}
              </h4>
              {isEditable && (
                <button onClick={() => deleteGroup(group.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500">Min Dose</label>
                <input type="number" defaultValue={group.minDose || ""} disabled={!isEditable}
                  onBlur={e => updateGroup(group.id, { minDose: Number(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Max Dose</label>
                <input type="number" defaultValue={group.maxDose || ""} disabled={!isEditable}
                  onBlur={e => updateGroup(group.id, { maxDose: Number(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Unit</label>
                <input type="text" defaultValue={group.doseUnit} disabled={!isEditable}
                  onBlur={e => updateGroup(group.id, { doseUnit: e.target.value })}
                  placeholder="e.g., tablet(s)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Frequency</label>
                <select defaultValue={group.frequency} disabled={!isEditable}
                  onChange={e => updateGroup(group.id, { frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  <option value="">Select...</option>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500">Directions</label>
              <input type="text" defaultValue={group.directions} disabled={!isEditable}
                onBlur={e => updateGroup(group.id, { directions: e.target.value })}
                placeholder="e.g., Take with food, or as directed by a healthcare practitioner."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              <input type="checkbox" defaultChecked={group.withFood} disabled={!isEditable}
                onChange={e => updateGroup(group.id, { withFood: e.target.checked })} className="rounded" />
              Take with food
            </label>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
            No dosage groups defined. Add at least one (usually Adults).
          </div>
        )}
      </div>
    </div>
  );
}
