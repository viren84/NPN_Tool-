"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

interface Ingredient {
  id: string; nhpidId: string | null; nhpidName: string; ingredientType: string;
  properNameEn: string; properNameFr: string; commonNameEn: string; commonNameFr: string;
  scientificName: string; casNumber: string; category: string; molecularFormula: string;
  molecularWeight: number | null;
  organismType: string; genus: string; species: string; family: string;
  grasStatus: string; status: string; importedFrom: string;
  regulatoryStatusJson: string; safetyDataJson: string; dosingDataJson: string;
  suppliersJson: string; notes: string;
  createdAt: string; updatedAt: string;
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

function Row({ label, value, mono, italic }: { label: string; value?: string | null; mono?: boolean; italic?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-gray-900 text-right ${mono ? "font-mono" : ""} ${italic ? "italic" : ""}`}>{value}</dd>
    </div>
  );
}

export default function IngredientDetailClient({
  user, ingredient,
}: {
  user: { id: string; name: string; role: string; username: string };
  ingredient: Ingredient;
}) {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch(`/api/ingredients/${ingredient.id}/usage`).then(r => r.ok ? r.json() : null).then(setUsage);
  }, [ingredient.id]);

  const reg = safeParse<Record<string, unknown>>(ingredient.regulatoryStatusJson, {});
  const safety = safeParse<Record<string, string>[]>(ingredient.safetyDataJson, []);
  const dosing = safeParse<Record<string, string>[]>(ingredient.dosingDataJson, []);
  const suppliers = safeParse<Record<string, string>[]>(ingredient.suppliersJson, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 p-6 min-w-0">
        <div className="max-w-5xl">
          <a href="/ingredients" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Knowledge Base
          </a>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{ingredient.properNameEn || ingredient.nhpidName}</h1>
              {ingredient.commonNameEn && ingredient.commonNameEn !== ingredient.properNameEn && (
                <p className="text-lg text-gray-600 mt-1">{ingredient.commonNameEn}</p>
              )}
              {ingredient.scientificName && (
                <p className="text-base text-gray-500 italic mt-1">{ingredient.scientificName}</p>
              )}
            </div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                ingredient.ingredientType === "medicinal" ? "bg-blue-100 text-blue-700" :
                ingredient.ingredientType === "non_medicinal" ? "bg-gray-100 text-gray-600" :
                "bg-purple-100 text-purple-700"
              }`}>{ingredient.ingredientType}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                ingredient.importedFrom === "lnhpd" ? "bg-green-100 text-green-700" :
                ingredient.importedFrom === "nhpid" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>source: {ingredient.importedFrom || "manual"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Identity */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Identity</h3>
              <dl className="space-y-2 text-sm">
                <Row label="Proper Name (EN)" value={ingredient.properNameEn} />
                <Row label="Proper Name (FR)" value={ingredient.properNameFr} />
                <Row label="Common Name (EN)" value={ingredient.commonNameEn} />
                <Row label="Common Name (FR)" value={ingredient.commonNameFr} />
                <Row label="Scientific Name" value={ingredient.scientificName} italic />
                <Row label="CAS Number" value={ingredient.casNumber} mono />
                <Row label="NHPID ID" value={ingredient.nhpidId || ""} mono />
                <Row label="Molecular Formula" value={ingredient.molecularFormula} mono />
                <Row label="Molecular Weight" value={ingredient.molecularWeight ? `${ingredient.molecularWeight} g/mol` : ""} />
                <Row label="Category" value={ingredient.category} />
                {ingredient.genus && <Row label="Taxonomy" value={`${ingredient.genus} ${ingredient.species}${ingredient.family ? ` (${ingredient.family})` : ""}`} italic />}
                {ingredient.organismType && <Row label="Organism Type" value={ingredient.organismType} />}
              </dl>
            </div>

            {/* Regulatory */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Regulatory Status</h3>
              {Object.keys(reg).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No multi-jurisdiction status recorded yet.</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  {Object.entries(reg).map(([j, s]) => <Row key={j} label={j.charAt(0).toUpperCase() + j.slice(1)} value={String(s)} />)}
                </dl>
              )}
              {ingredient.grasStatus && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                  <span className="text-gray-500">GRAS: </span>
                  <span className="text-gray-900 font-medium">{ingredient.grasStatus}</span>
                </div>
              )}
            </div>

            {/* Safety */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Safety</h3>
              {safety.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No safety data recorded.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {safety.map((s, i) => <li key={i} className="text-gray-700 flex gap-2"><span className="text-gray-400">-</span><span>{String(s.text || s.note || JSON.stringify(s))}</span></li>)}
                </ul>
              )}
            </div>

            {/* Dosing */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Dosing</h3>
              {dosing.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No dose ranges recorded.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {dosing.map((d, i) => <li key={i} className="text-gray-700 flex gap-2"><span className="text-gray-400">-</span><span>{String(d.range || d.dose || JSON.stringify(d))}</span></li>)}
                </ul>
              )}
            </div>

            {/* Usage */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2">
              <h3 className="font-semibold text-gray-900 mb-3">
                Used In
                {usage && <span className="text-gray-400 font-normal ml-2 text-sm">
                  {usage.totals.licences} licence{usage.totals.licences === 1 ? "" : "s"},
                  {" "}{usage.totals.applications} application{usage.totals.applications === 1 ? "" : "s"},
                  {" "}{usage.totals.products} product{usage.totals.products === 1 ? "" : "s"}
                </span>}
              </h3>
              {!usage ? <p className="text-sm text-gray-400">Loading...</p> : (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Active Licences</p>
                    {usage.licences.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                      <ul className="space-y-1">
                        {usage.licences.map(l => <li key={l.id}><a href="/licences" className="text-blue-600 hover:text-blue-800">NPN {l.licenceNumber}</a> <span className="text-gray-500">{l.productName}</span></li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-2">PLA Applications</p>
                    {usage.applications.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                      <ul className="space-y-1">
                        {usage.applications.map(a => <li key={a.id}><a href={`/applications/${a.id}`} className="text-blue-600 hover:text-blue-800">{a.productName}</a> <span className="text-gray-500">Class {a.applicationClass}</span></li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Product Pipeline</p>
                    {usage.products.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                      <ul className="space-y-1">
                        {usage.products.map(p => <li key={p.id}><a href={`/products/${p.id}`} className="text-blue-600 hover:text-blue-800">{p.name}</a> <span className="text-gray-500">{p.stage}</span></li>)}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Suppliers */}
            {suppliers.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2">
                <h3 className="font-semibold text-gray-900 mb-3">Suppliers</h3>
                <ul className="space-y-1 text-sm">
                  {suppliers.map((s, i) => <li key={i} className="text-gray-700">- {String(s.name || JSON.stringify(s))}</li>)}
                </ul>
              </div>
            )}

            {/* Notes */}
            {ingredient.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2">
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-700">{ingredient.notes}</p>
              </div>
            )}

            {/* Metadata footer */}
            <div className="text-xs text-gray-400 col-span-2">
              Added {new Date(ingredient.createdAt).toLocaleDateString()} · Last updated {new Date(ingredient.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
