"use client";

import { useState } from "react";

interface HelpPanelProps {
  stepName?: string;
  stepDescription?: string;
  educationalLinks?: Array<{ label: string; url: string }>;
}

export default function HelpPanel({ stepName, stepDescription, educationalLinks }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    const res = await fetch("/api/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context: stepName }),
    });

    if (res.ok) {
      const data = await res.json();
      setAnswer(data.answer);
      setHistory((prev) => [...prev, { q: question, a: data.answer }]);
      setQuestion("");
    }
    setLoading(false);
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-10 h-10 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 flex items-center justify-center z-30 opacity-70 hover:opacity-100 transition-opacity"
        title="Help & FAQ"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Help Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 flex flex-col max-h-[70vh]">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Help & FAQ</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Step Info */}
            {stepName && (
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-blue-800 mb-1">{stepName}</h4>
                <p className="text-xs text-blue-700">{stepDescription}</p>
              </div>
            )}

            {/* Educational Links */}
            {educationalLinks && educationalLinks.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Learn More</h4>
                {educationalLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-red-600 hover:text-red-800 py-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {/* Chat History */}
            {history.map((item, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-gray-700 mb-1">{item.q}</p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap">{item.a}</div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="animate-spin w-3 h-3 border-2 border-gray-300 border-t-red-500 rounded-full" />
                Thinking...
              </div>
            )}

            {answer && history.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap">{answer}</div>
            )}
          </div>

          {/* Question Input */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                placeholder="Ask about this step..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={askQuestion}
                disabled={loading || !question.trim()}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-50"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
