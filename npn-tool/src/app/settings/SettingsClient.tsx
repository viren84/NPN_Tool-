"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

export default function SettingsClient({
  user,
}: {
  user: { id: string; name: string; role: string; username: string };
}) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setApiKey(data.claudeApiKey || "");
        setExportPath(data.exportPath || "");
        setAutoRefresh(data.autoRefreshEnabled ?? true);
        setLastRefresh(data.nhpidLastRefresh);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, unknown> = { exportPath, autoRefreshEnabled: autoRefresh };
    if (apiKey && !apiKey.startsWith("••")) body.claudeApiKey = apiKey;

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const isAdmin = true; // All authenticated users can edit settings

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500 mt-1">API keys, export paths, and data refresh</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Claude API</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">API Key</label>
              <div className="flex gap-2 max-w-md">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="sk-ant-api03-..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Used for document generation, translation, and AI FAQ. Stored locally only.</p>
              {apiKey && !apiKey.startsWith("••") && (
                <p className="text-xs text-green-600 mt-1">Key entered — click Save Settings to store it.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Export</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Default Export Path</label>
              <input
                type="text"
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                disabled={!isAdmin}
                placeholder="C:\Users\Admin\Documents\NPN Submissions"
                className="w-full max-w-lg px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">NHPID Data</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  disabled={!isAdmin}
                  className="h-4 w-4 text-red-600 rounded"
                />
                Auto-refresh monthly
              </label>
              <span className="text-xs text-gray-400">
                Last refresh: {lastRefresh ? new Date(lastRefresh).toLocaleDateString() : "Never"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">REST API</h3>
            <p className="text-sm text-gray-600 mb-2">
              Local API available at <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">http://localhost:3000/api/</code>
            </p>
            <div className="text-xs text-gray-500 space-y-1 font-mono">
              <p>GET  /api/applications</p>
              <p>GET  /api/applications/:id</p>
              <p>POST /api/applications</p>
              <p>GET  /api/company</p>
              <p>PUT  /api/company</p>
              <p>GET  /api/settings</p>
              <p>GET  /api/auth/me</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
