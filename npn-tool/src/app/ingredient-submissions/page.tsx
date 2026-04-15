"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import HelpPanel from "@/components/HelpPanel";

interface Submission {
  id: string; ingredientName: string; scientificName: string; casNumber: string;
  classification: string; status: string; grasStatus: string;
  nhpidRequestDate: string; nhpidApprovalDate: string;
  createdBy: { name: string }; createdAt: string;
  productStrategies: Array<{ id: string; productName: string; status: string }>;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

// Sample test data — can be loaded for testing. NOT hardcoded into the app.
// In production, all data comes from file uploads and AI extraction.
const SAMPLE_TEST_DATA = {
  ingredientName: "Geranylgeraniol",
  scientificName: "Bixa orellana L.",
  casNumber: "24034-73-9",
  molecularFormula: "C20H34O",
  molecularWeight: 290.48,
  classification: "medicinal",
  schedule: "schedule_1_plant",
  sourceOrganism: "Annatto",
  sourceOrganismLatin: "Bixa orellana L.",
  sourcePart: "seed",
  extractionMethod: "Molecular distillation (MDAO80)",
  proposedProperName: "Geranylgeraniol",
  proposedCommonName: "GG",
  grasStatus: "self_affirmed",
  otherJurisdictions: { usa: "GRAS self-affirmed (American River Nutrition)", eu: "Not listed", australia: "Not listed" },
  evidencePackageJson: [
    { title: "Toxicological evaluation of geranylgeraniol", pmid: "34144118", year: 2021, journal: "J Applied Toxicology", type: "toxicology", summary: "Genotoxicity and oral toxicity evaluated under OECD GLP. GG-Gold 80% (MDAO80). No adverse effects." },
    { title: "Effects of GG on blood safety and sex hormones in healthy adults", pmid: "MDPI-2023", year: 2023, journal: "Medicines (MDPI)", type: "RCT", summary: "66 subjects, dose escalation 150-300mg, 8 weeks. No negative effects on blood panels. First human safety trial." },
    { title: "Oral GG rescues denervation-induced muscle atrophy", pmid: "PMC7652489", year: 2020, journal: "In Vivo", type: "animal", summary: "GG prevented muscle atrophy via suppression of Atrogin-1." },
    { title: "GG role in statin-associated muscle symptoms", pmid: "PMC10691100", year: 2023, journal: "Frontiers Physiology", type: "review", summary: "Comprehensive review of GG's role in mevalonate pathway rescue for statin users." },
    { title: "GG prevents statin-induced skeletal muscle fatigue", pmid: "31491372", year: 2019, journal: "PubMed", type: "animal", summary: "GG prevented muscle fatigue without affecting cardiac or vascular smooth muscle." },
    { title: "Dietary GG and glucose homeostasis/bone health in obese mice", pmid: "PMC8464510", year: 2021, journal: "Nutrition Research", type: "animal", summary: "Improved glucose homeostasis and bone microstructure." },
    { title: "GG in managing bisphosphonate-related osteonecrosis of jaw", pmid: "PMC9114760", year: 2022, journal: "PMC", type: "review", summary: "GG as potential therapeutic for BRONJ." },
    { title: "GG rescue of bone cells from zoledronic acid", pmid: "PMC6343170", year: 2019, journal: "Stem Cells International", type: "in_vitro", summary: "GG activated mevalonate pathway in bone cells treated with bisphosphonates." },
    { title: "Novel function of GG in regulating testosterone production", pmid: "29303051", year: 2018, journal: "PubMed", type: "in_vitro", summary: "GG upregulated StAR protein and testosterone synthesis." },
    { title: "GG supplementation in males with low testosterone", pmid: "ARN-2024", year: 2024, journal: "American River Nutrition", type: "clinical", summary: "Significant increases in total, free, and bioavailable testosterone in low-T subgroup." },
    { title: "GG in hyper-IgD syndrome patients", pmid: "medRxiv-2024", year: 2024, journal: "medRxiv", type: "pilot", summary: "3-month pilot in 3 patients. Improved inflammatory parameters, no liver toxicity." },
    { title: "GG prevents statin cytotoxicity in THP-1 cells", pmid: "PMC2801219", year: 2009, journal: "PMC", type: "in_vitro", summary: "GG rescued macrophages from mevastatin-induced cell death." },
  ],
  precedentIngredientsJson: [
    { nhpidId: "12869", name: "Tocotrienol concentrate", reason: "Same plant source (Bixa orellana/annatto), same discoverer (Dr. Barrie Tan/ARN), same extraction technology" },
    { nhpidId: "3612", name: "gamma-Tocotrienol", reason: "Individual tocotrienol form from same annatto source, already classified as Schedule 1 vitamin" },
  ],
  productStrategies: [
    { productName: "WE GG-Gold 300", productType: "single", dosageForm: "Softgel", dosageAmount: "300mg", proposedClaims: ["Supports CoQ10 biosynthesis", "Supports healthy muscle function", "Source of an antioxidant"], targetTimeline: "14-20 months" },
    { productName: "WE Annatto-E GG", productType: "combination", dosageForm: "Softgel", dosageAmount: "150mg GG + 150mg tocotrienols", combinationIngredients: ["Tocotrienol concentrate"], proposedClaims: ["Source of antioxidant", "Supports cardiovascular health"], targetTimeline: "14-20 months" },
    { productName: "WE GG + CoQ10", productType: "combination", dosageForm: "Softgel", dosageAmount: "150mg GG + 100mg Ubiquinol", combinationIngredients: ["Ubiquinol (CoQ10)"], proposedClaims: ["Supports CoQ10 production", "Supports cellular energy"], targetTimeline: "14-20 months" },
    { productName: "WE GG + K2", productType: "combination", dosageForm: "Softgel", dosageAmount: "150mg GG + 120mcg MK-7", combinationIngredients: ["Vitamin K2 (MK-7)"], proposedClaims: ["Supports bone health", "Supports cardiovascular health"], targetTimeline: "14-20 months" },
  ],
};

export default function IngredientSubmissionsPage() {
  const [user, setUser] = useState<{ id: string; name: string; role: string; username: string } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(setUser).catch(() => { window.location.href = "/login"; });
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    const res = await fetch("/api/ingredient-submissions");
    if (res.ok) setSubmissions(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadSubmissions(); }, []);

