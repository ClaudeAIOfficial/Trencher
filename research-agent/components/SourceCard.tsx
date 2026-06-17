"use client";

import type { Source } from "@/types/research";

interface SourceCardProps {
  source: Source;
  index: number;
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score / 10, 0), 1) * 100;
  const color =
    score >= 8
      ? "#10b981"
      : score >= 6
      ? "#6366f1"
      : score >= 4
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {score}/10
      </span>
    </div>
  );
}

export default function SourceCard({ source, index }: SourceCardProps) {
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-200 hover:border-indigo-500 fade-in ${staggerClass}`}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        opacity: 0,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-tight hover:underline line-clamp-2"
            style={{ color: "var(--accent-hover)" }}
          >
            {source.title || source.url}
          </a>
        </div>
        <div
          className="flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-medium"
          style={{ background: "var(--accent-dim)", color: "var(--accent-hover)" }}
        >
          #{index + 1}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {source.source && (
          <span
            className="px-2 py-0.5 rounded-full border"
            style={{ borderColor: "var(--border)" }}
          >
            {source.source}
          </span>
        )}
        {source.author && (
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {source.author}
          </span>
        )}
        {source.publishedDate && (
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {source.publishedDate}
          </span>
        )}
      </div>

      {/* Summary */}
      {source.summary && (
        <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {source.summary}
        </p>
      )}

      {/* Main claims */}
      {source.mainClaims && source.mainClaims.length > 0 && (
        <ul className="mb-3 space-y-1">
          {source.mainClaims.slice(0, 4).map((claim, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span
                className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {claim}
            </li>
          ))}
        </ul>
      )}

      {/* Relevance score */}
      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Relevance
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 transition-colors hover:text-indigo-400"
            style={{ color: "var(--text-muted)" }}
          >
            View source
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <RelevanceBar score={source.relevanceScore} />
      </div>
    </div>
  );
}
