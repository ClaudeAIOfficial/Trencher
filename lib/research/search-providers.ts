import type { SearchProviderName, SearchResult } from "./types";

type Provider = {
  name: SearchProviderName;
  search: (topic: string, maxResults: number) => Promise<SearchResult[]>;
};

const SEARCH_TIMEOUT_MS = 12_000;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout)
  };
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const timeout = withTimeout(SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: timeout.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Search provider returned ${response.status}: ${detail.slice(0, 220)}`);
    }

    return (await response.json()) as T;
  } finally {
    timeout.clear();
  }
}

function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function compactResults(results: SearchResult[]) {
  const seen = new Set<string>();

  return results
    .filter((result) => result.title && result.url)
    .filter((result) => {
      try {
        const url = new URL(result.url);
        if (!["http:", "https:"].includes(url.protocol)) return false;

        const normalized = `${url.hostname}${url.pathname}`.toLowerCase().replace(/\/$/, "");
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      } catch {
        return false;
      }
    });
}

function tavilyProvider(): Provider {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  return {
    name: "tavily",
    async search(topic, maxResults) {
      type TavilyResult = {
        title?: string;
        url?: string;
        content?: string;
        score?: number;
        published_date?: string;
      };

      const data = await fetchJson<{ results?: TavilyResult[] }>("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: topic,
          max_results: maxResults,
          search_depth: "advanced",
          include_answer: false,
          include_raw_content: false
        })
      });

      return compactResults(
        (data.results ?? []).map((result) => ({
          title: result.title ?? "",
          url: result.url ?? "",
          source: hostnameFromUrl(result.url ?? ""),
          snippet: result.content,
          publishedDate: result.published_date,
          score: result.score
        }))
      );
    }
  };
}

function braveProvider(): Provider {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is not configured.");
  }

  return {
    name: "brave",
    async search(topic, maxResults) {
      type BraveResult = {
        title?: string;
        url?: string;
        description?: string;
        profile?: { name?: string };
        age?: string;
      };

      const params = new URLSearchParams({
        q: topic,
        count: String(Math.min(maxResults, 20)),
        text_decorations: "false",
        result_filter: "web"
      });

      const data = await fetchJson<{ web?: { results?: BraveResult[] } }>(
        `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
        {
          headers: {
            "X-Subscription-Token": apiKey
          }
        }
      );

      return compactResults(
        (data.web?.results ?? []).map((result) => ({
          title: result.title ?? "",
          url: result.url ?? "",
          source: result.profile?.name ?? hostnameFromUrl(result.url ?? ""),
          snippet: result.description,
          publishedDate: result.age
        }))
      );
    }
  };
}

function serpApiProvider(): Provider {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured.");
  }

  return {
    name: "serpapi",
    async search(topic, maxResults) {
      type SerpResult = {
        title?: string;
        link?: string;
        source?: string;
        snippet?: string;
        date?: string;
      };

      const params = new URLSearchParams({
        engine: "google",
        q: topic,
        num: String(Math.min(maxResults, 10)),
        api_key: apiKey
      });

      const data = await fetchJson<{ organic_results?: SerpResult[] }>(
        `https://serpapi.com/search.json?${params.toString()}`
      );

      return compactResults(
        (data.organic_results ?? []).map((result) => ({
          title: result.title ?? "",
          url: result.link ?? "",
          source: result.source ?? hostnameFromUrl(result.link ?? ""),
          snippet: result.snippet,
          publishedDate: result.date
        }))
      );
    }
  };
}

function exaProvider(): Provider {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error("EXA_API_KEY is not configured.");
  }

  return {
    name: "exa",
    async search(topic, maxResults) {
      type ExaResult = {
        title?: string;
        url?: string;
        author?: string;
        publishedDate?: string;
        text?: string;
        score?: number;
      };

      const data = await fetchJson<{ results?: ExaResult[] }>("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          query: topic,
          numResults: maxResults,
          contents: { text: { maxCharacters: 700 } }
        })
      });

      return compactResults(
        (data.results ?? []).map((result) => ({
          title: result.title ?? "",
          url: result.url ?? "",
          source: hostnameFromUrl(result.url ?? ""),
          snippet: result.text,
          author: result.author,
          publishedDate: result.publishedDate,
          score: result.score
        }))
      );
    }
  };
}

export function getSearchProvider(): Provider {
  const configured = (process.env.SEARCH_PROVIDER?.toLowerCase() || "tavily") as SearchProviderName;

  switch (configured) {
    case "brave":
      return braveProvider();
    case "serpapi":
      return serpApiProvider();
    case "exa":
      return exaProvider();
    case "tavily":
      return tavilyProvider();
    default:
      throw new Error(`Unsupported SEARCH_PROVIDER "${configured}". Use tavily, brave, serpapi, or exa.`);
  }
}
