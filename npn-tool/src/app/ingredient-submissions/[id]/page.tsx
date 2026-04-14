"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Study {
  title: string; pmid: string; year: number;
  journal: string; type: string; summary: string;
}
interface Precedent { nhpidId: string; name: string; reason: string; }
interface ProductStrategy {
  id: string; productName: string; productType: string;
  applicationClass: string; dosageForm: string; dosageAmount: string;
  combinationIngredients: string; proposedClaims: string;
  targetTimeline: string; status: string; notes: string; applicationId?: string;
}
interface Submission {
  id: string; status: string;
  ingredientName: string; scientificName: string; casNumber: string;
  molecularFormula: string; molecularWeight: number | null;
  classification: string; schedule: string;
  sourceOrganism: string; sourceOrganismLatin: string; sourcePart: string; extractionMethod: string;
  proposedProperName: string; proposedCommonName: string;
  grasStatus: string; otherJurisdictions: string;
  evidencePackageJson: string; precedentIngredientsJson: string;
  nhpidRequestDate: string; nhpidExpectedDate: string;
  nhpidApprovalDate: string; nhpidId: string;
  notes: string;
  createdBy: { name: string };
  productStrategies: ProductStrategy[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ORDER = ["draft", "submitted", "under_review", "approved", "rejected"];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
const STRATEGY_STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-100 text-gray-600",
  nhpid_pending: "bg-yellow-100 text-yellow-700",
  ready_to_file: "bg-blue-100 text-blue-700",
  filed: "bg-green-100 text-green-700",
};
const STUDY_TYPES = ["toxicology", "RCT", "animal", "in_vitro", "review", "pilot", "clinical", "other"];
const SCHEDULES = ["", "schedule_1_plant", "schedule_1_vitamin", "schedule_1_mineral", "schedule_1_amino_acid", "schedule_1_probiotic", "schedule_2"];
const UNITS = ["mg", "mcg", "g", "mL", "IU", "%", "CFU", "billion CFU"];

interface ComboIngredient {
  properName: string; commonName: string; scientificName: string;
  casNumber: string; amount: string; unit: string;
  isTrademark: boolean; trademarkName: string;
}
const EMPTY_COMBO_ING: ComboIngredient = {
  properName: "", commonName: "", scientificName: "",
  casNumber: "", amount: "", unit: "mg", isTrademark: false, trademarkName: "",
};

function safeJson<T>(val: string, fallback: T): T {
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IngredientSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"overview" | "evidence" | "jurisdictions" | "precedents" | "strategies">("overview");

  // Local editable state (mirrors sub fields)
  const [form, setForm] = useState<Partial<Submission>>({});
  const [studies, setStudies] = useState<Study[]>([]);
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [jurisdictions, setJurisdictions] = useState<{ usa: string; eu: string; australia: string }>({ usa: "", eu: "", australia: "" });
  const [strategies, setStrategies] = useState<ProductStrategy[]>([]);

  // Modal states
  const [showStudyForm, setShowStudyForm] = useState(false);
  const [showPrecedentForm, setShowPrecedentForm] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [newStudy, setNewStudy] = useState<Partial<Study>>({ type: "toxicology", year: new Date().getFullYear() });
  const [newPrecedent, setNewPrecedent] = useState<Partial<Precedent>>({});
  const [newStrategy, setNewStrategy] = useState<Partial<ProductStrategy>>({ productType: "single", applicationClass: "III", status: "planned" });
  const [newStrategyClaims, setNewStrategyClaims] = useState<string[]>([]);
  const [newStrategyClaimInput, setNewStrategyClaimInput] = useState("");
  const [newStrategyCombo, setNewStrategyCombo] = useState<ComboIngredient[]>([]);
  const [showComboIngredientForm, setShowComboIngredientForm] = useState(false);
  const [newComboIng, setNewComboIng] = useState<ComboIngredient>(EMPTY_COMBO_ING);

  // Edit strategy state
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
  const [editStrategy, setEditStrategy] = useState<Partial<ProductStrategy>>({});
  const [editStrategyClaims, setEditStrategyClaims] = useState<string[]>([]);
  const [editStrategyCombo, setEditStrategyCombo] = useState<ComboIngredient[]>([]);
  const [editClaimInput, setEditClaimInput] = useState("");
  const [showEditComboForm, setShowEditComboForm] = useState(false);
  const [editComboIng, setEditComboIng] = useState<ComboIngredient>(EMPTY_COMBO_ING);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(setUser).catch(() => router.push("/login"));
    fetch(`/api/ingredient-submissions/${id}`).then(r => {
      if (!r.ok) { router.push("/ingredient-submissions"); return; }
      return r.json();
    }).then((data: Submission) => {
      if (!data) return;
      setSub(data);
      setForm(data);
      setStudies(safeJson<Study[]>(data.evidencePackageJson, []));
      setPrecedents(safeJson<Precedent[]>(data.precedentIngredientsJson, []));
      setJurisdictions(safeJson<{ usa: string; eu: string; australia: string }>(data.otherJurisdictions, { usa: "", eu: "", australia: "" }));
      setStrategies(data.productStrategies || []);
      setLoading(false);
    });
  }, [id, router]);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const save = async (
    overrides?: Partial<Submission>,
    studiesSnapshot?: Study[],
    precedentsSnapshot?: Precedent[],
    jurisdictionsSnapshot?: { usa: string; eu: string; australia: string }
  ) => {
    setSaving(true);
    const payload = {
      ...form,
      ...overrides,
      evidencePackageJson: JSON.stringify(studiesSnapshot ?? studies),
      precedentIngredientsJson: JSON.stringify(precedentsSnapshot ?? precedents),
      otherJurisdictions: JSON.stringify(jurisdictionsSnapshot ?? jurisdictions),
    };
    const res = await fetch(`/api/ingredient-submissions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setSub(updated);
      setForm(updated);
    }
    setSaving(false);
  };

  const set = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Status progression ────────────────────────────────────────────────────────
  const advanceStatus = async () => {
    const idx = STATUS_ORDER.indexOf(sub?.status || "draft");
    const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 2)]; // can't advance past "approved" via button
    await save({ status: next } as Partial<Submission>);
  };

  // ── Evidence ──────────────────────────────────────────────────────────────────
  const addStudy = async () => {
    if (!newStudy.title?.trim()) return;
    const updated = [...studies, newStudy as Study];
    setStudies(updated);
    setShowStudyForm(false);
    setNewStudy({ type: "toxicology", year: new Date().getFullYear() });
    await save(undefined, updated);
  };
  const removeStudy = async (i: number) => {
    const updated = studies.filter((_, idx) => idx !== i);
    setStudies(updated);
    await save(undefined, updated);
  };

  // ── Precedents ────────────────────────────────────────────────────────────────
  const addPrecedent = async () => {
    if (!newPrecedent.name?.trim()) return;
    const updated = [...precedents, newPrecedent as Precedent];
    setPrecedents(updated);
    setShowPrecedentForm(false);
    setNewPrecedent({});
    await save(undefined, undefined, updated);
  };
  const removePrecedent = async (i: number) => {
    const updated = precedents.filter((_, idx) => idx !== i);
    setPrecedents(updated);
    await save(undefined, undefined, updated);
  };

  // ── Strategies ────────────────────────────────────────────────────────────────
  const addStrategy = async () => {
    if (!newStrategy.productName?.trim()) return;
    const res = await fetch(`/api/ingredient-submissions/${id}/strategies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newStrategy,
        proposedClaims: JSON.stringify(newStrategyClaims),
        combinationIngredients: JSON.stringify(newStrategyCombo),
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setStrategies(prev => [...prev, created]);
      setShowStrategyForm(false);
      setNewStrategy({ productType: "single", applicationClass: "III", status: "planned" });
      setNewStrategyClaims([]);
      setNewStrategyClaimInput("");
      setNewStrategyCombo([]);
      setShowComboIngredientForm(false);
      setNewComboIng(EMPTY_COMBO_ING);
    }
  };
  const removeStrategy = async (sid: string) => {
    await fetch(`/api/ingredient-submissions/${id}/strategies/${sid}`, { method: "DELETE" });
    setStrategies(prev => prev.filter(s => s.id !== sid));
  };
  const advanceStrategyStatus = async (s: ProductStrategy) => {
    const order = ["planned", "nhpid_pending", "ready_to_file", "filed"];
    const idx = order.indexOf(s.status);
    const next = order[Math.min(idx + 1, order.length - 1)];
    const res = await fetch(`/api/ingredient-submissions/${id}/strategies/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      const updated = await res.json();
      setStrategies(prev => prev.map(st => st.id === s.id ? updated : st));
    }
  };

  const startEditStrategy = (s: ProductStrategy) => {
    setEditingStrategyId(s.id);
    setEditStrategy({ ...s });
    setEditStrategyClaims(safeJson<string[]>(s.proposedClaims, []));
    const rawCombo = safeJson<Record<string, unknown>[]>(s.combinationIngredients, []);
    const combo: ComboIngredient[] = rawCombo.map(c =>
      typeof c.properName === "string"
        ? (c as unknown as ComboIngredient)
        : { ...EMPTY_COMBO_ING, properName: String(c.name || ""), amount: String(c.amount || "") }
    );
    setEditStrategyCombo(combo);
    setEditClaimInput("");
    setShowEditComboForm(false);
    setEditComboIng(EMPTY_COMBO_ING);
  };
  const cancelEditStrategy = () => {
    setEditingStrategyId(null);
    setEditStrategy({});
    setEditStrategyClaims([]);
    setEditStrategyCombo([]);
    setEditClaimInput("");
    setShowEditComboForm(false);
    setEditComboIng(EMPTY_COMBO_ING);
  };
  const saveEditStrategy = async () => {
    if (!editingStrategyId) return;
    const res = await fetch(`/api/ingredient-submissions/${id}/strategies/${editingStrategyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editStrategy,
        proposedClaims: JSON.stringify(editStrategyClaims),
        combinationIngredients: JSON.stringify(editStrategyCombo),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setStrategies(prev => prev.map(st => st.id === editingStrategyId ? updated : st));
      cancelEditStrategy();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading || !user) return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center">
      <div className="w-6 h-6 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
    </div>
  );

  const isEditable = user.role !== "viewer";
  const statusIdx = STATUS_ORDER.indexOf(sub?.status || "draft");
  const canAdvance = isEditable && statusIdx < STATUS_ORDER.length - 2; // can't advance past approved

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "evidence", label: `Evidence (${studies.length})` },
    { key: "jurisdictions", label: "Other Jurisdictions" },
    { key: "precedents", label: `Precedents (${precedents.length})` },
    { key: "strategies", label: `Product Strategies (${strategies.length})` },
  ] as const;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/ingredient-submissions" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              NHPID Submissions
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{form.ingredientName || "Untitled Ingredient"}</h1>
            {form.scientificName && <p className="text-sm text-gray-500 italic mt-0.5">{form.scientificName}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[sub?.status || "draft"]}`}>
              {(sub?.status || "draft").replace(/_/g, " ")}
            </span>
            {canAdvance && (
              <button onClick={advanceStatus} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Move to: {STATUS_ORDER[statusIdx + 1].replace(/_/g, " ")}
              </button>
            )}
            {isEditable && (
              <button onClick={() => save()} disabled={saving}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-sm text-blue-800">
          <strong>Process:</strong> Complete this form → Submit NHPID Request to Health Canada → Wait 6-8 weeks → Ingredient added to NHPID → File NPN applications.
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: OVERVIEW ─────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* Identity */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Ingredient Identity</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Ingredient Name *</label>
                  <input value={form.ingredientName || ""} onChange={e => set("ingredientName", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Scientific Name</label>
                  <input value={form.scientificName || ""} onChange={e => set("scientificName", e.target.value)}
                    placeholder="e.g., Bixa orellana L."
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">CAS Number</label>
                  <input value={form.casNumber || ""} onChange={e => set("casNumber", e.target.value)}
                    placeholder="e.g., 24034-73-9"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Molecular Formula</label>
                  <input value={form.molecularFormula || ""} onChange={e => set("molecularFormula", e.target.value)}
                    placeholder="e.g., C20H34O"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Molecular Weight (g/mol)</label>
                  <input type="number" value={form.molecularWeight || ""} onChange={e => set("molecularWeight", e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 290.48"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Classification</label>
                  <select value={form.classification || "medicinal"} onChange={e => set("classification", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="medicinal">Medicinal</option>
                    <option value="non_medicinal">Non-Medicinal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Schedule</label>
                  <select value={form.schedule || ""} onChange={e => set("schedule", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {SCHEDULES.map(s => <option key={s} value={s}>{s || "— Select —"}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Source & Extraction</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Source Organism</label>
                  <input value={form.sourceOrganism || ""} onChange={e => set("sourceOrganism", e.target.value)}
                    placeholder="e.g., Annatto"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Source Organism (Latin)</label>
                  <input value={form.sourceOrganismLatin || ""} onChange={e => set("sourceOrganismLatin", e.target.value)}
                    placeholder="e.g., Bixa orellana L."
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Source Part</label>
                  <input value={form.sourcePart || ""} onChange={e => set("sourcePart", e.target.value)}
                    placeholder="e.g., seed"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-gray-500">Extraction Method</label>
                  <input value={form.extractionMethod || ""} onChange={e => set("extractionMethod", e.target.value)}
                    placeholder="e.g., Molecular distillation (MDAO80)"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* Proposed names + GRAS */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Proposed Names & Regulatory</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Proposed Proper Name</label>
                  <input value={form.proposedProperName || ""} onChange={e => set("proposedProperName", e.target.value)}
                    placeholder="e.g., Geranylgeraniol"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Proposed Common Name</label>
                  <input value={form.proposedCommonName || ""} onChange={e => set("proposedCommonName", e.target.value)}
                    placeholder="e.g., GG"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">GRAS Status</label>
                  <select value={form.grasStatus || ""} onChange={e => set("grasStatus", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Not applicable</option>
                    <option value="self_affirmed">Self-affirmed GRAS</option>
                    <option value="fda_notified">FDA GRAS Notified</option>
                  </select>
                </div>
              </div>
            </div>

            {/* NHPID tracking */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">NHPID Submission Tracking</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Request Date</label>
                  <input type="date" value={form.nhpidRequestDate || ""} onChange={e => set("nhpidRequestDate", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Expected Decision</label>
                  <input type="date" value={form.nhpidExpectedDate || ""} onChange={e => set("nhpidExpectedDate", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Approval Date</label>
                  <input type="date" value={form.nhpidApprovalDate || ""} onChange={e => set("nhpidApprovalDate", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">NHPID Assigned ID</label>
                  <input value={form.nhpidId || ""} onChange={e => set("nhpidId", e.target.value)}
                    placeholder="Assigned after approval"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
              <textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)}
                rows={4} placeholder="Internal notes, context, reminders…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        )}

        {/* ── TAB: EVIDENCE ─────────────────────────────────────────────────────── */}
        {tab === "evidence" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{studies.length} studies in evidence package</p>
              {isEditable && (
                <button onClick={() => setShowStudyForm(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                  + Add Study
                </button>
              )}
            </div>

            {showStudyForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">New Study</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">Title *</label>
                    <input value={newStudy.title || ""} onChange={e => setNewStudy(p => ({ ...p, title: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">PMID / Reference</label>
                    <input value={newStudy.pmid || ""} onChange={e => setNewStudy(p => ({ ...p, pmid: e.target.value }))}
                      placeholder="e.g., 34144118"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Year</label>
                    <input type="number" value={newStudy.year || ""} onChange={e => setNewStudy(p => ({ ...p, year: Number(e.target.value) }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Type</label>
                    <select value={newStudy.type || "other"} onChange={e => setNewStudy(p => ({ ...p, type: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {STUDY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Journal</label>
                    <input value={newStudy.journal || ""} onChange={e => setNewStudy(p => ({ ...p, journal: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">Summary</label>
                    <textarea value={newStudy.summary || ""} onChange={e => setNewStudy(p => ({ ...p, summary: e.target.value }))}
                      rows={2} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={addStudy} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Add</button>
                  <button onClick={() => setShowStudyForm(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Year</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Title / Journal</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">PMID</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Summary</th>
                    {isEditable && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studies.length === 0 && (
                    <tr><td colSpan={isEditable ? 6 : 5} className="px-4 py-8 text-center text-sm text-gray-400">No studies yet. Add your first study above.</td></tr>
                  )}
                  {studies.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{s.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.year}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{s.title}</p>
                        <p className="text-xs text-gray-500 italic">{s.journal}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.pmid ? (
                          <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}`} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline font-mono">{s.pmid}</a>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{s.summary}</td>
                      {isEditable && (
                        <td className="px-4 py-3">
                          <button onClick={() => removeStudy(i)} className="text-gray-400 hover:text-red-600 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: JURISDICTIONS ────────────────────────────────────────────────── */}
        {tab === "jurisdictions" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Regulatory Status in Other Jurisdictions</h3>
            <div className="space-y-4">
              {(["usa", "eu", "australia"] as const).map(key => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key === "usa" ? "USA" : key === "eu" ? "European Union" : "Australia"}</label>
                  <textarea
                    value={jurisdictions[key] || ""}
                    onChange={e => setJurisdictions(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={2}
                    placeholder={`Regulatory status in ${key === "usa" ? "the USA" : key === "eu" ? "the EU" : "Australia"}…`}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            {isEditable && (
              <button onClick={() => save()} disabled={saving}
                className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        )}

        {/* ── TAB: PRECEDENTS ───────────────────────────────────────────────────── */}
        {tab === "precedents" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Similar ingredients already in NHPID — used to support the submission.</p>
              {isEditable && (
                <button onClick={() => setShowPrecedentForm(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                  + Add Precedent
                </button>
              )}
            </div>

            {showPrecedentForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">New Precedent Ingredient</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">NHPID ID</label>
                    <input value={newPrecedent.nhpidId || ""} onChange={e => setNewPrecedent(p => ({ ...p, nhpidId: e.target.value }))}
                      placeholder="e.g., 12869"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Ingredient Name *</label>
                    <input value={newPrecedent.name || ""} onChange={e => setNewPrecedent(p => ({ ...p, name: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">Reason / Rationale</label>
                    <input value={newPrecedent.reason || ""} onChange={e => setNewPrecedent(p => ({ ...p, reason: e.target.value }))}
                      placeholder="Why this is a valid precedent…"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={addPrecedent} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Add</button>
                  <button onClick={() => setShowPrecedentForm(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">NHPID ID</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ingredient</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rationale</th>
                    {isEditable && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {precedents.length === 0 && (
                    <tr><td colSpan={isEditable ? 4 : 3} className="px-4 py-8 text-center text-sm text-gray-400">No precedent ingredients added yet.</td></tr>
                  )}
                  {precedents.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{p.nhpidId || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.reason}</td>
                      {isEditable && (
                        <td className="px-4 py-3">
                          <button onClick={() => removePrecedent(i)} className="text-gray-400 hover:text-red-600 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: PRODUCT STRATEGIES ───────────────────────────────────────────── */}
        {tab === "strategies" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Products planned once GG is approved in NHPID.</p>
              {isEditable && (
                <button onClick={() => setShowStrategyForm(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                  + Add Product
                </button>
              )}
            </div>

            {showStrategyForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">New Product Strategy</h4>

                {/* Basic fields */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Product Name *</label>
                    <input value={newStrategy.productName || ""} onChange={e => setNewStrategy(p => ({ ...p, productName: e.target.value }))}
                      placeholder="e.g., WE GG-Gold 300"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Type</label>
                    <select value={newStrategy.productType || "single"} onChange={e => setNewStrategy(p => ({ ...p, productType: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="single">Single ingredient</option>
                      <option value="combination">Combination</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Dosage Form</label>
                    <input value={newStrategy.dosageForm || ""} onChange={e => setNewStrategy(p => ({ ...p, dosageForm: e.target.value }))}
                      placeholder="e.g., Softgel"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Dosage Amount</label>
                    <input value={newStrategy.dosageAmount || ""} onChange={e => setNewStrategy(p => ({ ...p, dosageAmount: e.target.value }))}
                      placeholder="e.g., 300mg"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">App Class</label>
                    <select value={newStrategy.applicationClass || "III"} onChange={e => setNewStrategy(p => ({ ...p, applicationClass: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="I">Class I</option>
                      <option value="II">Class II</option>
                      <option value="III">Class III</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Target Timeline</label>
                    <input value={newStrategy.targetTimeline || ""} onChange={e => setNewStrategy(p => ({ ...p, targetTimeline: e.target.value }))}
                      placeholder="e.g., 14-20 months"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                {/* Combination Ingredients — only when type = combination */}
                {newStrategy.productType === "combination" && (
                  <div className="mt-4 border-t border-blue-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Combination Ingredients</p>
                        <p className="text-xs text-gray-400">Add each additional ingredient in this formulation.</p>
                      </div>
                      {!showComboIngredientForm && (
                        <button onClick={() => setShowComboIngredientForm(true)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                          + Add Ingredient
                        </button>
                      )}
                    </div>

                    {/* Added ingredients list */}
                    {newStrategyCombo.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {newStrategyCombo.map((c, i) => (
                          <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-start justify-between">
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{c.properName}</span>
                              {c.commonName && <span className="text-gray-500 ml-2">({c.commonName})</span>}
                              {c.amount && <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c.amount} {c.unit}</span>}
                              {c.isTrademark && c.trademarkName && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">™ {c.trademarkName}</span>
                              )}
                              {c.scientificName && <p className="text-xs text-gray-400 italic mt-0.5">{c.scientificName}</p>}
                              {c.casNumber && <p className="text-xs text-gray-400">CAS {c.casNumber}</p>}
                            </div>
                            <button onClick={() => setNewStrategyCombo(prev => prev.filter((_, j) => j !== i))}
                              className="text-gray-400 hover:text-red-500 ml-3 text-sm">×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add ingredient mini-form */}
                    {showComboIngredientForm && (
                      <div className="bg-white border border-gray-300 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">New Combination Ingredient</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Proper Name *</label>
                            <input value={newComboIng.properName}
                              onChange={e => setNewComboIng(p => ({ ...p, properName: e.target.value }))}
                              placeholder="e.g., Tocotrienol concentrate"
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Common Name</label>
                            <input value={newComboIng.commonName}
                              onChange={e => setNewComboIng(p => ({ ...p, commonName: e.target.value }))}
                              placeholder="e.g., Annatto Tocotrienols"
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Scientific Name</label>
                            <input value={newComboIng.scientificName}
                              onChange={e => setNewComboIng(p => ({ ...p, scientificName: e.target.value }))}
                              placeholder="e.g., Bixa orellana L."
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">CAS Number</label>
                            <input value={newComboIng.casNumber}
                              onChange={e => setNewComboIng(p => ({ ...p, casNumber: e.target.value }))}
                              placeholder="e.g., 6829-55-6"
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Amount</label>
                            <input value={newComboIng.amount}
                              onChange={e => setNewComboIng(p => ({ ...p, amount: e.target.value }))}
                              placeholder="e.g., 150"
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Unit</label>
                            <select value={newComboIng.unit}
                              onChange={e => setNewComboIng(p => ({ ...p, unit: e.target.value }))}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={newComboIng.isTrademark}
                              onChange={e => setNewComboIng(p => ({ ...p, isTrademark: e.target.checked }))}
                              className="rounded" />
                            Trademark / Branded molecule
                          </label>
                          {newComboIng.isTrademark && (
                            <input value={newComboIng.trademarkName}
                              onChange={e => setNewComboIng(p => ({ ...p, trademarkName: e.target.value }))}
                              placeholder="Trademark name (e.g., EVNol SupraBio™)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              if (!newComboIng.properName.trim()) return;
                              setNewStrategyCombo(prev => [...prev, newComboIng]);
                              setNewComboIng(EMPTY_COMBO_ING);
                              setShowComboIngredientForm(false);
                            }}
                            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                            Add to Formulation
                          </button>
                          <button onClick={() => { setShowComboIngredientForm(false); setNewComboIng(EMPTY_COMBO_ING); }}
                            className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Proposed Claims */}
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-600">Proposed Claims</label>
                  <p className="text-xs text-gray-400 mb-2">Health claims you plan to support with this product.</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newStrategyClaimInput}
                      onChange={e => setNewStrategyClaimInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newStrategyClaimInput.trim()) {
                          setNewStrategyClaims(prev => [...prev, newStrategyClaimInput.trim()]);
                          setNewStrategyClaimInput("");
                        }
                      }}
                      placeholder="e.g., Supports CoQ10 biosynthesis (press Enter or click +)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => {
                        if (!newStrategyClaimInput.trim()) return;
                        setNewStrategyClaims(prev => [...prev, newStrategyClaimInput.trim()]);
                        setNewStrategyClaimInput("");
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >+</button>
                  </div>
                  {newStrategyClaims.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newStrategyClaims.map((c, i) => (
                        <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {c}
                          <button onClick={() => setNewStrategyClaims(prev => prev.filter((_, j) => j !== i))}
                            className="hover:text-red-600 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={addStrategy} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Add Product</button>
                  <button onClick={() => { setShowStrategyForm(false); setNewStrategyClaims([]); setNewStrategyClaimInput(""); setNewStrategyCombo([]); setShowComboIngredientForm(false); setNewComboIng(EMPTY_COMBO_ING); }}
                    className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {strategies.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                  No product strategies yet. Add products planned for once GG is NHPID-approved.
                </div>
              )}
              {strategies.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* ── View mode ── */}
                  {editingStrategyId !== s.id ? (
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h4 className="text-sm font-semibold text-gray-900">{s.productName}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STRATEGY_STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                              {s.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Class {s.applicationClass}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.productType}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            {[s.dosageForm, s.dosageAmount, s.targetTimeline].filter(Boolean).join(" · ")}
                          </p>
                          {/* Combination ingredients */}
                          {(() => {
                            const combo = safeJson<Record<string, unknown>[]>(s.combinationIngredients, []);
                            return combo.length > 0 ? (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">+ Combination with:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {combo.map((c, i) => {
                                    const label = String(c.properName || c.name || "");
                                    const dose = c.amount ? `${c.amount}${c.unit ? " " + c.unit : ""}` : "";
                                    return (
                                      <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                        {label}{dose ? ` · ${dose}` : ""}
                                        {c.isTrademark && c.trademarkName ? ` ™${c.trademarkName}` : ""}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {/* Claims */}
                          {(() => {
                            const claims = safeJson<string[]>(s.proposedClaims, []);
                            return claims.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {claims.map((c, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">{c}</span>
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          {isEditable && (
                            <button onClick={() => startEditStrategy(s)}
                              className="text-xs px-3 py-1 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                              Edit
                            </button>
                          )}
                          {isEditable && s.status !== "filed" && (
                            <button onClick={() => advanceStrategyStatus(s)}
                              className="text-xs px-3 py-1 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
                              Advance →
                            </button>
                          )}
                          {(s.status === "ready_to_file" || s.status === "filed") && (
                            <Link href={`/applications/new`}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">
                              Create NPN →
                            </Link>
                          )}
                          {isEditable && (
                            <button onClick={() => removeStrategy(s.id)} className="text-gray-400 hover:text-red-600 p-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Edit mode ── */
                    <div className="p-4 bg-amber-50 border-l-4 border-amber-400">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Edit Product Strategy</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Product Name *</label>
                          <input value={editStrategy.productName || ""} onChange={e => setEditStrategy(p => ({ ...p, productName: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Type</label>
                          <select value={editStrategy.productType || "single"} onChange={e => setEditStrategy(p => ({ ...p, productType: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                            <option value="single">Single ingredient</option>
                            <option value="combination">Combination</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Dosage Form</label>
                          <input value={editStrategy.dosageForm || ""} onChange={e => setEditStrategy(p => ({ ...p, dosageForm: e.target.value }))}
                            placeholder="e.g., Softgel"
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Dosage Amount</label>
                          <input value={editStrategy.dosageAmount || ""} onChange={e => setEditStrategy(p => ({ ...p, dosageAmount: e.target.value }))}
                            placeholder="e.g., 300mg"
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">App Class</label>
                          <select value={editStrategy.applicationClass || "III"} onChange={e => setEditStrategy(p => ({ ...p, applicationClass: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                            <option value="I">Class I</option>
                            <option value="II">Class II</option>
                            <option value="III">Class III</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Status</label>
                          <select value={editStrategy.status || "planned"} onChange={e => setEditStrategy(p => ({ ...p, status: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                            <option value="planned">Planned</option>
                            <option value="nhpid_pending">NHPID Pending</option>
                            <option value="ready_to_file">Ready to File</option>
                            <option value="filed">Filed</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Target Timeline</label>
                          <input value={editStrategy.targetTimeline || ""} onChange={e => setEditStrategy(p => ({ ...p, targetTimeline: e.target.value }))}
                            placeholder="e.g., 14-20 months"
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                        </div>
                      </div>

                      {/* Edit — Combination Ingredients */}
                      {editStrategy.productType === "combination" && (
                        <div className="mt-4 border-t border-amber-200 pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Combination Ingredients</p>
                            </div>
                            {!showEditComboForm && (
                              <button onClick={() => setShowEditComboForm(true)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                                + Add Ingredient
                              </button>
                            )}
                          </div>
                          {editStrategyCombo.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {editStrategyCombo.map((c, i) => (
                                <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-start justify-between">
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-900">{c.properName}</span>
                                    {c.commonName && <span className="text-gray-500 ml-2">({c.commonName})</span>}
                                    {c.amount && <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c.amount} {c.unit}</span>}
                                    {c.isTrademark && c.trademarkName && (
                                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">™ {c.trademarkName}</span>
                                    )}
                                    {c.scientificName && <p className="text-xs text-gray-400 italic mt-0.5">{c.scientificName}</p>}
                                    {c.casNumber && <p className="text-xs text-gray-400">CAS {c.casNumber}</p>}
                                  </div>
                                  <button onClick={() => setEditStrategyCombo(prev => prev.filter((_, j) => j !== i))}
                                    className="text-gray-400 hover:text-red-500 ml-3">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {showEditComboForm && (
                            <div className="bg-white border border-gray-300 rounded-xl p-4 space-y-3">
                              <p className="text-xs font-semibold text-gray-700 mb-1">New Combination Ingredient</p>
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { key: "properName", label: "Proper Name *", placeholder: "e.g., Tocotrienol concentrate" },
                                  { key: "commonName", label: "Common Name", placeholder: "e.g., Annatto Tocotrienols" },
                                  { key: "scientificName", label: "Scientific Name", placeholder: "e.g., Bixa orellana L." },
                                  { key: "casNumber", label: "CAS Number", placeholder: "e.g., 6829-55-6" },
                                  { key: "amount", label: "Amount", placeholder: "e.g., 150" },
                                ].map(({ key, label, placeholder }) => (
                                  <div key={key}>
                                    <label className="text-xs text-gray-500">{label}</label>
                                    <input value={(editComboIng as unknown as Record<string, string>)[key] || ""}
                                      onChange={e => setEditComboIng(p => ({ ...p, [key]: e.target.value }))}
                                      placeholder={placeholder}
                                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                  </div>
                                ))}
                                <div>
                                  <label className="text-xs text-gray-500">Unit</label>
                                  <select value={editComboIng.unit}
                                    onChange={e => setEditComboIng(p => ({ ...p, unit: e.target.value }))}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 pt-1">
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                  <input type="checkbox" checked={editComboIng.isTrademark}
                                    onChange={e => setEditComboIng(p => ({ ...p, isTrademark: e.target.checked }))}
                                    className="rounded" />
                                  Trademark / Branded molecule
                                </label>
                                {editComboIng.isTrademark && (
                                  <input value={editComboIng.trademarkName}
                                    onChange={e => setEditComboIng(p => ({ ...p, trademarkName: e.target.value }))}
                                    placeholder="Trademark name"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => {
                                  if (!editComboIng.properName.trim()) return;
                                  setEditStrategyCombo(prev => [...prev, editComboIng]);
                                  setEditComboIng(EMPTY_COMBO_ING);
                                  setShowEditComboForm(false);
                                }} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                  Add to Formulation
                                </button>
                                <button onClick={() => { setShowEditComboForm(false); setEditComboIng(EMPTY_COMBO_ING); }}
                                  className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Edit — Proposed Claims */}
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-600">Proposed Claims</label>
                        <div className="flex gap-2 mb-2 mt-1">
                          <input value={editClaimInput} onChange={e => setEditClaimInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && editClaimInput.trim()) {
                                setEditStrategyClaims(prev => [...prev, editClaimInput.trim()]);
                                setEditClaimInput("");
                              }
                            }}
                            placeholder="Type a claim and press Enter"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                          <button onClick={() => {
                            if (!editClaimInput.trim()) return;
                            setEditStrategyClaims(prev => [...prev, editClaimInput.trim()]);
                            setEditClaimInput("");
                          }} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+</button>
                        </div>
                        {editStrategyClaims.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {editStrategyClaims.map((c, i) => (
                              <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {c}
                                <button onClick={() => setEditStrategyClaims(prev => prev.filter((_, j) => j !== i))}
                                  className="hover:text-red-600 font-bold">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button onClick={saveEditStrategy}
                          className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                          Save Changes
                        </button>
                        <button onClick={cancelEditStrategy}
                          className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
