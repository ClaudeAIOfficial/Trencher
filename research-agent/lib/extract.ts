/**
 * Fetches a URL and extracts readable text content, title, author, and date.
 * Uses cheerio to parse HTML and removes boilerplate elements.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { extractDomain } from "./search";
import type { ExtractedContent } from "@/types/research";

const BLOCKED_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
];

const FETCH_TIMEOUT_MS = 10_000;

function isBlockedUrl(url: string): boolean {
  const domain = extractDomain(url);
  return BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked));
}

function cleanText(text: string): string {
  return text
    .replace(/\s{3,}/g, "\n\n")
    .replace(/\t/g, " ")
    .trim()
    .slice(0, 8000); // cap at 8k chars per article to keep token costs down
}

function extractMeta($: cheerio.CheerioAPI, selector: string[]): string {
  for (const sel of selector) {
    const val = $(sel).attr("content") ?? $(sel).text();
    if (val?.trim()) return val.trim();
  }
  return "";
}

export async function extractContent(
  url: string,
  fallbackTitle?: string,
  fallbackSnippet?: string
): Promise<ExtractedContent | null> {
  if (isBlockedUrl(url)) return null;

  try {
    const response = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResearchAgentBot/1.0; +https://github.com/research-agent)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      maxRedirects: 5,
      responseType: "text",
    });

    const html: string = typeof response.data === "string" ? response.data : String(response.data);
    const $ = cheerio.load(html);

    // Remove noise elements
    $(
      "script,style,noscript,nav,footer,header,aside,iframe,form,button,.ad,.ads,.advertisement,.sidebar,.popup,.modal,.cookie,.newsletter-signup"
    ).remove();

    const title =
      extractMeta($, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        "h1",
        "title",
      ]) ||
      fallbackTitle ||
      "";

    const author = extractMeta($, [
      'meta[name="author"]',
      'meta[property="article:author"]',
      ".author",
      "[rel=author]",
      ".byline",
    ]);

    const publishedDate = extractMeta($, [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="publish-date"]',
      'meta[name="pubdate"]',
      "time[datetime]",
      "time",
    ]);

    // Extract main article body
    const bodySelectors = [
      "article",
      '[role="main"]',
      ".post-content",
      ".article-body",
      ".entry-content",
      ".content",
      "main",
      ".story-body",
      ".article-content",
    ];

    let text = "";
    for (const sel of bodySelectors) {
      const candidate = $(sel).text();
      if (candidate.length > 200) {
        text = candidate;
        break;
      }
    }

    // Fallback to full body
    if (!text) {
      text = $("body").text();
    }

    // If we got nothing useful, use the snippet
    if (!text || text.trim().length < 100) {
      text = fallbackSnippet ?? "";
    }

    return {
      url,
      title: title || fallbackTitle || "",
      text: cleanText(text),
      author,
      publishedDate,
      source: extractDomain(url),
    };
  } catch {
    // If fetch fails, return a minimal record from snippet so the source still appears
    if (fallbackSnippet || fallbackTitle) {
      return {
        url,
        title: fallbackTitle ?? url,
        text: fallbackSnippet ?? "",
        source: extractDomain(url),
      };
    }
    return null;
  }
}
