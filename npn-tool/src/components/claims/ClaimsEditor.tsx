"use client";

import { useState } from "react";

interface Claim {
  id: string; claimTextEn: string; claimTextFr: string; fromMonograph: boolean;
  monographName: string; claimType: string; selected: boolean;
}

export default function ClaimsEditor({
  appId, claims, applicationClass, isEditable, onReload,
}: {
  appId: string; claims: Claim[]; applicationClass: string; isEditable: boolean; onReload: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [newClaimEn, setNewClaimEn] = useState("");
  const [newClaimFr, setNewClaimFr] = useState("");

  const toggleClaim = async (id: string, selected: boolean) => {
    await fetch(`/api/applications/${appId}/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected }),
    });
    await onReload();
  };

  const addClaim = async () => {
    if (!newClaimEn.trim()) return;
    await fetch(`/api/applications/${appId}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimTextEn: newClaimEn, claimTextFr: newClaimFr, fromMonograph: false, claimType: "health" }),
    });
    setNewClaimEn(""); setNewClaimFr(""); setAdding(false);
    await onReload();
  };

  const deleteClaim = async (id: string) => {
    await fetch(`/api/applications/${appId}/claims/${id}`, { method: "DELETE" });
    await onReload();
  };

  const selectedClaims = claims.filter(c => c.selected);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Health Claims ({selectedClaims.length} selected)</h3>
          {isEditable && (
            <button onClick={() => setAdding(true)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              + Add Custom Claim
            </button>
          )}
        </div>

        {applicationClass !== "III" && claims.some(c => c.fromMonograph) && (
          <p className="text-xs text-blue-600 mb-3">
            Monograph claims shown below. For Class {applicationClass}, use exact monograph wording — do not paraphrase.
          </p>
        )}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {claims.map(claim => (
            <div key={claim.id} className={`flex items-start gap-3 px-5 py-3 ${!claim.selected ? "opacity-50" : ""}`}>
              {isEditable && (
                <input type="checkbox" checked={claim.selected} onChange={e => toggleClaim(claim.id, e.target.checked)}
                  className="mt-1 rounded text-red-600" />
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-900">{claim.claimTextEn}</p>
                {claim.claimTextFr && <p className="text-sm text-gray-500 italic mt-0.5">{claim.claimTextFr}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {claim.fromMonograph && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">From: {claim.monographName}</span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{claim.claimType}</span>
                </div>
              </div>
              {isEditable && !claim.fromMonograph && (
                <button onClick={() => deleteClaim(claim.id)} className="text-xs text-red-600 hover:text-red-800 font-medium mt-1">Delete</button>
              )}
            </div>
          ))}
          {claims.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              No claims yet. Run AI Research to get monograph claims, or add custom claims.
            </div>
          )}
        </div>
      </div>

      {adding && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">New Custom Claim</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">English *</label>
              <textarea value={newClaimEn} onChange={e => setNewClaimEn(e.target.value)} rows={2}
                placeholder="e.g., Helps support cardiovascular health."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500">French (optional — AI can translate later)</label>
              <textarea value={newClaimFr} onChange={e => setNewClaimFr(e.target.value)} rows={2}
                placeholder="e.g., Aide à soutenir la santé cardiovasculaire."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addClaim} disabled={!newClaimEn.trim()}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">Add Claim</button>
          </div>
        </div>
      )}
    </div>
  );
}
