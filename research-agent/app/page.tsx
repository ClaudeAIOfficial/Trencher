"use client";

import { useState, useRef } from "react";
import SearchBar from "@/components/SearchBar";
import LoadingState from "@/components/LoadingState";
import ResearchReport from "@/components/ResearchReport";
import type { ResearchReport as ReportType } from "@/types/research";

type AppState = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [currentTopic, setCurrentTopic] = useState("");
  const [report, setReport] = useState<ReportType | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (topic: string, maxSources: number) => {
    setCurrentTopic(topic);
    setAppState("loading");
    setReport(null);
    setErrorMessage("");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, maxSources }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? `Request failed with status ${res.status}`);
      }

      if (data.error) {
        throw new Error(data.message ?? "An unknown error occurred.");
      }

      setReport(data as ReportType);
      setAppState("done");

      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setAppState("error");
    }
  };

  const handleNewSearch = () => {
    setAppState("idle");
    setReport(null);
    setErrorMessage("");
    setCurrentTopic("");
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background decorations */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Header — show when idle or always */}
        <header
          className={`text-center mb-12 transition-all duration-500 ${
            appState === "done" ? "mb-6" : "mb-14"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "var(--accent-dim)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              🔬
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: "#fff" }}>
              Research Agent
            </span>
          </div>

          {appState === "idle" && (
            <>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
                <span style={{ color: "#fff" }}>Research </span>
                <span className="gradient-text">anything</span>
                <br />
                <span style={{ color: "#fff" }}>in seconds</span>
              </h1>
              <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                Enter any topic, keyword, person, company, or question. The AI agent searches the
                web, reads sources, and produces a structured research report.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  "🌐 Live web search",
                  "📰 Multi-source analysis",
                  "⚡ AI-powered summaries",
                  "📋 Export as Markdown",
                  "🔍 Conflict detection",
                ].map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1 rounded-full text-xs border"
                    style={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </>
          )}

          {appState === "done" && report && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Research complete · {report.sources.length} sources analyzed
            </p>
          )}
        </header>

        {/* Search bar — always visible */}
        <SearchBar onSearch={handleSearch} isLoading={appState === "loading"} />

        {/* Loading state */}
        {appState === "loading" && <LoadingState topic={currentTopic} />}

        {/* Error state */}
        {appState === "error" && (
          <div className="mt-12 max-w-2xl mx-auto fade-in">
            <div
              className="rounded-2xl border p-6 text-center"
              style={{
                background: "rgba(239,68,68,0.05)",
                borderColor: "rgba(239,68,68,0.2)",
              }}
            >
              <div className="text-3xl mb-3">⚠️</div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: "#fff" }}>
                Research Failed
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                {errorMessage}
              </p>

              {/* Common error hints */}
              {errorMessage.toLowerCase().includes("api key") && (
                <div
                  className="mt-4 p-4 rounded-xl text-left text-sm"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", border: "1px solid" }}
                >
                  <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    🔑 API key required
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Add your API keys to <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--bg-secondary)" }}>.env.local</code>:
                  </p>
                  <pre
                    className="mt-2 p-3 rounded-lg text-xs overflow-x-auto"
                    style={{ background: "var(--bg-secondary)", color: "var(--success)" }}
                  >{`OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...   # or BRAVE_API_KEY, SERP_API_KEY, EXA_API_KEY`}</pre>
                </div>
              )}

              <button
                onClick={handleNewSearch}
                className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Report */}
        {appState === "done" && report && (
          <div ref={reportRef}>
            <ResearchReport report={report} onNewSearch={handleNewSearch} />
          </div>
        )}

        {/* Footer */}
        {appState === "idle" && (
          <footer className="mt-20 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Research Agent · Powered by OpenAI + Web Search APIs ·{" "}
              <a
                href="https://github.com"
                className="hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                View on GitHub
              </a>
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
