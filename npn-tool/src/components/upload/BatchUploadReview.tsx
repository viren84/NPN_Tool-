"use client";

interface ExtractedResult {
  folderName: string;
  fileCount: number;
  extractedData: Record<string, unknown>;
  status: "success" | "error";
  error?: string;
  saved?: boolean;
}

interface Props {
  results: ExtractedResult[];
  onAcceptAll: () => void;
  onAcceptOne: (index: number) => void;
  onDismiss: () => void;
  saving: boolean;
}

export default function BatchUploadReview({ results, onAcceptAll, onAcceptOne, onDismiss, saving }: Props) {
  const successResults = results.filter(r => r.status === "success" && !r.saved);
  const savedResults = results.filter(r => r.saved);
  const errorResults = results.filter(r => r.status === "error");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Extracted Data — Review Before Saving</h3>
          <p className="text-xs text-gray-500 mt-1">
            {successResults.length} ready to save · {savedResults.length} saved · {errorResults.length} errors
          </p>
        </div>
        <div className="flex gap-2">
          {successResults.length > 0 && (
            <button onClick={onAcceptAll} disabled={saving}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving..." : `Accept All (${successResults.length})`}
            </button>
          )}
          <button onClick={onDismiss} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
            Dismiss
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-3 py-2 text-xs text-gray-500">Folder</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">NPN</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Product</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Dosage Form</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Ingredients</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Status</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {results.map((r, i) => {
              const ed = r.extractedData;
              const ingredients = (ed.medicinalIngredients as Array<{ name: string }>) || [];
              return (
                <tr key={i} className={r.saved ? "bg-green-50" : r.status === "error" ? "bg-red-50" : ""}>
                  <td className="px-3 py-2 text-xs text-gray-600">{r.folderName}</td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-900">{(ed.licenceNumber as string) || "—"}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{(ed.productName as string) || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{(ed.dosageForm as string) || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {ingredients.length > 0 ? ingredients.map(ing => ing.name || "").join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.saved ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Saved</span>
                    ) : r.status === "error" ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full" title={r.error}>Error</span>
                    ) : (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Ready</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!r.saved && r.status === "success" && (
                      <button onClick={() => onAcceptOne(i)} disabled={saving}
                        className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50">Accept</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
