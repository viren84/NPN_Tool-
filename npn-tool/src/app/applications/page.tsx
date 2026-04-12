import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
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

export default async function ApplicationsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      documents: { select: { status: true } },
      medicinalIngredients: { select: { id: true } },
    },
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => {
                const approvedDocs = app.documents.filter((d) => d.status === "approved").length;
                const href = `/applications/${app.id}`;

                return (
                  <tr key={app.id} className="hover:bg-gray-50 cursor-pointer">
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
                  </tr>
                );
              })}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
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
