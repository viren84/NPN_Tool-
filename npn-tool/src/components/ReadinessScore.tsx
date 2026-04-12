"use client";

interface Props {
  readiness: {
    hasIngredients: boolean;
    hasNonMed: boolean;
    hasClaims: boolean;
    hasDosage: boolean;
    hasRisk: boolean;
    hasDosageForm: boolean;
    allDocsGenerated: boolean;
    allDocsApproved: boolean;
  };
}

const CHECKS = [
  { key: "hasDosageForm", label: "Dosage form selected" },
  { key: "hasIngredients", label: "Medicinal ingredients added" },
  { key: "hasNonMed", label: "Non-medicinal ingredients reviewed" },
  { key: "hasClaims", label: "Health claims selected" },
  { key: "hasDosage", label: "Dosage directions defined" },
  { key: "hasRisk", label: "Risk information reviewed" },
  { key: "allDocsGenerated", label: "All documents generated" },
  { key: "allDocsApproved", label: "All documents approved" },
] as const;

export default function ReadinessScore({ readiness }: Props) {
  const passed = CHECKS.filter(c => readiness[c.key]).length;
  const total = CHECKS.length;
  const pct = Math.round((passed / total) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle cx="28" cy="28" r="24" fill="none"
                stroke={pct >= 80 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#dc2626"}
                strokeWidth="4" strokeDasharray={`${pct * 1.508} 151`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{pct}%</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Submission Readiness</p>
            <p className="text-xs text-gray-500">{passed}/{total} checks passed</p>
          </div>
        </div>
        <div className="flex-1 flex flex-wrap gap-x-6 gap-y-1 ml-4">
          {CHECKS.map(c => (
            <div key={c.key} className="flex items-center gap-1.5">
              {readiness[c.key] ? (
                <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
              )}
              <span className={`text-xs ${readiness[c.key] ? "text-green-700" : "text-gray-400"}`}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
