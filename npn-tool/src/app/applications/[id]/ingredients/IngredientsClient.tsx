"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import WizardStepper from "@/components/WizardStepper";

interface Ingredient {
  properName: string;
  commonName: string;
  scientificName: string;
  monographName: string | null;
  monographCovered: boolean;
  doseRange: { min: number; max: number; unit: string };
  suggestedDose: number;
  animalDerived: boolean;
  animalSource?: string;
  approvedClaims: string[];
  reasoning: string;
  selected: boolean;
  editedDose: number;
}

interface ResearchResult {
  recommendedClass: string;
  classReasoning: string;
  ingredients: Ingredient[];
  suggestedClaims: string[];
  warnings: string[];
  precedentProducts: string[];
}

export default function IngredientsClient({
  user,
  application,
}: {
  user: { id: string; name: string; role: string; username: string };
  application: { id: string; productName: string; productConcept: string; applicationClass: string };
}) {
  const router = useRouter();
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const runResearch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${application.id}/research`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Research failed");
      }
      const result = await res.json();
      result.ingredients = result.ingredients.map((ing: Ingredient) => ({
        ...ing,
        selected: true,
        editedDose: ing.suggestedDose,
      }));
      setResearch(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    }
    setLoading(false);
  };

  const toggleIngredient = (index: number) => {
    if (!research) return;
    const updated = { ...research };
    updated.ingredients[index].selected = !updated.ingredients[index].selected;
    setResearch(updated);
  };

  const updateDose = (index: number, dose: number) => {
    if (!research) return;
    const updated = { ...research };
    updated.ingredients[index].editedDose = dose;
    setResearch(updated);
  };

  const confirmIngredients = async () => {
    if (!research) return;
    setSaving(true);

    const selected = research.ingredients.filter((i) => i.selected);
    const res = await fetch(`/api/applications/${application.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredients: selected.map((ing) => ({
          properName: ing.properName,
          commonName: ing.commonName,
          scientificName: ing.scientificName,
          monographName: ing.monographName || "",
          monographCompliant: ing.monographCovered,
          quantity: ing.editedDose,
          quantityUnit: ing.doseRange.unit,
          sourceMaterial: ing.animalSource || "",
        })),
        claims: research.suggestedClaims,
      }),
    });

    if (res.ok) {
      router.push(`/applications/${application.id}/documents`);
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 p-6 min-w-0">
        <div className="max-w-5xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{application.productName}</h2>
            <p className="text-sm text-gray-500 mt-1">Step 2-4 — AI Ingredient Research & Confirmation</p>
          </div>

          <WizardStepper activeStep={1} completedSteps={[0]} />

          {/* Research Button */}
          {!research && !loading && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Research</h3>
              <p className="text-sm text-gray-500 mb-1 max-w-md mx-auto">
                AI will search NHPID monographs and LNHPD licensed products to find the best ingredients and filing strategy.
              </p>
              <p className="text-xs text-gray-400 mb-6">Concept: {application.productConcept.slice(0, 150)}...</p>
              <button
                onClick={runResearch}
                className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Start AI Research
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-600">AI is researching ingredients, checking monographs, and finding precedents...</p>
              <p className="text-xs text-gray-400 mt-1">This may take 15-30 seconds</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={runResearch} className="text-sm text-red-600 underline mt-2">Try again</button>
            </div>
          )}

          {/* Results */}
          {research && (
            <div className="space-y-6">
              {/* Class Recommendation */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                    research.recommendedClass === "I" ? "bg-green-100 text-green-800" :
                    research.recommendedClass === "II" ? "bg-blue-100 text-blue-800" :
                    "bg-orange-100 text-orange-800"
                  }`}>
                    Class {research.recommendedClass}
                  </span>
                  <h3 className="font-semibold text-gray-900">Recommended Application Class</h3>
                </div>
                <p className="text-sm text-gray-600">{research.classReasoning}</p>
              </div>

              {/* Warnings */}
              {research.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
                  {research.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-yellow-700">• {w}</p>
                  ))}
                </div>
              )}

              {/* Ingredients Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Recommended Ingredients</h3>
                  <p className="text-xs text-gray-500 mt-1">Select ingredients and adjust doses. Deselect any you don&apos;t want.</p>
                </div>

                <div className="divide-y divide-gray-50">
                  {research.ingredients.map((ing, i) => (
                    <div key={i} className={`px-6 py-4 ${!ing.selected ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={ing.selected}
                          onChange={() => toggleIngredient(i)}
                          className="mt-1 h-4 w-4 text-red-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">{ing.properName}</span>
                            {ing.monographCovered && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Monograph</span>
                            )}
                            {ing.animalDerived && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">Animal Derived</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {ing.commonName} — <em>{ing.scientificName}</em>
                          </p>
                          {ing.monographName && (
                            <p className="text-xs text-blue-600 mt-0.5">Monograph: {ing.monographName}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{ing.reasoning}</p>

                          {ing.approvedClaims.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 font-medium">Approved claims:</p>
                              {ing.approvedClaims.map((c, j) => (
                                <p key={j} className="text-xs text-gray-600 ml-2">• {c}</p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <label className="text-xs text-gray-500">Dose ({ing.doseRange.unit})</label>
                          <input
                            type="number"
                            value={ing.editedDose}
                            onChange={(e) => updateDose(i, Number(e.target.value))}
                            disabled={!ing.selected}
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right text-gray-900 mt-1"
                          />
                          <p className="text-xs text-gray-400 mt-0.5">
                            Range: {ing.doseRange.min}-{ing.doseRange.max} {ing.doseRange.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Claims */}
              {research.suggestedClaims.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Suggested Health Claims</h3>
                  <p className="text-xs text-gray-500 mb-3">These are exact monograph-approved wording. Use as-is for fastest approval.</p>
                  {research.suggestedClaims.map((claim, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{claim}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Precedents */}
              {research.precedentProducts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Similar Licensed Products (Precedent)</h3>
                  {research.precedentProducts.map((p, i) => (
                    <p key={i} className="text-sm text-gray-600 py-0.5">• {p}</p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={runResearch}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                >
                  Re-run Research
                </button>
                <button
                  onClick={confirmIngredients}
                  disabled={saving || research.ingredients.filter((i) => i.selected).length === 0}
                  className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? "Saving..." : "Confirm Ingredients & Generate Documents"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
