"use client";

import { Source } from "@/lib/types";

interface SourceCardProps {
  source: Source;
  index: number;
}

function RelevanceBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
      : score >= 5
      ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
      : "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";

  const label =
    score >= 8 ? "Highly Relevant" : score >= 5 ? "Relevant" : "Low Relevance";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-medium ${color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          score >= 8
            ? "bg-emerald-400"
            : score >= 5
            ? "bg-amber-400"
            : "bg-zinc-400"
        }`}
      />
      {label} · {score}/10
    </span>
  );
}

export default function SourceCard({ source, index }: SourceCardProps) {
  const displayUrl = source.url.replace(/^https?:\/\//, "").slice(0, 60);

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 font-mono">
            {index + 1}
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white hover:text-violet-400 transition-colors line-clamp-2 leading-snug"
          >
            {source.title || source.source}
          </a>
        </div>
        <RelevanceBadge score={source.relevanceScore} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-zinc-500">
        {source.source && (
          <span className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
              />
            </svg>
            {source.source}
          </span>
        )}
        {source.author && (
          <span className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {source.author}
          </span>
        )}
        {source.publishedDate && (
          <span className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {source.publishedDate}
          </span>
        )}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-zinc-300 transition-colors ml-auto"
          title={source.url}
        >
          {displayUrl}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* Summary */}
      {source.summary && (
        <p className="text-sm text-zinc-400 leading-relaxed mb-3">
          {source.summary}
        </p>
      )}

      {/* Key claims */}
      {source.mainClaims && source.mainClaims.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Key Claims
          </p>
          <ul className="space-y-1">
            {source.mainClaims.map((claim, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-violet-500" />
                {claim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quotes */}
      {source.keyQuotes && source.keyQuotes.length > 0 && (
        <div className="mt-3 border-l-2 border-violet-500/30 pl-3">
          {source.keyQuotes.map((quote, i) => (
            <p key={i} className="text-xs text-zinc-500 italic">
              &quot;{quote}&quot;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
