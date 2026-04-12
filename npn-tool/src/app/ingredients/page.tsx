"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import HelpPanel from "@/components/HelpPanel";

interface Ingredient {
  id: string; nhpidId: string | null; nhpidName: string; ingredientType: string;
  properNameEn: string; commonNameEn: string; scientificName: string;
  casNumber: string; category: string; molecularFormula: string;
  organismType: string; genus: string; species: string; grasStatus: string;
  importedFrom: string; status: string;
}

export default function IngredientsPage() {
  const [user, setUser] = useState<{ id: string; name: string; role: string; username: string } | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(setUser).catch(() => { window.location.href = "/login"; });
  }, []);

  const loadIngredients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", "100");
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
    // Parse CSV
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

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />
      <HelpPanel stepName="Ingredient Knowledge Base" stepDescription="Central database of all ingredients with regulatory data, safety info, monograph links, and supplier records." />

      <main className="flex-1 ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ingredient Knowledge Base</h2>
            <p className="text-sm text-gray-500 mt-1">{total} ingredients · Search, import, export, manage</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Import CSV
            </button>
            <button onClick={exportCSV}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
              Export CSV
            </button>
            <a href="/api/ingredients/export?format=csv" download className="hidden">export</a>
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

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, CAS number, scientific name..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Types</option>
            <option value="medicinal">Medicinal</option>
            <option value="non_medicinal">Non-Medicinal</option>
            <option value="homeopathic">Homeopathic</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Proper Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Common Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Scientific Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">CAS</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Source</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : ingredients.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No ingredients. Import from CSV or Health Canada datasets.
                </td></tr>
              ) : ingredients.map(ing => (
                <tr key={ing.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ing.properNameEn || ing.nhpidName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ing.commonNameEn}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 italic">{ing.scientificName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{ing.casNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ing.ingredientType === "medicinal" ? "bg-blue-100 text-blue-700" :
                      ing.ingredientType === "non_medicinal" ? "bg-gray-100 text-gray-600" :
                      "bg-purple-100 text-purple-700"
                    }`}>{ing.ingredientType}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{ing.importedFrom}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteIngredient(ing.id, ing.properNameEn || ing.nhpidName)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
