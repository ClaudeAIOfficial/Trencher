import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";

import type { ExtractedArticle, SearchResult } from "./types";

const ARTICLE_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2_200_000;
const MAX_TEXT_CHARS = 18_000;

const LOW_QUALITY_PATTERNS = [
  "coupon",
  "promo code",
  "casino",
  "betting",
  "login",
  "sign in",
  "classified",
  "directory",
  "tag/",
  "category/"
];

const TRUSTED_DOMAIN_HINTS = [
  ".gov",
  ".edu",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  "nytimes.com",
  "theguardian.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "coindesk.com",
  "cointelegraph.com",
  "defillama.com",
  "github.com",
  "docs.",
  "blog."
];

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout)
  };
}

function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getMeta($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).attr("content") || $(selector).attr("value") || $(selector).text();
    if (value && cleanWhitespace(value)) return cleanWhitespace(value);
  }

  return undefined;
}

function sourceName(url: string, $: cheerio.CheerioAPI) {
  const metaSource = getMeta($, [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    'meta[name="twitter:site"]'
  ]);

  if (metaSource) return metaSource.replace(/^@/, "");

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown source";
  }
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const parsed = Date.parse(trimmed);

  if (Number.isNaN(parsed)) return trimmed;

  return new Date(parsed).toISOString().slice(0, 10);
}

function scoreArticle(result: SearchResult, text: string, url: string, publishedDate?: string) {
  const haystack = `${result.title} ${result.snippet ?? ""} ${url}`.toLowerCase();
  let score = 5;

  if (text.length > 1200) score += 1;
  if (text.length > 3500) score += 1;
  if (result.score && result.score > 0.6) score += 1;
  if (publishedDate) score += 1;
  if (TRUSTED_DOMAIN_HINTS.some((hint) => url.includes(hint))) score += 1;
  if (LOW_QUALITY_PATTERNS.some((pattern) => haystack.includes(pattern))) score -= 3;
  if (text.length < 700) score -= 2;

  return Math.max(1, Math.min(10, score));
}

async function fetchHtml(url: string) {
  const timeout = timeoutSignal(ARTICLE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: timeout.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "ResearchAgentBot/1.0 (+https://example.com/research-agent; contact: research@example.com)"
      }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    }

    const html = await response.text();
    return html.slice(0, MAX_HTML_BYTES);
  } finally {
    timeout.clear();
  }
}

export async function extractArticle(result: SearchResult): Promise<ExtractedArticle | null> {
  try {
    const html = await fetchHtml(result.url);
    const $ = cheerio.load(html);
    const dom = new JSDOM(html, { url: result.url });
    const readable = new Readability(dom.window.document).parse();

    $("script, style, noscript, svg, iframe, form, nav, footer").remove();

    const title =
      cleanWhitespace(readable?.title ?? "") ||
      getMeta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      cleanWhitespace($("title").first().text()) ||
      result.title;

    const author =
      cleanWhitespace(readable?.byline ?? "") ||
      getMeta($, [
        'meta[name="author"]',
        'meta[property="article:author"]',
        'meta[name="byl"]',
        'meta[name="dc.creator"]'
      ]) ||
      result.author;

    const publishedDate =
      normalizeDate(result.publishedDate) ||
      normalizeDate(
        getMeta($, [
          'meta[property="article:published_time"]',
          'meta[name="date"]',
          'meta[name="pubdate"]',
          'meta[name="publish-date"]',
          'meta[name="sailthru.date"]',
          "time[datetime]"
        ])
      );

    const text = cleanWhitespace(readable?.textContent ?? $("body").text()).slice(0, MAX_TEXT_CHARS);

    if (text.length < 450) {
      return null;
    }

    const article: ExtractedArticle = {
      title,
      url: result.url,
      source: result.source || sourceName(result.url, $),
      author,
      publishedDate,
      text,
      excerpt: text.slice(0, 4_500),
      searchSnippet: result.snippet,
      searchScore: result.score,
      qualityScore: scoreArticle(result, text, result.url, publishedDate)
    };

    return article.qualityScore >= 3 ? article : null;
  } catch {
    return null;
  }
}

export async function extractArticles(results: SearchResult[], limit = 8) {
  const settled = await Promise.allSettled(results.slice(0, limit).map((result) => extractArticle(result)));

  return settled
    .flatMap((entry) => (entry.status === "fulfilled" && entry.value ? [entry.value] : []))
    .sort((a, b) => b.qualityScore - a.qualityScore);
}
