"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

interface Document {
  id: string;
  documentType: string;
  status: string;
}

const DOC_LABELS: Record<string, string> = {
  pla_form: "PLA Form (.html)",
  cover_letter: "Cover Letter",
  fps_form: "Finished Product Specifications",
  label_en: "Product Label (English)",
  label_fr: "Product Label (French)",
  monograph_attestation: "Monograph Attestation",
  safety_report: "Safety Summary Report",
  efficacy_report: "Efficacy Summary Report",
  animal_tissue_form: "Animal Tissue Form",
  senior_attestation: "Senior Official Attestation",
  ingredient_specs: "Medicinal Ingredient Specifications",
  non_med_list: "Non-Medicinal Ingredient List",
  quality_chemistry_report: "Quality/Chemistry Report",
};

export default function PackageClient({
  user,
  application,
}: {
  user: { id: string; name: string; role: string; username: string };
  application: {
    id: string;
    productName: string;
    applicationClass: string;
    documents: Document[];
  };
}) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const allApproved = application.documents.every((d) => d.status === "approved");
  const approvedCount = application.documents.filter((d) => d.status === "approved").length;
  const totalCount = application.documents.length;

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch(`/api/applications/${application.id}/export`, { method: "POST" });
    if (res.ok) {
      setExported(true);
    }
    setExporting(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{application.productName}</h2>
            <p className="text-sm text-gray-500 mt-1">Step 8-10 — Validate, Package & Submit</p>
          </div>

          {/* Completeness Check */}
          <div className={`rounded-xl border p-6 mb-6 ${allApproved ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-3 mb-3">
              {allApproved ? (
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <h3 className="font-semibold text-lg">
                {allApproved ? "All Documents Approved — Ready to Package" : `${approvedCount}/${totalCount} Documents Approved`}
              </h3>
            </div>

            <div className="space-y-2 mt-4">
              {application.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 text-sm">
                  {doc.status === "approved" ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={doc.status === "approved" ? "text-green-800" : "text-gray-600"}>
                    {DOC_LABELS[doc.documentType] || doc.documentType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          {allApproved && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Export Submission Package</h3>
              <p className="text-sm text-gray-600 mb-4">
                Creates a folder with all documents organized for ePost Connect submission.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {exporting ? "Exporting..." : exported ? "Exported!" : "Export Package"}
              </button>
              {exported && (
                <p className="text-sm text-green-600 mt-3">
                  Package exported. Check your export folder.
                </p>
              )}
            </div>
          )}

          {/* ePost Connect Instructions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Submit via ePost Connect</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Log into ePost Connect as a registered Trading Partner</li>
              <li>Open the conversation: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">nhpsn.epostel.applications</code></li>
              <li>Attach the PLA Form (.html file) — this is the primary document</li>
              <li>Attach all supporting documents from the exported package</li>
              <li>Include the cover letter in the message body or as attachment</li>
              <li>Send the submission</li>
              <li>Save the confirmation/tracking number</li>
            </ol>
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">
                <strong>Critical:</strong> Submit the PLA form as .html — NOT PDF or scanned. PDF submissions are automatically refused.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
