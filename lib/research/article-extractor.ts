import * as cheerio from "cheerio";
import { ExtractedArticle, WebSearchResult } from "@/lib/research/types";

const ARTICLE_TIMEOUT_MS = 20_000;
const MAX_HTML_LENGTH = 2_000_000;
const MIN_WORDS_FOR_USEFULNESS = 120;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function toIsoDateOrEmpty(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function scoreArticle(content: string, title: string, snippet: string): number {
  const wordCount = content.split(/\s+/).length;
  let score = 0;

  if (wordCount > 250) score += 3;
  if (wordCount > 700) score += 2;
  if (title.length > 20) score += 1;
  if (snippet.length > 60) score += 1;
  if (content.includes("according to")) score += 1;
  if (content.includes("%")) score += 1;
  if (content.includes('"')) score += 1;

  return Math.min(10, score);
}

async function fetchArticle(result: WebSearchResult): Promise<ExtractedArticle | null> {
  try {
    const response = await fetch(result.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResearchAgent/1.0; +https://example.local/research-agent)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(ARTICLE_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return null;
    }

    const html = (await response.text()).slice(0, MAX_HTML_LENGTH);
    const $ = cheerio.load(html);

    $(
      "script, style, noscript, svg, iframe, footer, nav, aside, form, header, [aria-hidden='true']"
    ).remove();

    const extractedTitle =
      cleanText($("meta[property='og:title']").attr("content") ?? "") ||
      cleanText($("title").first().text()) ||
      result.title;

    const author =
      cleanText($("meta[name='author']").attr("content") ?? "") ||
      cleanText($("meta[property='article:author']").attr("content") ?? "") ||
      cleanText($("article [rel='author']").first().text()) ||
      "";

    const publishedDate =
      toIsoDateOrEmpty($("meta[property='article:published_time']").attr("content")) ||
      toIsoDateOrEmpty($("meta[name='pubdate']").attr("content")) ||
      toIsoDateOrEmpty($("time").first().attr("datetime")) ||
      toIsoDateOrEmpty(result.publishedDate) ||
      "";

    const articleText = cleanText(
      $("article").first().text() || $("main").first().text() || $("body").first().text()
    );

    if (articleText.split(/\s+/).length < MIN_WORDS_FOR_USEFULNESS) {
      return null;
    }

    const qualityScore = scoreArticle(articleText, extractedTitle, result.snippet);

    return {
      ...result,
      title: extractedTitle,
      author,
      publishedDate,
      content: articleText,
      qualityScore,
    };
  } catch {
    return null;
  }
}

async function asyncPool<T, R>(
  values: T[],
  concurrency: number,
  iterator: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...values];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        continue;
      }
      results.push(await iterator(next));
    }
  });

  await Promise.all(workers);
  return results;
}

function dedupeByUrl(articles: ExtractedArticle[]): ExtractedArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.url.split("#")[0].toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function extractArticles(
  searchResults: WebSearchResult[],
  maxArticles = 8
): Promise<ExtractedArticle[]> {
  const candidates = searchResults.slice(0, Math.max(maxArticles * 2, maxArticles));
  const extracted = await asyncPool(candidates, 4, fetchArticle);

  return dedupeByUrl(
    extracted
      .filter((article): article is ExtractedArticle => Boolean(article))
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, maxArticles)
  );
}
