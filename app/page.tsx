"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { ResearchReport, ResearchSource } from "@/lib/research/types";

const exampleTopics = [
  "latest Solana memecoin meta",
  "articles about Cursor AI",
  "Joe Rogan tie meme",
  "new AI agents in crypto",
  "Pump.fun competitors"
];

const loadingSteps = [
  "Searching the web for relevant coverage",
  "Opening and reading candidate sources",
  "Filtering duplicates and low-quality pages",
  "Extracting claims, facts, dates, and quotes",
  "Comparing sources for conflicts",
  "Writing the final research report"
];

function section(title: string, items: string[]) {
  if (!items.length) return `## ${title}\n\nNo relevant items found.\n`;
  return `## ${title}\n\n${items.map((item) => `- ${item}`).join("\n")}\n`;
}

function sourceToMarkdown(source: ResearchSource, index: number) {
  const details = [
    `- URL: ${source.url}`,
    `- Source: ${source.source || "Unknown"}`,
    `- Author: ${source.author || "Unknown"}`,
    `- Date: ${source.publishedDate || "Unknown"}`,
    `- Relevance: ${source.relevanceScore}/10`,
    `- Summary: ${source.summary}`
  ];

  if (source.mainClaims.length) {
    details.push(`- Main claims: ${source.mainClaims.join("; ")}`);
  }

  if (source.importantFacts.length) {
    details.push(`- Important facts: ${source.importantFacts.join("; ")}`);
  }

  if (source.keyQuotes.length) {
    details.push(`- Key quotes: ${source.keyQuotes.map((quote) => `"${quote}"`).join("; ")}`);
  }

  return `### ${index + 1}. ${source.title}\n\n${details.join("\n")}\n`;
}

function reportToMarkdown(report: ResearchReport) {
  return [
    `# Research Report: ${report.topic}`,
    "## Executive Summary",
    report.summary || "No summary available.",
    section("Key Findings", report.keyFindings),
    "## Source Breakdown",
    report.sources.length
      ? report.sources.map((source, index) => sourceToMarkdown(source, index)).join("\n")
      : "No useful sources found.\n",
    section("Timeline", report.timeline),
    section("Conflicting Information", report.conflicts),
    section("Opportunities / Insights", report.opportunities),
    "## Final Verdict",
    report.finalVerdict || "No final verdict available.",
    `\nConfidence: ${report.confidence}`
  ].join("\n\n");
}

