import { z } from "zod";

import type { SearchProvider, SearchResult } from "@/lib/types";

const timeSensitivePattern =
  /\b(latest|today|yesterday|weekly|breaking|new|now|recent|trend|meta|202\d)\b/i;

const searchProviderSchema = z
  .string()
  .transform((value) => value.toLowerCase())
  .pipe(z.enum(["tavily", "serpapi", "brave", "exa"]))
  .catch("tavily");

const defaultResultLimit = 8;

const sanitizeLimit = (value: string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultResultLimit;
  }

  return Math.min(parsed, 12);
};

const normalizedDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const dedupeResults = (results: SearchResult[]): SearchResult[] => {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    try {
      const parsed = new URL(result.url);
      const key = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(result);
    } catch {
      continue;
    }
  }

  return unique;
};

const requestJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
};

const searchWithTavily = async (topic: string, maxResults: number): Promise<SearchResult[]> => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is missing.");
  }

  const data = await requestJson<{
    results?: Array<{ title?: string; url?: string; content?: string }>;
  }>("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: topic,
      search_depth: "advanced",
      include_raw_content: false,
      max_results: maxResults,
      ...(timeSensitivePattern.test(topic) ? { topic: "news" } : {})
    })
  });

  return (data.results ?? [])
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title ?? "Untitled",
      url: item.url ?? "",
      snippet: item.content ?? "",
      source: normalizedDomain(item.url ?? "")
    }));
};

const searchWithBrave = async (topic: string, maxResults: number): Promise<SearchResult[]> => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is missing.");
  }

  const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
  endpoint.searchParams.set("q", topic);
  endpoint.searchParams.set("count", String(maxResults));
  endpoint.searchParams.set("text_decorations", "false");
  endpoint.searchParams.set("search_lang", "en");
  endpoint.searchParams.set("safesearch", "moderate");

  const data = await requestJson<{
    web?: {
      results?: Array<{ title?: string; url?: string; description?: string }>;
    };
  }>(endpoint, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey
    }
  });

  return (data.web?.results ?? [])
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title ?? "Untitled",
      url: item.url ?? "",
      snippet: item.description ?? "",
      source: normalizedDomain(item.url ?? "")
    }));
};

const searchWithSerpApi = async (topic: string, maxResults: number): Promise<SearchResult[]> => {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is missing.");
  }

  const endpoint = new URL("https://serpapi.com/search.json");
  endpoint.searchParams.set("engine", "google");
  endpoint.searchParams.set("q", topic);
  endpoint.searchParams.set("num", String(maxResults));
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("hl", "en");

  const data = await requestJson<{
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  }>(endpoint);

  return (data.organic_results ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      title: item.title ?? "Untitled",
      url: item.link ?? "",
      snippet: item.snippet ?? "",
      source: normalizedDomain(item.link ?? "")
    }));
};

const searchWithExa = async (topic: string, maxResults: number): Promise<SearchResult[]> => {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is missing.");
  }

  const data = await requestJson<{
    results?: Array<{ title?: string; url?: string; text?: string }>;
  }>("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      query: topic,
      numResults: maxResults,
      type: "keyword",
      useAutoprompt: true
    })
  });

  return (data.results ?? [])
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title ?? "Untitled",
      url: item.url ?? "",
      snippet: item.text?.slice(0, 240) ?? "",
      source: normalizedDomain(item.url ?? "")
    }));
};

export const getSearchProvider = (): SearchProvider =>
  searchProviderSchema.parse(process.env.SEARCH_PROVIDER);

export const searchWeb = async (topic: string): Promise<SearchResult[]> => {
  const provider = getSearchProvider();
  const maxResults = sanitizeLimit(process.env.RESEARCH_RESULT_LIMIT);

  const resultsByProvider: Record<SearchProvider, Promise<SearchResult[]>> = {
    tavily: searchWithTavily(topic, maxResults),
    brave: searchWithBrave(topic, maxResults),
    serpapi: searchWithSerpApi(topic, maxResults),
    exa: searchWithExa(topic, maxResults)
  };

  const results = await resultsByProvider[provider];
  return dedupeResults(results).slice(0, maxResults);
};
