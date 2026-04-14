"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

interface PipelineProduct {
  id: string;
  name: string;
  stage: string;
  priority: string;
  updatedAt: string;
}

interface Props {
  user: { id: string; name: string; role: string; username: string };
  applications: Array<{
    id: string;
    productName: string;
    applicationClass: string;
    status: string;
    updatedAt: string;
    createdBy: { name: string };
  }>;
  recentLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    details: string;
    createdAt: string;
    user: { name: string };
  }>;
  stats: {
    totalApplications: number;
    drafts: number;
    submitted: number;
    activeLicences: number;
    ingredientCount: number;
    submissionCount: number;
    pipelineProducts: number;
  };
  pipelineProducts: PipelineProduct[];
}

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

const stageColors: Record<string, string> = {
  research: "bg-blue-100 text-blue-700", formulation: "bg-blue-100 text-blue-700", stability: "bg-blue-100 text-blue-700",
  filing: "bg-yellow-100 text-yellow-800", under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700", production: "bg-green-100 text-green-700", launch: "bg-green-100 text-green-700",
  active: "bg-green-200 text-green-800", amendment: "bg-purple-100 text-purple-700", renewal: "bg-purple-100 text-purple-700",
  suspended: "bg-red-100 text-red-700", cancelled: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-600", withdrawn: "bg-gray-200 text-gray-700",
};

function formatStage(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

export default function DashboardClient({ user, applications, recentLogs, stats, pipelineProducts }: Props) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {user.name} &middot; Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">Ctrl+K</kbd> to search
            </p>
          </div>
          <Link
            href="/applications/new"
            className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New PLA Application
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          {[
            { label: "Pipeline Products", value: stats.pipelineProducts, color: "text-red-600", href: "/products" },
            { label: "PLA Applications", value: stats.totalApplications, color: "text-gray-900", href: "/applications" },
            { label: "Drafts", value: stats.drafts, color: "text-yellow-600", href: undefined },
            { label: "Active Licences", value: stats.activeLicences, color: "text-green-600", href: "/licences" },
            { label: "Ingredients KB", value: stats.ingredientCount, color: "text-blue-600", href: "/ingredients" },
            { label: "NHPID Submissions", value: stats.submissionCount, color: "text-purple-600", href: "/ingredient-submissions" },
          ].map((stat) => {
            const inner = (
              <>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all">
                {inner}
              </Link>
            ) : (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                {inner}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Applications List */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Applications</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {applications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No applications yet. Click &quot;New PLA Application&quot; to start.
                </div>
              ) : (
                applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{app.productName}</p>
                      <p className="text-xs text-gray-500">
                        Class {app.applicationClass} &middot; by {app.createdBy.name}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[app.status] || "bg-gray-100 text-gray-700"}`}>
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Activity</h3>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No activity yet.
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <p className="text-sm text-gray-700">{log.details}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.user.name} &middot; {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Products */}
        {pipelineProducts.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Product Pipeline</h3>
              <Link href="/products" className="text-sm text-red-600 hover:text-red-700 font-medium">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {pipelineProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(p.priority === "high" || p.priority === "critical") && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        p.priority === "critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {p.priority}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 text-xs rounded-full ${stageColors[p.stage] || "bg-gray-100 text-gray-600"}`}>
                      {formatStage(p.stage)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
