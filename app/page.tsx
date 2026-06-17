"use client";

import { FormEvent, useEffect, useState } from "react";
import { ReportView } from "@/components/report-view";
import { SourceCard } from "@/components/source-card";
import { ResearchReport } from "@/lib/research/types";

const loadingSteps = [
  "Searching recent and relevant sources...",
  "Opening and extracting article content...",
  "Comparing sources and checking conflicts...",
  "Generating your final research report...",
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setStepIndex((previous) => (previous + 1) % loadingSteps.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedTopic = topic.trim();

    if (trimmedTopic.length < 2) {
      setError("Please enter a more specific topic.");
      return;
    }

    setError("");
    setReport(null);
    setIsLoading(true);
    setStepIndex(0);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmedTopic }),
      });

      const data = (await response.json()) as ResearchReport & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Research request failed.");
      }

      setReport(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.15),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(139,92,246,0.18),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.12),transparent_40%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="space-y-4 text-center">
          <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200 uppercase">
            Autonomous Research Agent
          </p>
          <h1 className="text-3xl font-semibold sm:text-5xl">Internet Research Copilot</h1>
          <p className="mx-auto max-w-3xl text-sm text-zinc-300 sm:text-base">
            Enter any topic, person, company, token, trend, or question. The agent searches the
            web, extracts useful sources, compares claims, and returns a structured report.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="topic" className="text-sm font-medium text-zinc-200">
              Research topic
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. latest Solana memecoin meta, Pump.fun competitors, Cursor AI articles"
                className="h-14 flex-1 rounded-xl border border-white/20 bg-black/30 px-4 text-base text-white placeholder:text-zinc-500 outline-none ring-cyan-400 transition focus:ring-2"
                maxLength={240}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="h-14 rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800 disabled:text-cyan-200"
              >
                {isLoading ? "Researching..." : "Start Research"}
              </button>
            </div>
          </form>

          {isLoading ? (
            <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              <p className="mb-1 font-medium">Working...</p>
              <p>{loadingSteps[stepIndex]}</p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </section>

        {!isLoading && !report && !error ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">
            No report yet. Enter a topic above to begin.
          </section>
        ) : null}

        {report ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Source Breakdown</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {report.sources.length > 0 ? (
                  report.sources.map((source, index) => (
                    <SourceCard key={`${source.url}-${index}`} source={source} index={index} />
                  ))
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Not enough reliable sources found for this topic.
                  </p>
                )}
              </div>
            </section>

            <ReportView report={report} />
          </>
        ) : null}
      </div>
    </main>
  );
}
