"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  context: string; // licence_pdf, coa, study, ingredient_spec, auto
  onExtracted: (data: ExtractionResult) => void;
  accept?: string; // file types
  label?: string;
  description?: string;
}

interface ExtractionResult {
  fileName: string;
  fileSize: number;
  textLength: number;
  documentType: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  warnings: string[];
}

export default function UniversalUpload({ context, onExtracted, accept, label, description }: Props) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setProcessing(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", context);

    try {
      const res = await fetch("/api/upload/process", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Processing failed");
        return;
      }

      setResult(data);
      onExtracted(data);
    } catch {
      setError("Upload failed. Check your connection.");
    } finally {
      setProcessing(false);
    }
  }, [context, onExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? "border-red-400 bg-red-50" :
          processing ? "border-yellow-400 bg-yellow-50" :
          result ? "border-green-400 bg-green-50" :
          "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" accept={accept || ".pdf,.csv,.xlsx,.txt"}
          onChange={handleFileSelect} />

        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-200 border-t-yellow-600 rounded-full" />
            <p className="text-sm text-yellow-700 font-medium">AI is reading your document...</p>
            <p className="text-xs text-yellow-600">Extracting data automatically</p>
          </div>
        ) : result ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700 font-medium">Data extracted from {result.fileName}</p>
            <p className="text-xs text-green-600">Confidence: {Math.round(result.confidence * 100)}% · {result.textLength} chars read</p>
            <button onClick={e => { e.stopPropagation(); setResult(null); }}
              className="text-xs text-gray-500 hover:text-gray-700 mt-1">Upload another file</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">{label || "Drop file here or click to browse"}</p>
            <p className="text-xs text-gray-500">{description || "PDF, CSV, Excel — AI will extract all data automatically"}</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Warnings */}
      {result?.warnings && result.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-700">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
