"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface SearchBarProps {
  onSearch: (topic: string, maxSources: number) => void;
  isLoading: boolean;
}

const EXAMPLE_TOPICS = [
  "latest Solana memecoin meta",
  "articles about Cursor AI",
  "new AI agents in crypto",
  "Pump.fun competitors",
  "OpenAI GPT-5 release",
  "Joe Rogan latest podcast highlights",
];

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [topic, setTopic] = useState("");
  const [maxSources, setMaxSources] = useState(8);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    const trimmed = topic.trim();
    if (!trimmed || isLoading) return;
    onSearch(trimmed, maxSources);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleExample = (example: string) => {
    setTopic(example);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main search input */}
      <div
        className="relative flex items-center rounded-2xl border transition-all duration-200"
        style={{
          background: "var(--bg-card)",
          borderColor: isLoading ? "var(--accent)" : "var(--border)",
          boxShadow: isLoading ? "0 0 0 2px rgba(99,102,241,0.25)" : "none",
        }}
      >
        {/* Search icon */}
        <div className="pl-5 pr-3 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Enter a topic, keyword, question, person, or trend..."
          disabled={isLoading}
          className="flex-1 py-5 pr-2 text-base bg-transparent outline-none placeholder-gray-600 search-glow"
          style={{ color: "var(--text-primary)" }}
          maxLength={500}
          autoFocus
        />

        {/* Settings toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          title="Research settings"
          className="mr-3 p-2 rounded-lg transition-colors"
          style={{
            color: showSettings ? "var(--accent)" : "var(--text-muted)",
            background: showSettings ? "var(--accent-dim)" : "transparent",
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01M12 7a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2z" />
            <circle cx="12" cy="6" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="18" r="1" />
          </svg>
        </button>

        {/* Start Research button */}
        <button
          onClick={handleSearch}
          disabled={!topic.trim() || isLoading}
          className="mr-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2"
          style={{
            background:
              !topic.trim() || isLoading
                ? "var(--border)"
                : "linear-gradient(135deg, #6366f1, #818cf8)",
            color: !topic.trim() || isLoading ? "var(--text-muted)" : "#fff",
            cursor: !topic.trim() || isLoading ? "not-allowed" : "pointer",
            boxShadow:
              !topic.trim() || isLoading ? "none" : "0 4px 15px rgba(99,102,241,0.3)",
          }}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin"
                width="15"
                height="15"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Researching...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Research
            </>
          )}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="mt-2 p-4 rounded-xl border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <label className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
            <div>
              <p className="text-sm font-medium">Max sources to research</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                More sources = more thorough but slower
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={15}
                value={maxSources}
                onChange={(e) => setMaxSources(Number(e.target.value))}
                className="w-28 accent-indigo-500"
              />
              <span
                className="text-sm font-bold w-6 text-center"
                style={{ color: "var(--accent)" }}
              >
                {maxSources}
              </span>
            </div>
          </label>
        </div>
      )}

      {/* Example topics */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-xs mr-1" style={{ color: "var(--text-muted)" }}>
          Try:
        </span>
        {EXAMPLE_TOPICS.map((example) => (
          <button
            key={example}
            onClick={() => handleExample(example)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full border transition-all duration-150 hover:border-indigo-500"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
