"use client";

import { useState } from "react";
import SearchInput from "./components/SearchInput";
import LoadingState from "./components/LoadingState";
import ResearchReport from "./components/ResearchReport";
import EmptyState from "./components/EmptyState";
import { ResearchReport as ReportType, ResearchError } from "@/lib/types";

type AppState =
  | { status: "idle" }
  | { status: "loading"; topic: string }
  | { status: "done"; report: ReportType }
  | { status: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  async function handleSearch(topic: string) {
    setState({ status: "loading", topic });

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data as ResearchError;
        setState({
          status: "error",
          message: err.error || `Request failed (${res.status})`,
        });
        return;
      }

      setState({ status: "done", report: data as ReportType });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setState({ status: "error", message });
    }
  }

  function handleReset() {
    setState({ status: "idle" });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <span className="font-semibold text-white">Research Agent</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-500">AI-Powered</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {/* Hero section — only shown when idle or on error */}
        {(state.status === "idle" || state.status === "error") && (
          <div className="pt-16 pb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Autonomous Web Research
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
              Research anything.{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Instantly.
              </span>
            </h1>
            <p className="text-zinc-500 text-base sm:text-lg max-w-xl mx-auto mb-10">
              Enter any topic and the agent will search the web, analyze
              multiple sources, detect conflicts, and generate a full research
              report — in seconds.
            </p>

            <SearchInput onSearch={handleSearch} isLoading={false} />

            {state.status === "error" && (
              <div className="mt-6 max-w-xl mx-auto bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-left">
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-400 mb-0.5">
                      Research failed
                    </p>
                    <p className="text-sm text-red-300/70">{state.message}</p>
                  </div>
                </div>
              </div>
            )}

            <EmptyState />
          </div>
        )}

        {/* Loading state */}
        {state.status === "loading" && (
          <div className="pt-16">
            <div className="text-center mb-10">
              <SearchInput
                onSearch={handleSearch}
                isLoading={true}
              />
            </div>
            <LoadingState topic={state.topic} />
          </div>
        )}

        {/* Results */}
        {state.status === "done" && (
          <div className="pt-8">
            <div className="mb-6">
              <SearchInput onSearch={handleSearch} isLoading={false} />
            </div>
            <ResearchReport report={state.report} onReset={handleReset} />
          </div>
        )}
      </main>
    </div>
  );
}
