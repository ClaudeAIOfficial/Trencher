/**
 * Search provider abstraction.
 * Supports Tavily, Brave, SerpAPI, and Exa.
 * Set the appropriate env vars to switch providers.
 *
 * Priority: TAVILY_API_KEY → BRAVE_API_KEY → SERP_API_KEY → EXA_API_KEY
 */

import axios from "axios";
import type { SearchResult } from "@/types/research";

async function searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY!;
  const response = await axios.post(
    "https://api.tavily.com/search",
    {
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
    },
    { timeout: 15000 }
  );

  const results = response.data?.results ?? [];
  return results.map((r: Record<string, string>) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.content ?? r.snippet ?? "",
    publishedDate: r.published_date ?? "",
    source: extractDomain(r.url ?? ""),
  }));
}

async function searchBrave(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY!;
  const response = await axios.get("https://api.search.brave.com/res/v1/web/search", {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    params: { q: query, count: maxResults, search_lang: "en" },
    timeout: 15000,
  });

  const web = response.data?.web?.results ?? [];
  return web.map((r: Record<string, string>) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.description ?? "",
    publishedDate: r.age ?? "",
    source: extractDomain(r.url ?? ""),
  }));
}

async function searchSerpApi(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.SERP_API_KEY!;
  const response = await axios.get("https://serpapi.com/search", {
    params: { q: query, api_key: apiKey, engine: "google", num: maxResults },
    timeout: 15000,
  });

  const organic = response.data?.organic_results ?? [];
  return organic.slice(0, maxResults).map((r: Record<string, string>) => ({
    title: r.title ?? "",
    url: r.link ?? "",
    snippet: r.snippet ?? "",
    publishedDate: r.date ?? "",
    source: extractDomain(r.link ?? ""),
  }));
}

async function searchExa(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.EXA_API_KEY!;
  const response = await axios.post(
    "https://api.exa.ai/search",
    {
      query,
      num_results: maxResults,
      use_autoprompt: true,
      type: "neural",
    },
    {
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  const results = response.data?.results ?? [];
  return results.map((r: Record<string, string>) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.text ?? r.snippet ?? "",
    publishedDate: r.publishedDate ?? "",
    source: extractDomain(r.url ?? ""),
  }));
}

export function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function detectProvider(): "tavily" | "brave" | "serpapi" | "exa" | null {
  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.BRAVE_API_KEY) return "brave";
  if (process.env.SERP_API_KEY) return "serpapi";
  if (process.env.EXA_API_KEY) return "exa";
  return null;
}

export async function searchWeb(
  query: string,
  maxResults = 10,
  provider?: "tavily" | "brave" | "serpapi" | "exa"
): Promise<SearchResult[]> {
  const chosen = provider ?? detectProvider();

  if (!chosen) {
    throw new Error(
      "No search API key found. Set TAVILY_API_KEY, BRAVE_API_KEY, SERP_API_KEY, or EXA_API_KEY in your .env.local file."
    );
  }

  switch (chosen) {
    case "tavily":
      return searchTavily(query, maxResults);
    case "brave":
      return searchBrave(query, maxResults);
    case "serpapi":
      return searchSerpApi(query, maxResults);
    case "exa":
      return searchExa(query, maxResults);
    default:
      throw new Error(`Unknown search provider: ${chosen}`);
  }
}