function downloadMarkdown(topic: string, markdown: string) {
  const safeTopic = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeTopic || "research-report"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ConfidenceBadge({ confidence }: { confidence: ResearchReport["confidence"] }) {
  const classes = {
    low: "border-amber-400/40 bg-amber-400/10 text-amber-100",
    medium: "border-sky-400/40 bg-sky-400/10 text-sky-100",
    high: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${classes[confidence]}`}>
      {confidence} confidence
    </span>
  );
}

function SourceCard({ source, index }: { source: ResearchSource; index: number }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Source {index + 1}</p>
          <h3 className="text-lg font-semibold text-white">{source.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-slate-200">
          {source.relevanceScore}/10
        </span>
      </div>

      <div className="mb-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
        <p>
          <span className="text-slate-500">Website:</span> {source.source || "Unknown"}
        </p>
        <p>
          <span className="text-slate-500">Date:</span> {source.publishedDate || "Unknown"}
        </p>
        <p>
          <span className="text-slate-500">Author:</span> {source.author || "Unknown"}
        </p>
        <a className="truncate text-sky-300 hover:text-sky-200" href={source.url} target="_blank" rel="noreferrer">
          {source.url}
        </a>
      </div>

      <p className="mb-4 text-sm leading-6 text-slate-200">{source.summary}</p>

      {!!source.mainClaims.length && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Main claims</p>
          <ul className="space-y-2 text-sm text-slate-300">
            {source.mainClaims.map((claim) => (
              <li key={claim} className="rounded-2xl bg-black/20 px-3 py-2">
                {claim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!source.keyQuotes.length && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Useful quotes</p>
          <div className="space-y-2">
            {source.keyQuotes.map((quote) => (
              <blockquote key={quote} className="border-l-2 border-sky-300/60 pl-3 text-sm italic text-slate-300">
                "{quote}"
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => (report ? reportToMarkdown(report) : ""), [report]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingSteps.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTopic = topic.trim();

    if (cleanTopic.length < 2) {
      setError("Enter a topic, keyword, person, company, token, trend, or question.");
      return;
    }

    setIsLoading(true);
    setError("");
    setReport(null);
    setCopied(false);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: cleanTopic })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Research failed.");
      }

      setReport(data as ResearchReport);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Research failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyReport() {
    if (!markdown) return;

    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-sky-100 shadow-2xl shadow-sky-950/30">
            Web search + article extraction + source-grounded AI synthesis
          </div>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Research any topic with a cited web agent.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Enter a topic, trend, company, token, person, or question. The agent searches the web, reads useful
            sources, compares claims, calls out conflicts, and returns a clean report.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 rounded-[2rem] border border-white/10 bg-black/30 p-3 shadow-2xl shadow-black/30 backdrop-blur">
            <label htmlFor="topic" className="sr-only">
              Research topic
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Try: latest Solana memecoin meta, articles about Cursor AI, Pump.fun competitors..."
              rows={3}
              className="min-h-28 w-full resize-none rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-5 py-4 text-lg text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/70 focus:ring-4 focus:ring-sky-400/10"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {exampleTopics.slice(0, 3).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setTopic(example)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-sky-300/60 hover:text-white"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full bg-sky-400 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {isLoading ? "Researching..." : "Start Research"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Agent workflow</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Live research pipeline</h2>
            </div>
            <div className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.9)]" />
          </div>
          <div className="space-y-3">
            {loadingSteps.map((step, index) => {
              const active = isLoading && index === loadingIndex;
              const completed = isLoading && index < loadingIndex;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                    active
                      ? "border-sky-300/50 bg-sky-400/10 text-white"
                      : completed
                        ? "border-emerald-300/30 bg-emerald-400/10 text-slate-200"
                        : "border-white/10 bg-black/20 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      active || completed ? "bg-white text-slate-950" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            The API returns a structured JSON report and uses low confidence messaging when reliable sources are too
            sparse.
          </p>
        </aside>
      </section>

      {!report && !isLoading && (
        <section className="mb-12 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
          Your research report, source cards, conflicts, timeline, and opportunities will appear here.
        </section>
      )}

      {report && (
        <section className="mb-16 space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.28em] text-sky-300">Research Report</p>
                <h2 className="text-3xl font-bold text-white md:text-4xl">{report.topic}</h2>
                <div className="mt-4">
                  <ConfidenceBadge confidence={report.confidence} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyReport}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-sky-300/60"
                >
                  {copied ? "Copied" : "Copy report"}
                </button>
                <button
                  onClick={() => downloadMarkdown(report.topic, markdown)}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-100"
                >
                  Export as markdown
                </button>
              </div>
            </div>

            <div className="grid gap-8 py-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-white">Executive Summary</h3>
                <p className="leading-7 text-slate-300">{report.summary}</p>
              </div>
              <div>
                <h3 className="mb-3 text-xl font-semibold text-white">Key Findings</h3>
                <ul className="space-y-3">
                  {report.keyFindings.map((finding) => (
                    <li key={finding} className="rounded-2xl bg-black/20 px-4 py-3 text-sm leading-6 text-slate-200">
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-6 border-t border-white/10 pt-6 lg:grid-cols-3">
              <div>
                <h3 className="mb-3 text-lg font-semibold text-white">Timeline</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(report.timeline.length ? report.timeline : ["No clear timeline found."]).map((item) => (
                    <li key={item} className="rounded-2xl bg-black/20 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold text-white">Conflicting Information</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(report.conflicts.length ? report.conflicts : ["No explicit conflicts found."]).map((item) => (
                    <li key={item} className="rounded-2xl bg-black/20 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold text-white">Opportunities / Insights</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(report.opportunities.length ? report.opportunities : ["No additional opportunities found."]).map(
                    (item) => (
                      <li key={item} className="rounded-2xl bg-black/20 px-3 py-2">
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="mb-2 text-lg font-semibold text-white">Final Verdict</h3>
              <p className="leading-7 text-slate-300">{report.finalVerdict}</p>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Source Breakdown</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Useful articles and public sources</h2>
              </div>
              <p className="text-sm text-slate-400">{report.sources.length} sources</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {report.sources.map((source, index) => (
                <SourceCard key={source.url} source={source} index={index} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
            <h3 className="mb-3 text-lg font-semibold text-white">Markdown Preview</h3>
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-3xl bg-slate-950 p-5 text-sm leading-6 text-slate-300">
              {markdown}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}
