"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import HelpPanel from "@/components/HelpPanel";
import { DOC_LABELS } from "@/lib/constants/doc-labels";
import ReadinessScore from "@/components/ReadinessScore";
import IngredientTable from "@/components/ingredients/IngredientTable";
import NonMedTable from "@/components/ingredients/NonMedTable";
import ClaimsEditor from "@/components/claims/ClaimsEditor";
import DosageEditor from "@/components/dosage/DosageEditor";
import RiskEditor from "@/components/risk/RiskEditor";

// Types
interface MedIngredient {
  id: string; properName: string; commonName: string; scientificName: string;
  casNumber: string; quantity: number; quantityUnit: string; potency: number | null;
  potencyUnit: string; standardization: string; sourceMaterial: string; organismPart: string;
  extractType: string; extractSolvent: string; extractRatio: string; driedHerbEquiv: string;
  syntheticFlag: boolean; nanomaterialFlag: boolean; animalTissueFlag: boolean; animalSource: string;
  monographName: string; monographCompliant: boolean; supplierName: string; coaReference: string;
  sortOrder: number;
}
interface NonMedIngredient {
  id: string; ingredientName: string; purpose: string; quantity: number | null;
  unit: string; animalTissueFlag: boolean; nanomaterialFlag: boolean; sortOrder: number;
}
interface Claim {
  id: string; claimTextEn: string; claimTextFr: string; fromMonograph: boolean;
  monographName: string; claimType: string; selected: boolean; sortOrder: number;
}
interface DosGroup {
  id: string; population: string; ageRangeMin: number | null; ageRangeMax: number | null;
  minDose: number | null; maxDose: number | null; doseUnit: string;
  frequency: string; directions: string; withFood: boolean;
}
interface Risk {
  id: string; riskType: string; textEn: string; textFr: string;
  fromMonograph: boolean; monographName: string;
}
interface Doc {
  id: string; documentType: string; status: string; content: string;
}
interface AppData {
  id: string; productName: string; brandName: string; applicationClass: string;
  applicationType: string; status: string; dosageForm: string; routeOfAdmin: string;
  productConcept: string; classReasoning: string; animalTissue: boolean;
  durationOfUse: string; version: number;
  medicinalIngredients: MedIngredient[];
  nonMedicinalIngredients: NonMedIngredient[];
  claims: Claim[];
  dosageGroups: DosGroup[];
  riskInfos: Risk[];
  documents: Doc[];
  createdBy: { name: string };
}

