/**
 * Search provider abstraction.
 * Each function returns a normalized array of SearchResult.
 * To swap providers, change the SEARCH_PROVIDER env var or call a specific function.
 */

import { SearchResult, SearchProvider } from "./types";

const MAX_RESULTS = 10;

// ─── Tavily ────────────────────────────────────────────────────────────────────

async function searchTavily(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: false,
      max_results: MAX_RESULTS,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return (data.results || []).map((r: Record<string, string>) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.content || r.snippet || "",
    publishedDate: r.published_date || "",
    source: extractDomain(r.url || ""),
  }));
}

// ─── Brave Search ──────────────────────────────────────────────────────────────

async function searchBrave(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY is not set");

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_RESULTS}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return (data.web?.results || []).map((r: Record<string, string>) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.description || "",
    publishedDate: r.page_age || "",
    source: extractDomain(r.url || ""),
  }));
}

// ─── SerpAPI ───────────────────────────────────────────────────────────────────

async function searchSerp(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) throw new Error("SERP_API_KEY is not set");

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=${MAX_RESULTS}&engine=google`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SerpAPI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return (data.organic_results || []).map((r: Record<string, string>) => ({
    title: r.title || "",
    url: r.link || "",
    snippet: r.snippet || "",
    publishedDate: r.date || "",
    source: extractDomain(r.link || ""),
  }));
}

// ─── Exa ───────────────────────────────────────────────────────────────────────

async function searchExa(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY is not set");

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: MAX_RESULTS,
      useAutoprompt: true,
      type: "neural",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exa API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return (data.results || []).map((r: Record<string, string>) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.text || r.excerpt || "",
    publishedDate: r.publishedDate || "",
    source: extractDomain(r.url || ""),
  }));
}

// ─── Router ────────────────────────────────────────────────────────────────────

/**
 * Runs a web search using whichever provider is configured.
 * Priority: explicit SEARCH_PROVIDER env → auto-detect from available keys.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const provider = detectProvider();

  switch (provider) {
    case "tavily":
      return searchTavily(query);
    case "brave":
      return searchBrave(query);
    case "serp":
      return searchSerp(query);
    case "exa":
      return searchExa(query);
    default:
      throw new Error(
        "No search API key found. Set one of: TAVILY_API_KEY, BRAVE_API_KEY, SERP_API_KEY, or EXA_API_KEY"
      );
  }
}

function detectProvider(): SearchProvider | null {
  const explicit = (process.env.SEARCH_PROVIDER || "").toLowerCase() as SearchProvider;
  if (explicit) return explicit;

  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.BRAVE_API_KEY) return "brave";
  if (process.env.SERP_API_KEY) return "serp";
  if (process.env.EXA_API_KEY) return "exa";
  return null;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
