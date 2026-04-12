import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

export default async function ProductsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const products = await prisma.existingProduct.findMany({
    orderBy: { productName: "asc" },
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Existing Products</h2>
            <p className="text-sm text-gray-500 mt-1">NPNs already licensed with Health Canada</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {products.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No existing products imported yet. Import from SharePoint or add manually.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">NPN</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Product Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Class</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-mono text-gray-900">{p.npnNumber}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{p.productName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{p.applicationClass || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {p.licenceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
