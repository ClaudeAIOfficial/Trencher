import { load } from "cheerio";

import type { ExtractedArticle, SearchResult } from "@/lib/types";

const maxArticleChars = 12_000;
const minimumUsefulTextChars = 550;

const blockedHostPattern =
  /(pinterest|quora|reddit|facebook|instagram|tiktok|youtube|x\.com|twitter\.com|linkedin)\./i;

const trustedDomains = [
  "reuters.com",
  "apnews.com",
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  "bbc.com",
  "nytimes.com",
  "theverge.com",
  "techcrunch.com",
  "arstechnica.com",
  "coindesk.com",
  "cointelegraph.com",
  "decrypt.co"
];

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").replace(/[^\S\r\n]+/g, " ").trim();

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const extractMetadata = ($: ReturnType<typeof load>) => {
  const title =
    normalizeWhitespace(
      $("meta[property='og:title']").attr("content") ||
        $("meta[name='twitter:title']").attr("content") ||
        $("title").first().text()
    ) || "Untitled";

  const author =
    normalizeWhitespace(
      $("meta[name='author']").attr("content") ||
        $("meta[property='article:author']").attr("content") ||
        $("[itemprop='author']").first().text()
    ) || "Unknown";

  const publishedDate =
    normalizeWhitespace(
      $("meta[property='article:published_time']").attr("content") ||
        $("meta[name='date']").attr("content") ||
        $("time").first().attr("datetime") ||
        ""
    ) || "Unknown";

  return {
    title,
    author,
    publishedDate
  };
};

const extractReadableText = (html: string): string => {
  const $ = load(html);
  $("script, style, noscript, svg, iframe, form, nav, footer, header").remove();

  const articleText =
    $("article").text() ||
    $("main").text() ||
    $("body").text() ||
    $.root().text();

  return normalizeWhitespace(articleText).slice(0, maxArticleChars);
};

const parsePublishedTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const scoreSource = (article: ExtractedArticle): number => {
  const domain = getDomain(article.url);
  const trustBonus = trustedDomains.some((trusted) => domain.endsWith(trusted)) ? 3 : 0;
  const lengthBonus = Math.min(Math.floor(article.text.length / 2000), 3);
  const freshnessBonus = (() => {
    const stamp = parsePublishedTimestamp(article.publishedDate);
    if (!stamp) return 0;

    const ageDays = Math.round((Date.now() - stamp) / (1000 * 60 * 60 * 24));
    if (ageDays <= 1) return 3;
    if (ageDays <= 7) return 2;
    if (ageDays <= 30) return 1;
    return 0;
  })();

  return Math.min(10, 2 + trustBonus + lengthBonus + freshnessBonus);
};

const looksLowQuality = (article: ExtractedArticle): boolean => {
  const domain = getDomain(article.url);
  if (!domain || blockedHostPattern.test(domain)) {
    return true;
  }

  if (article.text.length < minimumUsefulTextChars) {
    return true;
  }

  return scoreSource(article) < 3;
};

export const extractArticleFromUrl = async (result: SearchResult): Promise<ExtractedArticle | null> => {
  try {
    const response = await fetch(result.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResearchAgent/1.0; +https://example.com/bot)"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);
    const metadata = extractMetadata($);
    const text = extractReadableText(html);

    const article: ExtractedArticle = {
      title: metadata.title || result.title || "Untitled",
      url: result.url,
      source: getDomain(result.url),
      author: metadata.author,
      publishedDate: metadata.publishedDate,
      text
    };

    if (looksLowQuality(article)) {
      return null;
    }

    return article;
  } catch {
    return null;
  }
};

export const extractArticles = async (
  results: SearchResult[],
  maxArticles = 8
): Promise<ExtractedArticle[]> => {
  const extracted = await Promise.all(results.map((item) => extractArticleFromUrl(item)));
  return extracted.filter((item): item is ExtractedArticle => item !== null).slice(0, maxArticles);
};