  const createFromTemplate = async (template: string) => {
    if (template === "gg") {
      const res = await fetch("/api/ingredient-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SAMPLE_TEST_DATA),
      });
      if (res.ok) {
        const sub = await res.json();
        window.location.href = `/ingredient-submissions/${sub.id}`;
      }
    }
  };

  const createBlank = async () => {
    const res = await fetch("/api/ingredient-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientName: "New Ingredient" }),
    });
    if (res.ok) {
      const sub = await res.json();
      window.location.href = `/ingredient-submissions/${sub.id}`;
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />
      <HelpPanel stepName="NHPID Submissions" stepDescription="Submit new ingredients to Health Canada's NHPID. Track status from draft to approval. Plan product strategies." />

      <main className="flex-1 p-6 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">NHPID Ingredient Submissions</h2>
            <p className="text-sm text-gray-500 mt-1">Submit new ingredients to Health Canada&apos;s NHPID database</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createFromTemplate("gg")}
              className="px-4 py-2 bg-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-300">
              Sample (GG)
            </button>
            <button onClick={createBlank}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              + Blank Submission
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Process:</strong> Submit NHPID Request Form → Health Canada reviews (6-8 weeks) → Ingredient added to NHPID → Then file NPN application.
            You cannot file an NPN for an ingredient that is not in the NHPID.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ingredient</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">CAS</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Classification</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Products Planned</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Created By</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No submissions yet. Click &quot;Load Test Data&quot; to start with Geranylgeraniol, or create a blank submission.
                </td></tr>
              ) : submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/ingredient-submissions/${sub.id}`} className="text-sm font-medium text-gray-900 hover:text-red-600">
                      {sub.ingredientName}
                    </Link>
                    <p className="text-xs text-gray-500 italic">{sub.scientificName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{sub.casNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sub.classification === "medicinal" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}>{sub.classification}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[sub.status] || ""}`}>{sub.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{sub.productStrategies?.length || 0} products</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{sub.createdBy?.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/ingredient-submissions/${sub.id}`} className="text-xs text-blue-600 hover:text-blue-800">Open</Link>
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
