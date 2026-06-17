"use client";

import { useEffect, useState } from "react";

interface LoadingStateProps {
  topic: string;
}

const STEPS = [
  { label: "Searching the web", icon: "🔍", duration: 3000 },
  { label: "Reading articles", icon: "📄", duration: 5000 },
  { label: "Extracting key information", icon: "⚡", duration: 4000 },
  { label: "Comparing sources", icon: "🔗", duration: 4000 },
  { label: "Detecting conflicts", icon: "⚖️", duration: 3000 },
  { label: "Generating report", icon: "✍️", duration: 6000 },
];

export default function LoadingState({ topic }: LoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    let stepIndex = 0;

    function advance() {
      stepIndex++;
      if (stepIndex < STEPS.length - 1) {
        setCurrentStep(stepIndex);
        timer = setTimeout(advance, STEPS[stepIndex].duration);
      } else {
        setCurrentStep(STEPS.length - 1);
      }
    }

    let timer = setTimeout(advance, STEPS[0].duration);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mt-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
          <span className="text-2xl animate-pulse">
            {STEPS[currentStep].icon}
          </span>
        </div>
        <h2 className="text-xl font-semibold text-white mb-1">
          {STEPS[currentStep].label}
          {dots}
        </h2>
        <p className="text-sm text-zinc-500">
          Researching: <span className="text-zinc-300">&quot;{topic}&quot;</span>
        </p>
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                isActive
                  ? "bg-violet-500/10 border-violet-500/30 text-white"
                  : isDone
                  ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
                  : "border-zinc-800/50 text-zinc-600"
              }`}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isDone ? (
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isActive ? (
                  <svg
                    className="animate-spin w-4 h-4 text-violet-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-zinc-700" />
                )}
              </div>

              <span className="text-sm font-medium">
                {step.icon} {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pulsing bar */}
      <div className="mt-8 h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-1000 ease-in-out"
          style={{
            width: `${Math.round(((currentStep + 1) / STEPS.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