const TABS = [
  { key: "overview", label: "Overview", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "ingredients", label: "Medicinal Ingredients", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { key: "nonmed", label: "Non-Medicinal", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { key: "claims", label: "Claims & Directions", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "risk", label: "Risk Information", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" },
  { key: "documents", label: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "package", label: "Package & Submit", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
];


const dosageForms = ["Capsule", "Tablet", "Softgel", "Liquid", "Powder", "Chewable Tablet", "Lozenge", "Cream", "Spray", "Drops"];
const routes = ["Oral", "Topical", "Sublingual", "Nasal", "Inhalation"];

export default function ApplicationEditor({
  user,
  application: initialApp,
}: {
  user: { id: string; name: string; role: string; username: string };
  application: AppData;
  company: Record<string, unknown> | null;
}) {
  const [app, setApp] = useState(initialApp);
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const isEditable = user.role !== "viewer";
  const docImportRef = useRef<HTMLInputElement>(null);

  // Sync editContent when app.documents changes (after save/regenerate/approve)
  useEffect(() => {
    if (activeDocId) {
      const current = app.documents.find((d) => d.id === activeDocId);
      if (current) setEditContent(current.content);
    }
  }, [app, activeDocId]);

  // Reload application data from server
  const reload = useCallback(async () => {
    const res = await fetch(`/api/applications/${app.id}`);
    if (res.ok) {
      const data = await res.json();
      setApp(data);
    }
  }, [app.id]);

  // Update application fields
  const updateApp = async (fields: Record<string, unknown>) => {
    setSaving(true);
    await fetch(`/api/applications/${app.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, version: app.version }),
    });
    await reload();
    setSaving(false);
  };

  // AI Research
  const runResearch = async () => {
    setResearching(true);
    const res = await fetch(`/api/applications/${app.id}/research`, { method: "POST" });
    if (res.ok) {
      const result = await res.json();
      // Add ingredients from research to table (not replace)
      for (const ing of result.ingredients) {
        await fetch(`/api/applications/${app.id}/ingredients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            properName: ing.properName, commonName: ing.commonName,
            scientificName: ing.scientificName, quantity: ing.suggestedDose,
            quantityUnit: ing.doseRange?.unit || "mg", monographName: ing.monographName || "",
            monographCompliant: ing.monographCovered, animalTissueFlag: ing.animalDerived,
            animalSource: ing.animalSource || "",
          }),
        });
      }
      // Add claims from research
      if (result.suggestedClaims?.length > 0) {
        await fetch(`/api/applications/${app.id}/claims`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.suggestedClaims.map((c: string) => ({
            claimTextEn: c, fromMonograph: true, monographName: result.ingredients[0]?.monographName || "",
          }))),
        });
      }
      // Add risk info from research warnings
      if (result.warnings?.length > 0) {
        await fetch(`/api/applications/${app.id}/risk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.warnings.map((w: string) => ({
            riskType: "caution", textEn: w, fromMonograph: false,
          }))),
        });
      }
      await reload();
    }
    setResearching(false);
  };

  // Auto-detect class
  const detectedClass = (() => {
    const ings = app.medicinalIngredients;
    if (ings.length === 0) return { class: "I", reason: "No ingredients yet" };
    const allMonographed = ings.every(i => i.monographCompliant);
    const monographs = [...new Set(ings.map(i => i.monographName).filter(Boolean))];
    if (!allMonographed) return { class: "III", reason: "Some ingredients have no monograph coverage" };
    if (monographs.length === 1) return { class: "I", reason: `All ingredients covered by "${monographs[0]}" monograph` };
    return { class: "II", reason: `Ingredients covered by ${monographs.length} monographs: ${monographs.join(", ")}` };
  })();

  // Generate document
  const generateDoc = async (documentType: string) => {
    setGenerating(documentType);
    await fetch(`/api/applications/${app.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType }),
    });
    await reload();
    setGenerating(null);
  };

  // Generate all documents
  const generateAllDocs = async () => {
    // First create document records if they don't exist
    if (app.documents.length === 0) {
      // Trigger ingredient confirmation to create docs
      const docTypes = getRequiredDocTypes(detectedClass.class, app.animalTissue);
      for (const dt of docTypes) {
        await fetch(`/api/applications/${app.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentType: dt }),
        });
      }
    } else {
      for (const doc of app.documents) {
        if (doc.status === "pending" || doc.status === "draft") {
          await generateDoc(doc.documentType);
        }
      }
    }
    await reload();
  };

  const approveDoc = async (docId: string) => {
    await fetch(`/api/applications/${app.id}/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    await reload();
  };

  const saveDocEdits = async () => {
    if (!activeDocId) return;
    await fetch(`/api/applications/${app.id}/documents/${activeDocId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    await reload();
  };

  const exportPackage = async () => {
    const res = await fetch(`/api/applications/${app.id}/export`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`Package exported to: ${data.exportPath}`);
      await reload();
    }
  };

  // Readiness data
  const readiness = {
    hasIngredients: app.medicinalIngredients.length > 0,
    hasNonMed: app.nonMedicinalIngredients.length > 0,
    hasClaims: app.claims.filter(c => c.selected).length > 0,
    hasDosage: app.dosageGroups.length > 0,
    hasRisk: app.riskInfos.length > 0,
    hasDosageForm: !!app.dosageForm,
    allDocsGenerated: app.documents.length > 0 && app.documents.every(d => d.status !== "pending"),
    allDocsApproved: app.documents.length > 0 && app.documents.every(d => d.status === "approved"),
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />
      <HelpPanel stepName={TABS.find(t => t.key === activeTab)?.label} />

      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{app.productName}</h2>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                detectedClass.class === "I" ? "bg-green-100 text-green-800" :
                detectedClass.class === "II" ? "bg-blue-100 text-blue-800" :
                "bg-orange-100 text-orange-800"
              }`}>Class {detectedClass.class}</span>
              <span className={`px-2.5 py-1 text-xs rounded-full ${
                app.status === "draft" ? "bg-gray-100 text-gray-600" :
                app.status === "finalized" ? "bg-indigo-100 text-indigo-700" :
                app.status === "submitted" ? "bg-orange-100 text-orange-700" :
                "bg-green-100 text-green-700"
              }`}>{app.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{detectedClass.reason}</p>
          </div>
          <div className="flex gap-2">
            {isEditable && (
              <button onClick={runResearch} disabled={researching}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {researching ? "Researching..." : "AI Research"}
              </button>
            )}
            {saving && <span className="text-xs text-gray-400 self-center">Saving...</span>}
          </div>
        </div>

        {/* Readiness Score */}
        <ReadinessScore readiness={readiness} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-red-600 text-red-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              {tab.label}
              {tab.key === "ingredients" && app.medicinalIngredients.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{app.medicinalIngredients.length}</span>
              )}
              {tab.key === "documents" && app.documents.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {app.documents.filter(d => d.status === "approved").length}/{app.documents.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Product Name</label>
                  <input type="text" value={app.productName} disabled={!isEditable}
                    onChange={e => setApp({...app, productName: e.target.value})}
                    onBlur={() => updateApp({ productName: app.productName })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Brand Name</label>
                  <input type="text" value={app.brandName} disabled={!isEditable}
                    onChange={e => setApp({...app, brandName: e.target.value})}
                    onBlur={() => updateApp({ brandName: app.brandName })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Dosage Form</label>
                    <select value={app.dosageForm} disabled={!isEditable}
                      onChange={e => { setApp({...app, dosageForm: e.target.value}); updateApp({ dosageForm: e.target.value }); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mt-1">
                      <option value="">Select...</option>
                      {dosageForms.map(df => <option key={df} value={df}>{df}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Route</label>
                    <select value={app.routeOfAdmin} disabled={!isEditable}
                      onChange={e => { setApp({...app, routeOfAdmin: e.target.value}); updateApp({ routeOfAdmin: e.target.value }); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mt-1">
                      {routes.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Duration of Use</label>
                  <input type="text" value={app.durationOfUse} disabled={!isEditable}
                    onChange={e => setApp({...app, durationOfUse: e.target.value})}
                    onBlur={() => updateApp({ durationOfUse: app.durationOfUse })}
                    placeholder="e.g., No specific duration established"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mt-1" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Concept / Notes</h3>
              <textarea value={app.productConcept} disabled={!isEditable} rows={8}
                onChange={e => setApp({...app, productConcept: e.target.value})}
                onBlur={() => updateApp({ productConcept: app.productConcept })}
                placeholder="Describe what you want this product to do..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none" />
              {app.classReasoning && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-800">AI Class Reasoning</p>
                  <p className="text-xs text-blue-700 mt-1">{app.classReasoning}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ingredients" && (
          <IngredientTable appId={app.id} ingredients={app.medicinalIngredients}
            isEditable={isEditable} onReload={reload} />
        )}

        {activeTab === "nonmed" && (
          <NonMedTable appId={app.id} items={app.nonMedicinalIngredients}
            dosageForm={app.dosageForm} isEditable={isEditable} onReload={reload} />
        )}

        {activeTab === "claims" && (
          <ClaimsEditor appId={app.id} claims={app.claims}
            applicationClass={detectedClass.class} isEditable={isEditable} onReload={reload} />
        )}

        {activeTab === "risk" && (
          <RiskEditor appId={app.id} risks={app.riskInfos}
            isEditable={isEditable} onReload={reload} />
        )}

        {activeTab === "documents" && (() => {
          const activeDocObj = app.documents.find((d) => d.id === activeDocId);
          const handleDocImport = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setEditContent(reader.result as string);
            reader.readAsText(file);
            e.target.value = "";
          };
          const handleDocDiscard = () => {
            if (activeDocObj) setEditContent(activeDocObj.content);
          };
          return (
          <div className="flex flex-col lg:flex-row gap-6">
            <input ref={docImportRef} type="file" accept=".html,.htm,.txt" className="hidden" onChange={handleDocImport} />
            <div className="w-full lg:w-80 shrink-0 space-y-1.5">
              <div className="flex gap-2 mb-3">
                <button onClick={generateAllDocs} disabled={!!generating}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {generating ? `Generating...` : "Generate All"}
                </button>
                {app.documents.some((d) => d.content) && (
                  <a href={`/api/applications/${app.id}/export-pdf`}
                    className="px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                    </svg>
                    All PDF
                  </a>
                )}
              </div>
              {app.documents.map(doc => (
                <button key={doc.id}
                  onClick={() => { setActiveDocId(doc.id); setEditContent(doc.content); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    activeDocId === doc.id ? "border-blue-500 bg-blue-50" : "border-transparent bg-white hover:bg-gray-50"
                  }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{DOC_LABELS[doc.documentType] || doc.documentType}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.content && (
                        <a href={`/api/applications/${app.id}/export-pdf?docType=${doc.documentType}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors" title="Download PDF">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </a>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        doc.status === "approved" ? "bg-green-100 text-green-700" :
                        doc.status === "draft" ? "bg-blue-100 text-blue-700" :
                        doc.status === "generating" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{generating === doc.documentType ? "generating..." : doc.status}</span>
                    </div>
                  </div>
                </button>
              ))}
              {app.documents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Add ingredients first, then generate documents</p>
              )}
            </div>
            <div className="flex-1 bg-white rounded-xl border border-gray-200 min-h-[600px] max-h-[80vh] flex flex-col">
              {activeDocId && activeDocObj ? (
                <>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {DOC_LABELS[activeDocObj.documentType] || "Document"}
                    </span>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button onClick={handleDocDiscard} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 font-medium">Discard</button>
                      <button onClick={() => docImportRef.current?.click()} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Import</button>
                      <button onClick={saveDocEdits} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Save</button>
                      <a href={`/api/applications/${app.id}/export-pdf?docType=${activeDocObj.documentType}`}
                        className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                        </svg>
                        PDF
                      </a>
                      <button onClick={() => generateDoc(activeDocObj.documentType)}
                        className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">Regenerate</button>
                      <button onClick={() => approveDoc(activeDocId)}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Approve</button>
                    </div>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto">
                    <div className="prose prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-50"
                      dangerouslySetInnerHTML={{ __html: editContent }} />
                    <details className="mt-6 border-t border-gray-100 pt-4">
                      <summary className="text-xs text-gray-500 cursor-pointer font-medium">Edit Raw HTML</summary>
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono text-gray-800 bg-gray-50 h-64 resize-y" />
                    </details>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  Select a document to preview, edit, or generate
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {activeTab === "package" && (
          <div className="max-w-3xl space-y-6">
            <div className={`rounded-xl border p-6 ${readiness.allDocsApproved ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <h3 className="font-semibold text-lg mb-3">
                {readiness.allDocsApproved ? "Ready to Export" : "Not Ready — Review Checklist"}
              </h3>
              {app.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 text-sm py-1">
                  {doc.status === "approved" ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>
                  )}
                  <span className={doc.status === "approved" ? "text-green-800" : "text-gray-600"}>
                    {DOC_LABELS[doc.documentType] || doc.documentType}
                  </span>
                </div>
              ))}
            </div>
            {readiness.allDocsApproved && (
              <button onClick={exportPackage} className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700">
                Export Submission Package
              </button>
            )}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Submit via ePost Connect</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Log into ePost Connect as a registered Trading Partner</li>
                <li>Open conversation: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">nhpsn.epostel.applications</code></li>
                <li>Attach PLA Form (.html) as primary document</li>
                <li>Attach all supporting documents</li>
                <li>Send and save tracking number</li>
              </ol>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700"><strong>Critical:</strong> Submit PLA as .html — NOT PDF. PDF submissions are automatically refused.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getRequiredDocTypes(applicationClass: string, hasAnimalTissue: boolean): string[] {
  const base = ["pla_form", "cover_letter", "label_en", "label_fr", "ingredient_specs", "non_med_list", "senior_attestation"];
  if (applicationClass === "I") base.push("monograph_attestation");
  if (applicationClass === "II" || applicationClass === "III") base.push("fps_form", "safety_report", "efficacy_report");
  if (applicationClass === "III") base.push("quality_chemistry_report");
  if (hasAnimalTissue) base.push("animal_tissue_form");
  return base;
}
