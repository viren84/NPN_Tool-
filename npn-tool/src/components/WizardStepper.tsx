"use client";

import { useState } from "react";

const STEPS = [
  { name: "Concept", desc: "Product name, dosage form, route, and concept description" },
  { name: "Research", desc: "AI analyses your concept and recommends ingredients, doses, and filing class" },
  { name: "Ingredients", desc: "Review AI-recommended ingredients, adjust doses, select which to include" },
  { name: "Confirm", desc: "Confirm final ingredient list, claims, and application class before document generation" },
  { name: "COAs", desc: "Upload or link Certificates of Analysis for each medicinal ingredient" },
  { name: "Documents", desc: "AI generates all 13 required documents (PLA form, labels, safety reports, etc.)" },
  { name: "Review", desc: "Review each document, edit content, and approve or request regeneration" },
  { name: "Validate", desc: "Completeness check — all documents approved, ingredient specs, risk info present" },
  { name: "Package", desc: "Export the full submission package as a folder of .html files ready for Health Canada" },
  { name: "Submit", desc: "Instructions for submitting via ePost Connect to NHP Submissions mailbox" },
];

/**
 * activeStep: 0-indexed current step (0 = Concept, 1 = Research, etc.)
 * completedSteps: array of 0-indexed step numbers that are done
 */
export default function WizardStepper({
  activeStep,
  completedSteps = [],
}: {
  activeStep: number;
  completedSteps?: number[];
}) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isCompleted = completedSteps.includes(i);
          const isExpanded = expandedStep === i;

          return (
            <div key={step.name} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? null : i)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? "bg-red-600 text-white"
                    : isCompleted
                    ? "bg-green-600 text-white hover:bg-green-500"
                    : isExpanded
                    ? "bg-gray-400 text-white"
                    : "bg-gray-300 text-gray-600 hover:bg-gray-400 hover:text-white hover:ring-2 hover:ring-gray-400"
                }`}
                title={step.desc}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
              <span
                onClick={() => setExpandedStep(isExpanded ? null : i)}
                className={`text-xs hidden xl:inline cursor-pointer ${
                  isActive ? "text-red-700 font-medium" : isCompleted ? "text-green-700" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {step.name}
              </span>
              {i < 9 && <div className="w-4 h-px bg-gray-300" />}
            </div>
          );
        })}
      </div>
      {expandedStep !== null && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-sm">
          <span className="font-medium text-gray-700">
            Step {expandedStep + 1}: {STEPS[expandedStep].name}
          </span>
          <span className="text-gray-500"> — {STEPS[expandedStep].desc}</span>
        </div>
      )}
    </div>
  );
}
