import { SearchProviderName, WebSearchResult } from "@/lib/research/types";

const DEFAULT_TIMEOUT_MS = 15_000;

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function fetchJson<T>(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Search API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeResult(candidate: Partial<WebSearchResult>): WebSearchResult | null {
  if (!candidate.url || !candidate.title) {
    return null;
  }

  if (!candidate.url.startsWith("http://") && !candidate.url.startsWith("https://")) {
    return null;
  }

  return {
    title: candidate.title.trim(),
    url: candidate.url.trim(),
    snippet: candidate.snippet?.trim() ?? "",
    source: candidate.source?.trim() ?? getHostname(candidate.url) ?? "",
    publishedDate: candidate.publishedDate?.trim() ?? "",
  };
}

function dedupeResults(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const deduped: WebSearchResult[] = [];

  for (const result of results) {
    const key = result.url.split("#")[0].toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

async function searchWithTavily(topic: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  type TavilyResponse = {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      published_date?: string;
    }>;
  };

  const data = await fetchJson<TavilyResponse>("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: topic,
      search_depth: "advanced",
      max_results: maxResults,
      include_images: false,
      include_answer: false,
    }),
  });

  return dedupeResults(
    (data.results ?? [])
      .map((item) =>
        normalizeResult({
          title: item.title,
          url: item.url,
          snippet: item.content,
          source: item.url ? getHostname(item.url) : "",
          publishedDate: item.published_date ?? "",
        })
      )
      .filter((item): item is WebSearchResult => Boolean(item))
  );
}

async function searchWithSerpApi(topic: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured.");
  }

  type SerpApiResponse = {
    organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      source?: string;
      date?: string;
    }>;
  };

  const params = new URLSearchParams({
    engine: "google",
    q: topic,
    num: String(maxResults),
    api_key: apiKey,
  });

  const data = await fetchJson<SerpApiResponse>(`https://serpapi.com/search.json?${params.toString()}`);

  return dedupeResults(
    (data.organic_results ?? [])
      .map((item) =>
        normalizeResult({
          title: item.title,
          url: item.link,
          snippet: item.snippet,
          source: item.source,
          publishedDate: item.date,
        })
      )
      .filter((item): item is WebSearchResult => Boolean(item))
  );
}

async function searchWithBrave(topic: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is not configured.");
  }

  type BraveResponse = {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        age?: string;
      }>;
    };
  };

  const params = new URLSearchParams({
    q: topic,
    count: String(maxResults),
  });

  const data = await fetchJson<BraveResponse>(
    `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    }
  );

  return dedupeResults(
    (data.web?.results ?? [])
      .map((item) =>
        normalizeResult({
          title: item.title,
          url: item.url,
          snippet: item.description,
          source: item.url ? getHostname(item.url) : "",
          publishedDate: item.age,
        })
      )
      .filter((item): item is WebSearchResult => Boolean(item))
  );
}

async function searchWithExa(topic: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not configured.");
  }

  type ExaResponse = {
    results?: Array<{
      title?: string;
      url?: string;
      text?: string;
      publishedDate?: string;
    }>;
  };

  const data = await fetchJson<ExaResponse>("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query: topic,
      numResults: maxResults,
      type: "keyword",
      useAutoprompt: true,
    }),
  });

  return dedupeResults(
    (data.results ?? [])
      .map((item) =>
        normalizeResult({
          title: item.title,
          url: item.url,
          snippet: item.text,
          source: item.url ? getHostname(item.url) : "",
          publishedDate: item.publishedDate,
        })
      )
      .filter((item): item is WebSearchResult => Boolean(item))
  );
}

function getConfiguredProvider(): SearchProviderName {
  const configured = process.env.SEARCH_PROVIDER?.toLowerCase() as SearchProviderName | undefined;
  if (configured && ["tavily", "serpapi", "brave", "exa"].includes(configured)) {
    return configured;
  }
  return "tavily";
}

export async function searchWeb(topic: string, maxResults = 12): Promise<WebSearchResult[]> {
  const provider = getConfiguredProvider();

  switch (provider) {
    case "tavily":
      return searchWithTavily(topic, maxResults);
    case "serpapi":
      return searchWithSerpApi(topic, maxResults);
    case "brave":
      return searchWithBrave(topic, maxResults);
    case "exa":
      return searchWithExa(topic, maxResults);
    default:
      return searchWithTavily(topic, maxResults);
  }
}
