"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import WizardStepper from "@/components/WizardStepper";
import { DOC_LABELS } from "@/lib/constants/doc-labels";

interface Document {
  id: string;
  documentType: string;
  status: string;
  content: string;
}

const statusStyles: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  generating: "bg-yellow-100 text-yellow-700 animate-pulse",
  draft: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function DocumentsClient({
  user,
  application,
}: {
  user: { id: string; name: string; role: string; username: string };
  application: {
    id: string;
    productName: string;
    applicationClass: string;
    status: string;
    documents: Document[];
  };
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(application.documents);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Bug fix: re-sync editContent when docs change (after save/regenerate/approve)
  useEffect(() => {
    if (activeDoc) {
      const current = docs.find((d) => d.id === activeDoc);
      if (current) setEditContent(current.content);
    }
  }, [docs, activeDoc]);

  const generateDoc = async (documentType: string) => {
    setGenerating(documentType);
    const res = await fetch(`/api/applications/${application.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType }),
    });

    if (res.ok) {
      const appRes = await fetch(`/api/applications/${application.id}`);
      if (appRes.ok) {
        const updated = await appRes.json();
        setDocs(updated.documents);
      }
    }
    setGenerating(null);
  };

  const generateAll = async () => {
    const pending = docs.filter((d) => d.status === "pending");
    for (const doc of pending) {
      await generateDoc(doc.documentType);
    }
  };

  const openDoc = (doc: Document) => {
    setActiveDoc(doc.id);
    setEditContent(doc.content);
  };

  const saveDoc = async () => {
    if (!activeDoc) return;
    await fetch(`/api/applications/${application.id}/documents/${activeDoc}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setDocs(docs.map((d) => (d.id === activeDoc ? { ...d, content: editContent } : d)));
  };

  const approveDoc = async (docId: string) => {
    await fetch(`/api/applications/${application.id}/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    setDocs(docs.map((d) => (d.id === docId ? { ...d, status: "approved" } : d)));
  };

  const handleDiscard = () => {
    const current = docs.find((d) => d.id === activeDoc);
    if (current) setEditContent(current.content);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditContent(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportAllPdf = async () => {
    const res = await fetch(`/api/applications/${application.id}/export-pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "PLA_Package.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  const activeDocObj = docs.find((d) => d.id === activeDoc);
  const allApproved = docs.every((d) => d.status === "approved");
  const allGenerated = docs.every((d) => d.status !== "pending");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />
      <input ref={importRef} type="file" accept=".html,.htm,.txt" className="hidden" onChange={handleImport} />

      <main className="flex-1 p-6 min-w-0">
        <WizardStepper activeStep={5} completedSteps={[0, 1, 2, 3, 4]} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{application.productName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Step 6-7 — Documents (Class {application.applicationClass}) &middot; {docs.filter((d) => d.status === "approved").length}/{docs.length} approved
            </p>
          </div>
          <div className="flex gap-3">
            {docs.some((d) => d.content) && (
              <button
                onClick={handleExportAllPdf}
                className="px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All Documents
              </button>
            )}
            {!allGenerated && (
              <button
                onClick={generateAll}
                disabled={!!generating}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate All Documents"}
              </button>
            )}
            {allApproved && (
              <button
                onClick={() => router.push(`/applications/${application.id}/package`)}
                className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                Build Submission Package
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Document List */}
          <div className="w-full lg:w-80 shrink-0 space-y-1.5">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => doc.content ? openDoc(doc) : generateDoc(doc.documentType)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  activeDoc === doc.id
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-transparent bg-white hover:bg-gray-50 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${activeDoc === doc.id ? "text-blue-900" : "text-gray-900"}`}>
                    {DOC_LABELS[doc.documentType] || doc.documentType}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.content && (
                      <a
                        href={`/api/applications/${application.id}/export-pdf?docType=${doc.documentType}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Download as PDF"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </a>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusStyles[doc.status] || ""}`}>
                      {generating === doc.documentType ? "generating..." : doc.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Document Preview/Edit */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 min-h-[600px] max-h-[80vh] flex flex-col">
            {activeDoc && activeDocObj ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {DOC_LABELS[activeDocObj.documentType] || "Document"}
                  </span>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={handleDiscard} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 font-medium" title="Discard unsaved changes">
                      Discard
                    </button>
                    <button onClick={() => importRef.current?.click()} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium" title="Import HTML file to replace content">
                      Import
                    </button>
                    <button onClick={saveDoc} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                      Save
                    </button>
                    <a
                      href={`/api/applications/${application.id}/export-pdf?docType=${activeDocObj.documentType}`}
                      className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                      </svg>
                      PDF
                    </a>
                    <button
                      onClick={() => generateDoc(activeDocObj.documentType)}
                      className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => approveDoc(activeDoc)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Approve
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-5 overflow-y-auto">
                  <div className="mb-4">
                    <div className="prose prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-50" dangerouslySetInnerHTML={{ __html: editContent }} />
                  </div>
                  <details className="mt-6 border-t border-gray-100 pt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer font-medium hover:text-gray-700">Edit Raw HTML</summary>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono text-gray-800 bg-gray-50 h-64 resize-y"
                    />
                  </details>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                Select a document to preview, edit, or generate
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
