/**
 * Article content extraction.
 * Fetches a URL, strips HTML noise, and returns clean readable text.
 */

import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 8000;
const MAX_CONTENT_CHARS = 6000;

// Tags whose content is not useful for extraction
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "header",
  "footer",
  "[class*='ad-']",
  "[class*='ads-']",
  "[id*='ad-']",
  "[class*='sidebar']",
  "[class*='menu']",
  "[class*='cookie']",
  "[class*='popup']",
  "[class*='modal']",
  "[class*='newsletter']",
  "[class*='subscribe']",
  "[class*='social']",
  "[class*='share']",
  "form",
  "button",
].join(", ");

// Candidate selectors for main article content, ordered by specificity
const CONTENT_SELECTORS = [
  "article",
  '[role="main"]',
  "main",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content-body",
  ".story-body",
  ".article-body",
  "#content",
  ".content",
];

export interface ExtractedContent {
  url: string;
  title: string;
  text: string;
  author: string;
  publishedDate: string;
  success: boolean;
  error?: string;
}

export async function extractContent(url: string): Promise<ExtractedContent> {
  const base: ExtractedContent = {
    url,
    title: "",
    text: "",
    author: "",
    publishedDate: "",
    success: false,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResearchBot/1.0; +https://research-agent.app)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return { ...base, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { ...base, error: "Non-HTML content type" };
    }

    const html = await response.text();
    return parseHtml(url, html);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...base, error: message };
  }
}

function parseHtml(url: string, html: string): ExtractedContent {
  const $ = cheerio.load(html);

  // Remove noise elements
  $(NOISE_SELECTORS).remove();

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("meta[name='twitter:title']").attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "";

  const author =
    $("meta[name='author']").attr("content") ||
    $('[class*="author"]').first().text().trim() ||
    $('[rel="author"]').first().text().trim() ||
    "";

  const publishedDate =
    $("meta[property='article:published_time']").attr("content") ||
    $("meta[name='date']").attr("content") ||
    $("time").first().attr("datetime") ||
    $("time").first().text().trim() ||
    "";

  // Try to find the main content block
  let text = "";
  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (el.length) {
      text = cleanText(el.text());
      if (text.length > 200) break;
    }
  }

  // Fall back to body text if no content block found
  if (text.length < 200) {
    text = cleanText($("body").text());
  }

  // Truncate to avoid hitting LLM token limits
  if (text.length > MAX_CONTENT_CHARS) {
    text = text.slice(0, MAX_CONTENT_CHARS) + "\n[content truncated]";
  }

  return {
    url,
    title: cleanText(title).slice(0, 200),
    text,
    author: cleanText(author).slice(0, 100),
    publishedDate: cleanText(publishedDate).slice(0, 50),
    success: text.length > 100,
  };
}

function cleanText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts content from multiple URLs in parallel with concurrency control.
 * Returns only successfully extracted pages.
 */
export async function extractMultiple(
  urls: string[],
  concurrency = 4
): Promise<ExtractedContent[]> {
  const results: ExtractedContent[] = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(extractContent));
    results.push(...batchResults);
  }

  return results.filter((r) => r.success);
}
