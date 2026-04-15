"use client";

import { useState, useEffect, useCallback } from "react";

interface Competitor {
  id: string; productName: string; brand: string; competitorName: string;
  sourceUrl: string; price: string; dosageForm: string; analysisStatus: string;
  analysisError: string; analyzedAt: string;
  marketingStrategy: string; ingredientsJson: string; reviewSummaryJson: string;
  strengthsJson: string; weaknessesJson: string; opportunitiesJson: string;
}

interface ConditionStack {
  id: string; stackName: string; condition: string; primaryMolecule: string;
  primaryDose: number; primaryUnit: string; moleculesJson: string;
  applicationClass: string; monographCoverage: string; marketPrevalence: number;
  scientificBasis: string; availableClaimsJson: string; selected: boolean;
  aiGenerated: boolean; stackType: string;
}

interface AISession {
  id: string; researchType: string; promptSummary: string; responseJson: string;
  status: string; createdAt: string;
}

function jp(s: string): unknown[] { try { const p = JSON.parse(s || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } }

export default function ResearchTab({ productId, isEditable }: { productId: string; isEditable: boolean }) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [stacks, setStacks] = useState<ConditionStack[]>([]);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingComp, setAddingComp] = useState(false);
  const [discoveringStacks, setDiscoveringStacks] = useState(false);
  const [compForm, setCompForm] = useState({ sourceUrl: "", productName: "", competitorName: "", pastedContent: "" });
  const [stackForm, setStackForm] = useState({ primaryMolecule: "", primaryDose: "", condition: "" });
  const [showCompForm, setShowCompForm] = useState(false);
  const [showStackForm, setShowStackForm] = useState(false);
  const [runningResearch, setRunningResearch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, s, a] = await Promise.all([
        fetch(`/api/products/${productId}/competitors`).then(r => r.ok ? r.json() : []),
        fetch(`/api/products/${productId}/condition-stacks`).then(r => r.ok ? r.json() : []),
        fetch(`/api/products/${productId}/ai-research`).then(r => r.ok ? r.json() : []),
      ]);
      setCompetitors(c); setStacks(s); setSessions(a);
    } catch { setError("Failed to load research data"); }
    setLoading(false);
  }, [productId]);

  useEffect(() => { reload(); }, [reload]);

  const addCompetitor = async () => {
    if (!compForm.productName && !compForm.sourceUrl) return;
    setAddingComp(true);
    setError("");
    try {
      const r = await fetch(`/api/products/${productId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compForm),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "Failed to add competitor"); }
      else { setCompForm({ sourceUrl: "", productName: "", competitorName: "", pastedContent: "" }); setShowCompForm(false); }
    } catch { setError("Network error adding competitor"); }
    setAddingComp(false);
    reload();
  };

  const discoverStacks = async () => {
    if (!stackForm.primaryMolecule) return;
    setDiscoveringStacks(true);
    setError("");
    try {
      const r = await fetch(`/api/products/${productId}/condition-stacks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stackForm,
          primaryDose: parseFloat(stackForm.primaryDose) || 0,
          primaryUnit: "mg",
          aiSuggest: true,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "AI discovery failed"); }
      else setShowStackForm(false);
    } catch { setError("Network error during AI discovery"); }
    setDiscoveringStacks(false);
    reload();
  };

  const runResearch = async (type: string) => {
    setRunningResearch(type);
    setError("");
    try {
      const r = await fetch(`/api/products/${productId}/ai-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchType: type }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || `${type} research failed`); }
    } catch { setError("Network error during research"); }
    setRunningResearch("");
    reload();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">{error}</div>}
      {/* AI Research Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">AI Research</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "condition_research", label: "Research Condition" },
            { type: "market_analysis", label: "Market Analysis" },
            { type: "ingredient_research", label: "Ingredient Research" },
            { type: "monograph_compliance", label: "Monograph Check" },
            { type: "formulation_suggestion", label: "Suggest Formulation" },
          ].map(({ type, label }) => (
            <button key={type} onClick={() => runResearch(type)} disabled={!!runningResearch || !isEditable}
              className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors">
              {runningResearch === type ? "Running..." : label}
            </button>
          ))}
        </div>
      </div>

      {/* Competitors */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Competitors ({competitors.length})</h3>
          {isEditable && (
            <button onClick={() => setShowCompForm(!showCompForm)} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700">
              + Add Competitor
            </button>
          )}
        </div>

        {showCompForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={compForm.productName} onChange={e => setCompForm(f => ({ ...f, productName: e.target.value }))}
                placeholder="Product name" className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900" />
              <input value={compForm.competitorName} onChange={e => setCompForm(f => ({ ...f, competitorName: e.target.value }))}
                placeholder="Brand/company" className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900" />
            </div>
            <input value={compForm.sourceUrl} onChange={e => setCompForm(f => ({ ...f, sourceUrl: e.target.value }))}
              placeholder="Amazon URL or website" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900" />
            <textarea value={compForm.pastedContent} onChange={e => setCompForm(f => ({ ...f, pastedContent: e.target.value }))}
              placeholder="Paste product page content here for AI analysis (optional)..." rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 resize-none" />
            <div className="flex gap-2">
              <button onClick={addCompetitor} disabled={addingComp} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {addingComp ? "Adding..." : "Add"}
              </button>
              <button onClick={() => setShowCompForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}

        {competitors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No competitors added yet</p>
        ) : (
          <div className="space-y-3">
            {competitors.map(c => {
              const reviews = (() => { try { return JSON.parse(c.reviewSummaryJson || "{}"); } catch { return {}; } })() as Record<string, unknown>;
              const strengths = jp(c.strengthsJson) as string[];
              const weaknesses = jp(c.weaknessesJson) as string[];
              return (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.productName || c.competitorName}</p>
                      <p className="text-xs text-gray-500">{c.brand} {c.price && `· ${c.price}`} {c.dosageForm && `· ${c.dosageForm}`}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      c.analysisStatus === "completed" ? "bg-green-100 text-green-700" :
                      c.analysisStatus === "analyzing" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{c.analysisStatus}</span>
                  </div>
                  {c.analysisStatus === "completed" && (
                    <div className="mt-2 space-y-2">
                      {reviews.avgRating ? <p className="text-xs text-gray-600">Rating: {String(reviews.avgRating)}/5 ({String(reviews.totalReviews ?? 0)} reviews)</p> : null}
                      {strengths.length > 0 && <p className="text-xs text-green-600">Strengths: {strengths.slice(0, 2).join(", ")}</p>}
                      {weaknesses.length > 0 && <p className="text-xs text-red-600">Weaknesses: {weaknesses.slice(0, 2).join(", ")}</p>}
                      {c.marketingStrategy && <p className="text-xs text-gray-500 truncate">Strategy: {c.marketingStrategy}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Condition Stacks */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Molecule Stacks ({stacks.length})</h3>
          {isEditable && (
            <button onClick={() => setShowStackForm(!showStackForm)} className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              AI Discover Combinations
            </button>
          )}
        </div>

        {showStackForm && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg space-y-3">
            <p className="text-xs text-purple-700 font-medium">Enter your primary molecule — AI will find all relevant combinations for your target condition</p>
            <div className="grid grid-cols-3 gap-3">
              <input value={stackForm.primaryMolecule} onChange={e => setStackForm(f => ({ ...f, primaryMolecule: e.target.value }))}
                placeholder="Primary molecule (e.g., Ashwagandha)" className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-gray-900" />
              <input value={stackForm.primaryDose} onChange={e => setStackForm(f => ({ ...f, primaryDose: e.target.value }))}
                placeholder="Dose (e.g., 600)" type="number" className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-gray-900" />
              <input value={stackForm.condition} onChange={e => setStackForm(f => ({ ...f, condition: e.target.value }))}
                placeholder="Condition (e.g., stress)" className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-gray-900" />
            </div>
            <div className="flex gap-2">
              <button onClick={discoverStacks} disabled={discoveringStacks || !stackForm.primaryMolecule}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {discoveringStacks ? "AI Discovering..." : "Find Combinations"}
              </button>
              <button onClick={() => setShowStackForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}

        {stacks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No molecule stacks yet. Click &quot;AI Discover Combinations&quot; to find synergistic formulations.</p>
        ) : (
          <div className="space-y-3">
            {stacks.map(s => {
              const molecules = jp(s.moleculesJson) as Array<{ name: string; dose: number; unit: string; role: string; synergyReason?: string }>;
              const claims = jp(s.availableClaimsJson) as string[];
              return (
                <div key={s.id} className={`border rounded-lg p-4 ${s.selected ? "border-purple-400 bg-purple-50" : "border-gray-200"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {s.stackName}
                        {s.aiGenerated && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">AI</span>}
                        {s.selected && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">Selected</span>}
                      </p>
                      <p className="text-xs text-gray-500">{s.condition} · Class {s.applicationClass || "?"} · {s.monographCoverage || "unknown"} coverage</p>
                    </div>
                    {s.marketPrevalence > 0 && <span className="text-xs text-gray-400">{s.marketPrevalence}+ products</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {molecules.map((m, i) => (
                      <span key={i} className={`px-2 py-0.5 text-xs rounded-full ${
                        m.role === "primary" ? "bg-red-100 text-red-700" :
                        m.role === "bioavailability_enhancer" ? "bg-orange-100 text-orange-700" :
                        m.role === "synergistic_pair" ? "bg-blue-100 text-blue-700" :
                        m.role === "cofactor" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`} title={m.synergyReason || m.role}>
                        {m.name} {m.dose}{m.unit}
                      </span>
                    ))}
                  </div>
                  {s.scientificBasis && <p className="text-xs text-gray-500 mb-1">{s.scientificBasis}</p>}
                  {claims.length > 0 && <p className="text-xs text-green-600">Claims: {claims.slice(0, 2).join("; ")}</p>}
                  {isEditable && !s.selected && (
                    <button onClick={async () => {
                      await fetch(`/api/products/${productId}/condition-stacks/${s.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ selected: true }),
                      });
                      reload();
                    }} className="mt-2 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                      Select This Stack
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Research History */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Research History ({sessions.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{s.researchType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-400">{s.promptSummary.slice(0, 80)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${s.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.status}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
