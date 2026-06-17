"use client";

import { useMemo, useState } from "react";

import { toResearchMarkdown } from "@/lib/report-markdown";
import type { ResearchResponse } from "@/lib/types";

type RequestState = "idle" | "loading" | "error" | "done";

const loadingMessages = [
  "Searching the web for relevant sources...",
  "Extracting and cleaning article content...",
  "Comparing sources and checking for conflicts...",
  "Building the final research report..."
];

const prettyConfidence = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const reportSections = [
  "Executive Summary",
  "Key Findings",
  "Source Breakdown",
  "Timeline",
  "Conflicting Information",
  "Opportunities / Insights",
  "Final Verdict"
];

export function ResearchDashboard() {
  const [topic, setTopic] = useState("");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [report, setReport] = useState<ResearchResponse | null>(null);
  const [loadingTick, setLoadingTick] = useState(0);

  const loadingMessage = loadingMessages[loadingTick % loadingMessages.length];

  const markdown = useMemo(() => (report ? toResearchMarkdown(report) : ""), [report]);

  const startLoadingTicker = () => {
    setLoadingTick(0);
    const interval = window.setInterval(() => {
      setLoadingTick((tick) => tick + 1);
    }, 1800);
    return interval;
  };

  const handleResearch = async () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Please enter a topic before starting research.");
      setRequestState("error");
      return;
    }

    setError("");
    setReport(null);
    setRequestState("loading");

    const loadingInterval = startLoadingTicker();

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: trimmed
        })
      });

      const data = (await response.json()) as ResearchResponse & {
        error?: string;
        retryAfter?: number;
      };

      if (!response.ok) {
        const detail =
          data.retryAfter && response.status === 429
            ? ` Rate limit reached. Try again in ${data.retryAfter}s.`
            : "";
        throw new Error(data.error || `Request failed with status ${response.status}.${detail}`);
      }

      setReport(data);
      setRequestState("done");
    } catch (requestError) {
      setRequestState("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while researching."
      );
    } finally {
      window.clearInterval(loadingInterval);
    }
  };

  const copyReport = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
  };

  const exportMarkdown = () => {
    if (!markdown || !report) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const topicSlug = report.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    anchor.href = url;
    anchor.download = `${topicSlug || "research-report"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-4">
        <p className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
          AI Research Agent
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
          Research any topic with source-grounded reporting
        </h1>
        <p className="max-w-3xl text-zinc-300">
          Enter a topic, company, person, trend, token, or question. The agent searches the web,
          reads multiple sources, compares findings, and produces a clean report.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="h-14 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 text-base text-zinc-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            placeholder="e.g. latest Solana memecoin meta"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && requestState !== "loading") {
                void handleResearch();
              }
            }}
          />
          <button
            className="h-14 min-w-44 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900/60 disabled:text-blue-200/70"
            onClick={() => void handleResearch()}
            disabled={requestState === "loading"}
          >
            {requestState === "loading" ? "Researching..." : "Start Research"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-zinc-700 px-3 py-1">Dark mode</span>
          <span className="rounded-full border border-zinc-700 px-3 py-1">Source comparison</span>
          <span className="rounded-full border border-zinc-700 px-3 py-1">
            Confidence scoring
          </span>
        </div>
      </section>

      {requestState === "loading" && (
        <section className="rounded-xl border border-blue-800/50 bg-blue-950/25 p-4 text-sm text-blue-200">
          <p className="font-medium">{loadingMessage}</p>
          <p className="mt-1 text-blue-300/90">Sections being prepared: {reportSections.join(", ")}</p>
        </section>
      )}

      {requestState === "error" && (
        <section className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </section>
      )}

      {requestState === "idle" && !report && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-300">
          <p>Start by entering a topic above. The agent will research and build a report.</p>
        </section>
      )}

      {report && (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-zinc-50">
                Research Report: <span className="text-blue-300">{report.topic}</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  Confidence: {prettyConfidence(report.confidence)}
                </span>
                <button
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800"
                  onClick={() => void copyReport()}
                >
                  Copy report
                </button>
                <button
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800"
                  onClick={exportMarkdown}
                >
                  Export markdown
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-6 text-sm text-zinc-200">
              <section>
                <h3 className="text-lg font-semibold text-zinc-50">Executive Summary</h3>
                <p className="mt-2 leading-relaxed text-zinc-300">{report.summary}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-50">Key Findings</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-300">
                  {report.keyFindings.length ? (
                    report.keyFindings.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No strong findings were validated.</li>
                  )}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-50">Timeline</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-300">
                  {report.timeline.length ? (
                    report.timeline.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>Not enough chronological evidence available.</li>
                  )}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-50">Conflicting Information</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-300">
                  {report.conflicts.length ? (
                    report.conflicts.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No meaningful conflicts detected.</li>
                  )}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-50">Opportunities / Insights</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-300">
                  {report.opportunities.length ? (
                    report.opportunities.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>Insufficient evidence for actionable opportunities.</li>
                  )}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-50">Final Verdict</h3>
                <p className="mt-2 leading-relaxed text-zinc-300">{report.finalVerdict}</p>
              </section>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-semibold text-zinc-50">Source Breakdown</h3>
            {report.sources.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {report.sources.map((source) => (
                  <article
                    key={source.url}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm"
                  >
                    <h4 className="font-semibold text-zinc-100">{source.title}</h4>
                    <p className="mt-1 text-xs text-zinc-400">
                      {source.source} · {source.author || "Unknown"} ·{" "}
                      {source.publishedDate || "Unknown"}
                    </p>
                    <a
                      className="mt-2 block truncate text-xs text-blue-300 underline underline-offset-2"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.url}
                    </a>
                    <p className="mt-3 text-zinc-300">{source.summary}</p>
                    <p className="mt-3 text-xs text-zinc-400">
                      Relevance score: {source.relevanceScore}/10
                    </p>
                    {source.mainClaims.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-300">
                        {source.mainClaims.slice(0, 4).map((claim) => (
                          <li key={`${source.url}-${claim}`}>{claim}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
                Not enough reliable sources found.
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
