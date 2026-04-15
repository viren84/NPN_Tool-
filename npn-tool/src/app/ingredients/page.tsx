"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import HelpPanel from "@/components/HelpPanel";

interface Ingredient {
  id: string; nhpidId: string | null; nhpidName: string; ingredientType: string;
  properNameEn: string; properNameFr: string; commonNameEn: string; commonNameFr: string;
  scientificName: string; casNumber: string; category: string; subCategory: string;
  molecularFormula: string; molecularWeight: number | null;
  organismType: string; genus: string; species: string; family: string;
  grasStatus: string; status: string;
  importedFrom: string;
  regulatoryStatusJson: string;
  safetyDataJson: string; dosingDataJson: string; suppliersJson: string;
  notes: string;
}

interface Usage {
  licences: Array<{ id: string; licenceNumber: string; productName: string; productStatus: string }>;
  applications: Array<{ id: string; productName: string; status: string; applicationClass: string }>;
  products: Array<{ id: string; name: string; stage: string }>;
  totals: { licences: number; applications: number; products: number };
}

function safeParse<T>(json: string, fallback: T): T {
  try { const p = JSON.parse(json || ""); return p ?? fallback; } catch { return fallback; }
}

export default function IngredientsPage() {
  const [user, setUser] = useState<{ id: string; name: string; role: string; username: string } | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [usageMap, setUsageMap] = useState<Record<string, Usage>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(setUser).catch(() => { window.location.href = "/login"; });
  }, []);

  const loadIngredients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", "500");
    const res = await fetch(`/api/ingredients?${params}`);
    if (res.ok) {
      const data = await res.json();
      setIngredients(data.ingredients);
      setTotal(data.total);
    }
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { loadIngredients(); }, [loadIngredients]);

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
    const res = await fetch("/api/ingredients/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "csv_rows", data: rows }),
    });
    if (res.ok) {
      const result = await res.json();
      setImportResult(result);
      await loadIngredients();
    }
    setImporting(false);
  };

  const exportCSV = () => {
    window.open("/api/ingredients/export?format=csv", "_blank");
  };

  const deleteIngredient = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from knowledge base?`)) return;
    await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
    await loadIngredients();
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Lazy-load usage
    if (!usageMap[id]) {
      const r = await fetch(`/api/ingredients/${id}/usage`);
      if (r.ok) {
        const usage = await r.json();
        setUsageMap(prev => ({ ...prev, [id]: usage }));
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  if (!user) return null;

  const filtered = ingredients.filter(ing => {
    if (sourceFilter && ing.importedFrom !== sourceFilter) return false;
    return true;
  });

  const sourceCounts = ingredients.reduce((acc, ing) => {
    const src = ing.importedFrom || "manual";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />
      <HelpPanel stepName="Ingredient Knowledge Base" stepDescription="Central database of all ingredients with regulatory data, safety info, monograph links, and supplier records. Auto-populated from LNHPD syncs." />

      <main className="flex-1 p-6 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ingredient Knowledge Base</h2>
            <p className="text-sm text-gray-500 mt-1">
              {total} ingredients
              {Object.keys(sourceCounts).length > 0 && " · "}
              {Object.entries(sourceCounts).map(([src, count]) => (
                <span key={src} className="ml-2 text-xs">
                  <span className="font-medium">{count}</span> {src}
                </span>
              ))}
            </p>
          </div>
          <div className="flex gap-2">
            {selected.size >= 2 && selected.size <= 5 && (
              <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium">
                Compare Selected ({selected.size})
              </button>
            )}
            <button onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Import CSV
            </button>
            <button onClick={exportCSV}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
              Export CSV
            </button>
          </div>
        </div>

        {/* Import Panel */}
        {showImport && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Import Ingredients from CSV</h3>
            <p className="text-xs text-gray-500 mb-3">
              Headers: nhpidId, nhpidName, ingredientType, properNameEn, properNameFr, commonNameEn, commonNameFr, scientificName, casNumber, molecularFormula, category, organismType, genus, species, family, grasStatus
            </p>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={6}
              placeholder="Paste CSV data here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono mb-3 resize-y" />
            <div className="flex items-center gap-3">
              <button onClick={handleImport} disabled={importing || !csvText.trim()}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                {importing ? "Importing..." : "Import"}
              </button>
              {importResult && (
                <span className="text-sm text-green-700">
                  Imported {importResult.created}, skipped {importResult.skipped}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, CAS number, scientific name..."
            className="flex-1 min-w-[280px] px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Types</option>
            <option value="medicinal">Medicinal</option>
            <option value="non_medicinal">Non-Medicinal</option>
            <option value="homeopathic">Homeopathic</option>
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Sources</option>
            <option value="nhpid">NHPID</option>
            <option value="lnhpd">LNHPD (from products)</option>
            <option value="manual">Manual</option>
            <option value="csv">CSV Import</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(i => selected.has(i.id))}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set(filtered.map(i => i.id).slice(0, 5)));
                      else setSelected(new Set());
                    }}
                    className="w-4 h-4 rounded border-gray-300" />
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Scientific</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">CAS</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Source</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No ingredients. Sync an Active Licence to auto-populate from LNHPD, or import from CSV.
                </td></tr>
              ) : filtered.map(ing => {
                const isExpanded = expandedId === ing.id;
                const isSelected = selected.has(ing.id);
                const usage = usageMap[ing.id];
                const reg = safeParse<Record<string, unknown>>(ing.regulatoryStatusJson, {});
                const safety = safeParse<Record<string, string>[]>(ing.safetyDataJson, []);
                const dosing = safeParse<Record<string, string>[]>(ing.dosingDataJson, []);
                const suppliers = safeParse<Record<string, string>[]>(ing.suppliersJson, []);
                return (
                  <>
                    <tr key={ing.id}
                      onClick={() => toggleExpand(ing.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-purple-50" : isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                      <td className="w-10 px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ing.id)}
                          disabled={!isSelected && selected.size >= 5}
                          className="w-4 h-4 rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{ing.properNameEn || ing.nhpidName}</p>
                            {ing.commonNameEn && ing.commonNameEn !== ing.properNameEn && (
                              <p className="text-xs text-gray-500">{ing.commonNameEn}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 italic">{ing.scientificName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{ing.casNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ing.ingredientType === "medicinal" ? "bg-blue-100 text-blue-700" :
                          ing.ingredientType === "non_medicinal" ? "bg-gray-100 text-gray-600" :
                          "bg-purple-100 text-purple-700"
                        }`}>{ing.ingredientType}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${
                          ing.importedFrom === "lnhpd" ? "bg-green-100 text-green-700" :
                          ing.importedFrom === "nhpid" ? "bg-blue-100 text-blue-700" :
                          ing.importedFrom === "csv" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{ing.importedFrom || "manual"}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 justify-end">
                          <a href={`/ingredients/${ing.id}`} target="_blank" rel="noopener noreferrer"
                            title="Open in new tab"
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">Open ↗</a>
                          <button onClick={() => deleteIngredient(ing.id, ing.properNameEn || ing.nhpidName)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={ing.id + "-exp"} className="bg-blue-50/40">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Identity */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="font-semibold text-sm text-gray-900 mb-3">Identity</h4>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Proper Name (EN)</span><span className="text-gray-900">{ing.properNameEn || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Proper Name (FR)</span><span className="text-gray-900">{ing.properNameFr || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Common (EN)</span><span className="text-gray-900">{ing.commonNameEn || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Scientific</span><span className="text-gray-900 italic">{ing.scientificName || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">CAS Number</span><span className="text-gray-900 font-mono">{ing.casNumber || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">NHPID ID</span><span className="text-gray-900 font-mono">{ing.nhpidId || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Molecular Formula</span><span className="text-gray-900 font-mono">{ing.molecularFormula || "—"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="text-gray-900">{ing.category || "—"}</span></div>
                                {ing.genus && <div className="flex justify-between"><span className="text-gray-500">Taxonomy</span><span className="text-gray-900 italic">{ing.genus} {ing.species}</span></div>}
                              </div>
                            </div>

                            {/* Regulatory Status */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="font-semibold text-sm text-gray-900 mb-3">Regulatory Status</h4>
                              {Object.keys(reg).length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No multi-jurisdiction data. Source: {ing.importedFrom}</p>
                              ) : (
                                <div className="space-y-1.5 text-xs">
                                  {Object.entries(reg).map(([jurisdiction, status]) => (
                                    <div key={jurisdiction} className="flex justify-between">
                                      <span className="text-gray-500 capitalize">{jurisdiction}</span>
                                      <span className="text-gray-900">{String(status)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {ing.grasStatus && (
                                <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                                  <span className="text-gray-500">GRAS: </span>
                                  <span className="text-gray-900">{ing.grasStatus}</span>
                                </div>
                              )}
                            </div>

                            {/* Safety */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="font-semibold text-sm text-gray-900 mb-3">Safety</h4>
                              {safety.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No safety data recorded. Add via manual edit or AI research.</p>
                              ) : (
                                <ul className="space-y-1 text-xs">
                                  {safety.slice(0, 5).map((s, i) => (
                                    <li key={i} className="text-gray-700">• {String(s.text || s.note || JSON.stringify(s))}</li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Dosing */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="font-semibold text-sm text-gray-900 mb-3">Dosing</h4>
                              {dosing.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No dose ranges recorded.</p>
                              ) : (
                                <ul className="space-y-1 text-xs">
                                  {dosing.slice(0, 5).map((d, i) => (
                                    <li key={i} className="text-gray-700">• {String(d.range || d.dose || JSON.stringify(d))}</li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Usage */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4 col-span-2">
                              <h4 className="font-semibold text-sm text-gray-900 mb-3">
                                Used In
                                {usage && <span className="text-gray-400 font-normal ml-2">
                                  {usage.totals.licences} licence{usage.totals.licences === 1 ? "" : "s"},
                                  {" "}{usage.totals.applications} application{usage.totals.applications === 1 ? "" : "s"},
                                  {" "}{usage.totals.products} product{usage.totals.products === 1 ? "" : "s"}
                                </span>}
                              </h4>
                              {!usage ? (
                                <p className="text-xs text-gray-400">Loading usage data...</p>
                              ) : (
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <p className="font-medium text-gray-700 mb-1.5">Active Licences ({usage.totals.licences})</p>
                                    {usage.licences.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                                      <ul className="space-y-1">
                                        {usage.licences.slice(0, 6).map(l => (
                                          <li key={l.id}><a href="/licences" className="text-blue-600 hover:text-blue-800">NPN {l.licenceNumber}</a> <span className="text-gray-500">{l.productName}</span></li>
                                        ))}
                                        {usage.licences.length > 6 && <li className="text-gray-400">+{usage.licences.length - 6} more</li>}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-700 mb-1.5">PLA Applications ({usage.totals.applications})</p>
                                    {usage.applications.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                                      <ul className="space-y-1">
                                        {usage.applications.slice(0, 6).map(a => (
                                          <li key={a.id}><a href={`/applications/${a.id}`} className="text-blue-600 hover:text-blue-800">{a.productName}</a> <span className="text-gray-500">Class {a.applicationClass}</span></li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-700 mb-1.5">Product Pipeline ({usage.totals.products})</p>
                                    {usage.products.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                                      <ul className="space-y-1">
                                        {usage.products.slice(0, 6).map(p => (
                                          <li key={p.id}><a href={`/products/${p.id}`} className="text-blue-600 hover:text-blue-800">{p.name}</a> <span className="text-gray-500">{p.stage}</span></li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Suppliers */}
                            {suppliers.length > 0 && (
                              <div className="bg-white rounded-lg border border-gray-200 p-4 col-span-2">
                                <h4 className="font-semibold text-sm text-gray-900 mb-3">Suppliers</h4>
                                <ul className="space-y-1 text-xs">
                                  {suppliers.map((s, i) => <li key={i} className="text-gray-700">• {String(s.name || JSON.stringify(s))}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Notes */}
                            {ing.notes && (
                              <div className="bg-white rounded-lg border border-gray-200 p-4 col-span-2">
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Notes</h4>
                                <p className="text-xs text-gray-700">{ing.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
