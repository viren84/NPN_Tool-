"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  ingredients_confirmed: "bg-blue-100 text-blue-700",
  documents_generating: "bg-yellow-100 text-yellow-700",
  review: "bg-purple-100 text-purple-700",
  finalized: "bg-indigo-100 text-indigo-700",
  submitted: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  refused: "bg-red-100 text-red-700",
};

interface App {
  id: string;
  productName: string;
  applicationClass: string;
  status: string;
  updatedAt: string;
  medicinalIngredients: { id: string }[];
  documents: { status: string }[];
  createdBy: { name: string };
}

export default function ApplicationsPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [applications, setApplications] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
      fetch("/api/applications").then(r => r.ok ? r.json() : []),
    ]).then(([u, apps]) => {
      setUser(u);
      setApplications(Array.isArray(apps) ? apps : []);
      setLoading(false);
    });
  }, []);

  const doDelete = async (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); return; }
    setDeleting(true);
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.id !== id));
      setConfirmDel(null);
    }
    setDeleting(false);
  };

  const isEditable = user?.role !== "viewer";

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {user && <Sidebar user={user as never} />}
        <GlobalSearch />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user as never} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
          <Link
            href="/applications/new"
            className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New PLA
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Class</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Ingredients</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Documents</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Created By</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Updated</th>
                {isEditable && <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => {
                const approvedDocs = app.documents.filter((d) => d.status === "approved").length;
                const href = `/applications/${app.id}`;
                const isConfirming = confirmDel === app.id;

                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={href} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {app.productName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{app.applicationClass}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[app.status] || ""}`}>
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{app.medicinalIngredients.length}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {approvedDocs}/{app.documents.length}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{app.createdBy.name}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(app.updatedAt).toLocaleDateString()}</td>
                    {isEditable && (
                      <td className="px-5 py-3">
                        {isConfirming ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => doDelete(app.id)}
                              disabled={deleting}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleting ? "..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDel(null)}
                              disabled={deleting}
                              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => doDelete(app.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete application"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={isEditable ? 8 : 7} className="px-5 py-8 text-center text-sm text-gray-400">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
