"use client";

import { useEffect, useState } from "react";

interface Step {
  label: string;
  description: string;
  icon: string;
}

const STEPS: Step[] = [
  { icon: "🔍", label: "Searching the web", description: "Finding relevant articles and sources..." },
  { icon: "📖", label: "Reading articles", description: "Extracting content from each source..." },
  { icon: "🧹", label: "Filtering results", description: "Removing spam, duplicates, and low-quality pages..." },
  { icon: "🔗", label: "Cross-referencing", description: "Comparing information across sources..." },
  { icon: "🧠", label: "Analyzing with AI", description: "Identifying key findings and conflicts..." },
  { icon: "📝", label: "Writing report", description: "Structuring the research into a clear report..." },
];

interface LoadingStateProps {
  topic: string;
}

export default function LoadingState({ topic }: LoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 3500);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 fade-in">
      {/* Topic display */}
      <div className="text-center mb-8">
        <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
          Researching
        </p>
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          &ldquo;{topic}&rdquo;
        </h2>
      </div>

      {/* Step list */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isDone = index < currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={index}
                className="flex items-start gap-4 rounded-xl px-4 py-3 transition-all duration-500"
                style={{
                  background: isActive ? "var(--accent-dim)" : "transparent",
                  opacity: isPending ? 0.35 : 1,
                }}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center">
                  {isDone ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--green)"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <span className="text-base pulse-dot">⚡</span>
                  ) : (
                    <span className="text-base">{step.icon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: isActive
                        ? "var(--accent-hover)"
                        : isDone
                        ? "var(--green)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {step.label}
                    {isActive && <span style={{ color: "var(--text-muted)" }}>{dots}</span>}
                  </p>
                  {(isActive || isDone) && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shimmer placeholders */}
      <div className="mt-6 space-y-3">
        {[100, 85, 70].map((width, i) => (
          <div key={i} className="h-3 rounded-full shimmer" style={{ width: `${width}%` }} />
        ))}
      </div>

      <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        This may take 15–30 seconds depending on the topic complexity
      </p>
    </div>
  );
}
