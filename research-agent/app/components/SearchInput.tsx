"use client";

import { useState, KeyboardEvent } from "react";

interface SearchInputProps {
  onSearch: (topic: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  "latest Solana memecoin meta",
  "articles about Cursor AI",
  "new AI agents in crypto",
  "Pump.fun competitors",
  "OpenAI GPT-5 release",
];

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [value, setValue] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSearch(trimmed);
  }

  function setExample(q: string) {
    setValue(q);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main search box */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl opacity-30 group-focus-within:opacity-70 transition-opacity blur-sm" />
        <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
          {/* Search icon */}
          <div className="absolute left-4 top-4 text-zinc-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter any topic, keyword, person, company, trend, or question…"
            rows={3}
            disabled={isLoading}
            className="w-full bg-transparent text-white placeholder-zinc-500 resize-none pl-12 pr-4 pt-4 pb-4 text-base leading-relaxed focus:outline-none disabled:opacity-50"
          />

          {/* Character counter + submit */}
          <div className="flex items-center justify-between px-4 pb-3 pt-0">
            <span className="text-xs text-zinc-600">
              {value.length > 0 && `${value.length} / 500`}
            </span>
            <button
              onClick={submit}
              disabled={!value.trim() || isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Researching…
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Start Research
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Example queries */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-xs text-zinc-600 self-center">Try:</span>
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => setExample(q)}
            disabled={isLoading}
            className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs hover:bg-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
