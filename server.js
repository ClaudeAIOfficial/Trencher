const express = require("express");
const multer = require("multer");
const cheerio = require("cheerio");
const Tesseract = require("tesseract.js");
const dotenv = require("dotenv");
const {
  SOCIAL_PLATFORMS,
  getPlatformFromUrl,
  getAdapterForUrl,
  getSocialAdapters,
} = require("./adapters/router");

dotenv.config({ quiet: true });

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const PORT = process.env.PORT || 3000;
const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const APIFY_TOKEN = process.env.APIFY_TOKEN || "";
const SERP_API_BASE = "https://serpapi.com/search.json";
const APIFY_API_BASE = "https://api.apify.com/v2";
const DEFAULT_TIMEOUT_MS = 12000;
const SOCIAL_STATUS_VALUES = {
  CHECKED: "checked",
  FAILED: "failed",
  SKIPPED: "skipped",
  API_MISSING: "API missing",
};

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const INPUT_TYPES = {
  IMAGE_UPLOAD: "image_upload",
  SCREENSHOT_UPLOAD: "screenshot_upload",
  POST_URL: "post_url",
  X_URL: "x_twitter_link",
  INSTAGRAM_URL: "instagram_link",
  FACEBOOK_URL: "facebook_link",
  TIKTOK_URL: "tiktok_link",
  REDDIT_URL: "reddit_link",
  YOUTUBE_URL: "youtube_link",
  RANDOM_SENTENCE: "random_sentence",
  CAPTION: "caption",
  NAME_OR_ENTITY: "name_or_entity",
  UNKNOWN: "unknown",
};

const APIFY_ACTOR_IDS = {
  x: process.env.APIFY_X_ACTOR_ID || "",
  tiktok: process.env.APIFY_TIKTOK_ACTOR_ID || "",
  instagram: process.env.APIFY_INSTAGRAM_ACTOR_ID || "",
  facebook: process.env.APIFY_FACEBOOK_ACTOR_ID || "",
  reddit: process.env.APIFY_REDDIT_ACTOR_ID || "",
  youtube: process.env.APIFY_YOUTUBE_ACTOR_ID || "",
};

function normalizeWhitespace(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function compactText(value, max = 260) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function toIsoIfDate(value) {
  if (!value) return null;
  const stamp = Date.parse(value);
  return Number.isNaN(stamp) ? null : new Date(stamp).toISOString();
}

function toDateOnly(value) {
  const iso = toIsoIfDate(value);
  return iso ? iso.slice(0, 10) : null;
}

function isLikelyUrl(value) {
  try {
    const parsed = new URL((value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function phraseFromUrl(url) {
  if (!isLikelyUrl(url)) return "";
  const parsed = new URL(url);
  return `${parsed.pathname} ${parsed.search}`
    .replace(/[/?&=_\-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !/^\d+$/.test(token))
    .slice(0, 12)
    .join(" ");
}

function detectInputType(rawInput, file) {
  if (file && file.mimetype?.startsWith("image/")) {
    const name = file.originalname.toLowerCase();
    return name.includes("screen") ? INPUT_TYPES.SCREENSHOT_UPLOAD : INPUT_TYPES.IMAGE_UPLOAD;
  }

  const input = (rawInput || "").trim();
  if (!input) return INPUT_TYPES.UNKNOWN;

  if (isLikelyUrl(input)) {
    const platform = getPlatformFromUrl(input);
    if (platform === "x") return INPUT_TYPES.X_URL;
    if (platform === "tiktok") return INPUT_TYPES.TIKTOK_URL;
    if (platform === "instagram") return INPUT_TYPES.INSTAGRAM_URL;
    if (platform === "facebook") return INPUT_TYPES.FACEBOOK_URL;
    if (platform === "reddit") return INPUT_TYPES.REDDIT_URL;
    if (platform === "youtube") return INPUT_TYPES.YOUTUBE_URL;
    return INPUT_TYPES.POST_URL;
  }

  const words = input.split(/\s+/).filter(Boolean);
  if (words.length >= 6) return INPUT_TYPES.RANDOM_SENTENCE;
  if (words.length >= 3 && input.length < 120) return INPUT_TYPES.CAPTION;
  if (words.length <= 4) return INPUT_TYPES.NAME_OR_ENTITY;
  return INPUT_TYPES.UNKNOWN;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) ViralLoreAgent/3.0",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetchWithTimeout(
    url,
    { ...options, headers: { accept: "application/json,text/plain,*/*", ...(options.headers || {}) } },
    timeoutMs,
  );
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`);
  return response.json();
}

async function fetchText(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetchWithTimeout(
    url,
    {
      ...options,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(options.headers || {}),
      },
    },
    timeoutMs,
  );
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`);
  return response.text();
}

function normalizeSource(raw) {
  return {
    sourceType: raw.sourceType || "web",
    platform: raw.platform || getPlatformFromUrl(raw.url || ""),
    title: compactText(raw.title || "Untitled", 180),
    url: raw.url || null,
    snippet: compactText(raw.snippet || "", 320),
    author: raw.author || null,
    publishedAt: toIsoIfDate(raw.publishedAt || raw.date || null),
    image: raw.image || null,
    visualScore: raw.visualScore || 0,
    engagement: raw.engagement || null,
    comments: raw.comments || null,
    linkedOriginalSource: raw.linkedOriginalSource || null,
    metadata: raw.metadata || {},
  };
}

function unwrapDuckDuckGoUrl(rawUrl) {
  if (!rawUrl) return null;
  const candidate = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname.includes("duckduckgo.com")) return candidate;
    const direct = parsed.searchParams.get("uddg");
    return direct ? decodeURIComponent(direct) : candidate;
  } catch (_error) {
    return candidate;
  }
}

function extractLinkedSource(text) {
  const match = (text || "").match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : null;
}

function extractEngagementFromText(text) {
  const likes = (text || "").match(/(\d[\d,.]*)\s+likes?/i)?.[1] || null;
  const views = (text || "").match(/(\d[\d,.]*)\s+views?/i)?.[1] || null;
  const shares = (text || "").match(/(\d[\d,.]*)\s+shares?/i)?.[1] || null;
  const comments = (text || "").match(/(\d[\d,.]*)\s+comments?/i)?.[1] || null;
  return likes || views || shares || comments ? { likes, views, shares, comments } : null;
}

function detectRepostIndicators(text) {
  const indicators = [];
  const body = (text || "").toLowerCase();
  if (/repost|re-upload|reupload/.test(body)) indicators.push("repost");
  if (/compilation|reaction|remix|duet/.test(body)) indicators.push("derivative format");
  if (/credit|source:|via @/.test(body)) indicators.push("credits another source");
  return indicators;
}

async function uploadImage(file) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  form.append("file", blob, file.originalname || "upload.png");
  const response = await fetchWithTimeout("https://0x0.st", { method: "POST", body: form }, 15000);
  if (!response.ok) throw new Error(`Image upload failed (${response.status})`);
  return (await response.text()).trim();
}

async function runOCR(file) {
  const result = await Tesseract.recognize(file.buffer, "eng");
  const text = normalizeWhitespace(result?.data?.text || "");
  const handles = [...new Set((text.match(/[@#][a-zA-Z0-9._]{2,30}/g) || []).slice(0, 20))];
  const timestamps = [...new Set((text.match(/\b\d{1,2}[:.]\d{2}\s?(?:AM|PM|am|pm)?\b/g) || []).slice(0, 10))];
  const watermarks = [...new Set((text.match(/\b(?:tt|ig|x|yt)[:\s]?[a-zA-Z0-9._]{2,30}\b/g) || []).slice(0, 10))];
  const logoCandidates = [...new Set((text.match(/\b[A-Z][A-Z0-9]{2,}\b/g) || []).slice(0, 12))];
  return { text, handles, timestamps, watermarks, logoCandidates };
}

async function serpApiRequest(params, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!SERPAPI_KEY) throw new Error("SERPAPI_KEY missing");
  const url = new URL(SERP_API_BASE);
  Object.entries({ ...params, api_key: SERPAPI_KEY, no_cache: "true" }).forEach(([k, v]) =>
    url.searchParams.set(k, String(v)),
  );
  return fetchJson(url.toString(), {}, timeoutMs);
}

async function serpWebSearch(query) {
  const data = await serpApiRequest({ engine: "google", q: query, num: 10 });
  return (data?.organic_results || []).map((item) =>
    normalizeSource({
      sourceType: "web",
      platform: getPlatformFromUrl(item.link),
      title: item.title,
      url: item.link,
      snippet: item.snippet || item.snippet_highlighted_words?.join(" "),
      date: item.date,
    }),
  );
}

async function serpNewsSearch(query) {
  const data = await serpApiRequest({ engine: "google_news", q: query, num: 10 });
  return (data?.news_results || []).map((item) =>
    normalizeSource({
      sourceType: "news",
      platform: getPlatformFromUrl(item.link),
      title: item.title,
      url: item.link,
      snippet: item.snippet || "",
      date: item.date,
      image: item.thumbnail,
    }),
  );
}

async function serpGoogleLens(imageUrl) {
  const data = await serpApiRequest({ engine: "google_lens", url: imageUrl }, 18000);
  return (data?.visual_matches || []).map((item, index) =>
    normalizeSource({
      sourceType: "visual_match",
      platform: getPlatformFromUrl(item.link),
      title: item.title,
      url: item.link,
      snippet: item.source || item.snippet || "",
      image: item.thumbnail,
      visualScore: Math.max(0, 100 - index * 6),
    }),
  );
}

async function fallbackDuckDuckGo(query) {
  const html = await fetchText(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {}, 10000);
  const $ = cheerio.load(html);
  const output = [];
  $(".result").each((_idx, node) => {
    const title = normalizeWhitespace($(node).find(".result__title").text());
    const url = unwrapDuckDuckGoUrl($(node).find("a.result__a").attr("href"));
    const snippet = normalizeWhitespace($(node).find(".result__snippet").text());
    if (!title || !url) return;
    output.push(
      normalizeSource({
        sourceType: "web_fallback",
        platform: getPlatformFromUrl(url),
        title,
        url,
        snippet,
      }),
    );
  });
  return output.slice(0, 10);
}

async function fallbackNewsRss(query) {
  const xml = await fetchText(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    {},
    10000,
  );
  const $ = cheerio.load(xml, { xmlMode: true });
  const output = [];
  $("item").each((_idx, node) => {
    const title = normalizeWhitespace($(node).find("title").first().text());
    const link = normalizeWhitespace($(node).find("link").first().text());
    const date = normalizeWhitespace($(node).find("pubDate").first().text());
    if (!title || !link) return;
    output.push(
      normalizeSource({
        sourceType: "news_fallback",
        platform: "news",
        title,
        url: link,
        date,
      }),
    );
  });
  return output.slice(0, 10);
}

function getMeta($, selectors) {
  for (const selector of selectors) {
    const value = $(selector).attr("content");
    if (value) return normalizeWhitespace(value);
  }
  return null;
}

async function extractOpenGraph(url) {
  const html = await fetchText(url, {}, 12000);
  const $ = cheerio.load(html);
  const openGraph = {
    title: getMeta($, ["meta[property='og:title']", "meta[name='twitter:title']", "meta[name='title']"]),
    description: getMeta($, [
      "meta[property='og:description']",
      "meta[name='description']",
      "meta[name='twitter:description']",
    ]),
    author: getMeta($, [
      "meta[name='author']",
      "meta[property='article:author']",
      "meta[name='twitter:creator']",
    ]),
    image: getMeta($, ["meta[property='og:image']", "meta[name='twitter:image']"]),
    publishedAt: toIsoIfDate(
      getMeta($, [
        "meta[property='article:published_time']",
        "meta[name='publish_date']",
        "meta[property='og:updated_time']",
      ]),
    ),
  };
  return {
    url,
    title: openGraph.title || normalizeWhitespace($("title").first().text()) || "Untitled",
    description: openGraph.description || "",
    author: openGraph.author || null,
    publishedAt: openGraph.publishedAt || null,
    image: openGraph.image || null,
    openGraph,
  };
}

async function extractRedditJson(url) {
  try {
    const jsonUrl = url.endsWith("/") ? `${url}.json` : `${url}/.json`;
    const listing = await fetchJson(jsonUrl, {}, 10000);
    const post = listing?.[0]?.data?.children?.[0]?.data;
    if (!post) return null;
    return {
      postId: post.id || null,
      author: post.author || null,
      title: post.title || "Untitled",
      caption: compactText(post.selftext || post.title || "", 350),
      date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
      media: post.url_overridden_by_dest || null,
      comments: post.num_comments || null,
      engagement: { likes: post.score || null },
      openGraph: {},
    };
  } catch (_error) {
    return null;
  }
}

function detectApifyActorStatus(platform) {
  if (!APIFY_TOKEN) return SOCIAL_STATUS_VALUES.API_MISSING;
  if (!APIFY_ACTOR_IDS[platform]) return SOCIAL_STATUS_VALUES.API_MISSING;
  return SOCIAL_STATUS_VALUES.CHECKED;
}

async function runApifyActor(platform, query) {
  const actorId = APIFY_ACTOR_IDS[platform];
  if (!APIFY_TOKEN || !actorId) {
    return { status: SOCIAL_STATUS_VALUES.API_MISSING, items: [] };
  }
  const url =
    `${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(APIFY_TOKEN)}&memory=512`;
  const input = {
    query,
    searchTerms: [query],
    queries: [query],
    maxItems: 12,
    resultsLimit: 12,
    maxResults: 12,
  };

  try {
    const items = await fetchJson(
      url,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) },
      18000,
    );
    return { status: SOCIAL_STATUS_VALUES.CHECKED, items: Array.isArray(items) ? items : [] };
  } catch (_error) {
    return { status: SOCIAL_STATUS_VALUES.FAILED, items: [] };
  }
}

function mapApifyItemToSource(platform, item) {
  const url = item.url || item.link || item.postUrl || item.permalink || item.videoUrl || null;
  const title = item.title || item.caption || item.text || item.description || "Untitled";
  const snippet = item.snippet || item.text || item.caption || item.description || "";
  const author = item.author || item.username || item.handle || item.channel || null;
  const date = item.date || item.createdAt || item.publishedAt || item.timestamp || null;
  const image = item.image || item.thumbnail || item.thumbnailUrl || item.displayUrl || null;
  return normalizeSource({
    sourceType: `${platform}_apify`,
    platform,
    title,
    url,
    snippet,
    author,
    date,
    image,
    engagement: {
      likes: item.likes || item.likeCount || null,
      shares: item.shares || item.shareCount || null,
      comments: item.comments || item.commentCount || null,
      views: item.views || item.viewCount || null,
    },
    metadata: { raw: item },
  });
}

async function searchBySite(platform, query, sites) {
  if (!query) {
    return { status: SOCIAL_STATUS_VALUES.SKIPPED, apiStatus: SOCIAL_STATUS_VALUES.SKIPPED, results: [] };
  }

  const apify = await runApifyActor(platform, query);
  const apifyResults = apify.items.map((item) => mapApifyItemToSource(platform, item)).filter((item) => item.url);
  if (apify.status === SOCIAL_STATUS_VALUES.CHECKED && apifyResults.length) {
    return { status: SOCIAL_STATUS_VALUES.CHECKED, apiStatus: SOCIAL_STATUS_VALUES.CHECKED, results: apifyResults };
  }

  const siteQueries = sites.map((site) => `site:${site} ${query}`);
  const fallbackTasks = siteQueries.map((siteQuery) =>
    SERPAPI_KEY ? serpWebSearch(siteQuery) : fallbackDuckDuckGo(siteQuery),
  );
  const settled = await Promise.allSettled(fallbackTasks);
  const fallbackResults = settled
    .filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value || [])
    .map((entry) => normalizeSource({ ...entry, platform }));

  if (fallbackResults.length) {
    return {
      status: SOCIAL_STATUS_VALUES.CHECKED,
      apiStatus: apify.status,
      results: fallbackResults,
    };
  }

  if (apify.status === SOCIAL_STATUS_VALUES.API_MISSING) {
    return { status: SOCIAL_STATUS_VALUES.API_MISSING, apiStatus: apify.status, results: [] };
  }
  return { status: SOCIAL_STATUS_VALUES.FAILED, apiStatus: apify.status, results: [] };
}

function makeSearchQueries(baseQuery, ocr, postExtract) {
  const ocrTokens = [
    ...(ocr?.handles || []).slice(0, 3),
    ...(ocr?.watermarks || []).slice(0, 2),
    ...(ocr?.logoCandidates || []).slice(0, 2),
  ];
  const queries = [
    baseQuery,
    postExtract?.caption,
    postExtract?.title,
    `"${baseQuery}"`,
    `${baseQuery} meme origin`,
    `${baseQuery} earliest post`,
    ...ocrTokens.map((token) => `${baseQuery} ${token}`),
  ]
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
  return [...new Set(queries)].slice(0, 8);
}

function clusterKey(entry) {
  const titleKey = normalizeWhitespace((entry.title || "").toLowerCase()).slice(0, 90);
  const snippetKey = normalizeWhitespace((entry.snippet || "").toLowerCase()).slice(0, 70);
  const authorKey = normalizeWhitespace((entry.author || "").toLowerCase());
  if (entry.url) return `url:${entry.url.toLowerCase()}`;
  if (entry.image) return `img:${entry.image.toLowerCase()}`;
  if (titleKey && authorKey) return `ta:${titleKey}|${authorKey}`;
  if (titleKey) return `t:${titleKey}`;
  return `s:${snippetKey}`;
}

function clusterAndPickStrongest(entries) {
  const clusters = new Map();
  entries.forEach((entry) => {
    const key = clusterKey(entry);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(entry);
  });
  return [...clusters.values()].map((group) => group.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0]);
}

function pickEarliest(entries) {
  const dated = entries.filter((entry) => entry.publishedAt);
  if (!dated.length) return null;
  return dated.slice().sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))[0];
}

function domainAuthorityScore(url) {
  const platform = getPlatformFromUrl(url || "");
  const map = {
    x: 8,
    tiktok: 8,
    instagram: 8,
    facebook: 7,
    reddit: 8,
    youtube: 8,
    wikipedia: 10,
    news: 9,
    "knowyourmeme.com": 9,
  };
  return map[platform] || 5;
}

function scoreSource(source, context) {
  let score = 15;
  const reasons = [];
  const text = `${source.title} ${source.snippet}`.toLowerCase();

  if (source.publishedAt) {
    const daysOld = (Date.now() - Date.parse(source.publishedAt)) / (1000 * 60 * 60 * 24);
    if (daysOld > 180) {
      score += 20;
      reasons.push("older timestamp");
    } else if (daysOld > 30) {
      score += 12;
      reasons.push("dated source");
    }
  }

  const exactCaption = context.keyPhrases.some((phrase) => phrase.length > 4 && text.includes(phrase.toLowerCase()));
  if (exactCaption) {
    score += 15;
    reasons.push("exact caption/phrase match");
  }

  if (source.visualScore) {
    score += Math.min(20, Math.round(source.visualScore / 5));
    reasons.push("visual similarity match");
  }

  if (context.creatorHints.some((hint) => hint && source.author && source.author.toLowerCase().includes(hint))) {
    score += 12;
    reasons.push("original creator handle hint");
  }

  if (context.watermarkHints.some((hint) => hint && text.includes(hint.toLowerCase()))) {
    score += 10;
    reasons.push("watermark/ocr clue overlap");
  }

  if (source.linkedOriginalSource) {
    score += 8;
    reasons.push("links to potential original source");
  }

  if (/(repost|compilation|reaction|mirror|reupload|duet)/i.test(text)) {
    score -= 14;
    reasons.push("repost/copy signal");
  }

  const authority = domainAuthorityScore(source.url);
  score += authority;
  reasons.push("source authority");

  const host = getPlatformFromUrl(source.url || "");
  if ((context.hostFrequency[host] || 0) > 1) {
    score += 6;
    reasons.push("cross-source corroboration");
  }

  const backLinks = context.backLinks[source.url] || 0;
  if (backLinks > 0) {
    score += Math.min(12, backLinks * 3);
    reasons.push("other posts point back here");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function originLikelihood(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function confidenceBand(value) {
  if (value >= 78) return "strong";
  if (value >= 55) return "okay";
  return "weak";
}

function confidenceReason(value) {
  if (value >= 78) return "Multiple early and corroborated cross-platform sources agree.";
  if (value >= 55) return "Signals are decent, but some provenance fields are incomplete.";
  return "Evidence is sparse or conflicting, so origin remains uncertain.";
}

function sourceClaimPrefix(score) {
  if (score >= 82) return "confirmed original source";
  if (score >= 65) return "likely original source";
  return "possible original source";
}

function buildLore(entries, ocr) {
  const lines = [];
  if (ocr?.text) lines.push(`OCR clues: ${compactText(ocr.text, 170)}`);
  entries
    .map((entry) => entry.snippet)
    .filter(Boolean)
    .slice(0, 3)
    .forEach((snippet) => lines.push(compactText(snippet, 170)));
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : "Not enough textual context found yet.";
}

function buildWhyViral(entries) {
  const social = entries.filter((entry) => SOCIAL_PLATFORMS.includes(entry.platform)).length;
  const visual = entries.filter((entry) => entry.sourceType === "visual_match").length;
  const reasons = [];
  if (social >= 4) reasons.push("cross-platform meme propagation");
  if (visual >= 3) reasons.push("repeated visual matches across reposts");
  if (entries.some((entry) => entry.sourceType.includes("news"))) reasons.push("index/news pickup");
  return reasons.length ? `${reasons.join(", ")}.` : "Viral spread signals are still limited.";
}

function buildRedFlags(inputType, entries, confidenceScore) {
  const flags = [];
  if ([INPUT_TYPES.IMAGE_UPLOAD, INPUT_TYPES.SCREENSHOT_UPLOAD].includes(inputType)) {
    flags.push("image-only trails can hide original uploader");
  }
  if (entries.filter((entry) => !entry.publishedAt).length > entries.length / 2) {
    flags.push("many sources missing clear timestamps");
  }
  if (confidenceScore < 65) {
    flags.push("origin currently uncertain");
  }
  return flags.length ? `${flags.join("; ")}.` : "No major red flags.";
}

function buildVerdict(entries) {
  const earliest = pickEarliest(entries);
  if (!earliest) return "mid";
  const daysOld = (Date.now() - Date.parse(earliest.publishedAt)) / (1000 * 60 * 60 * 24);
  if (daysOld <= 3) return "early";
  if (daysOld <= 21) return "mid";
  if (daysOld <= 120) return "late";
  return "dead";
}

function toFormattedReport(result) {
  const lines = [
    `Name: ${result.name}`,
    `What it is: ${result.whatItIs}`,
    `Original source: ${result.originalSource || "Unknown"}`,
    `Earliest post found: ${result.earliestPostFound || "Unknown"}`,
    `Lore: ${result.lore}`,
    `Why it is viral: ${result.whyViral}`,
    "Best links:",
  ];
  if (!result.bestLinks.length) {
    lines.push("- None");
  } else {
    result.bestLinks.forEach((link) => {
      lines.push(
        `- [${link.platform}] ${link.title} | author: ${link.author || "unknown"} | ${link.date || "unknown"} | ${link.url} | confidence ${link.confidence}/100 (${link.originLikelihood}) | why: ${link.whyItMatters} | snippet: ${link.snippet || "N/A"}`,
      );
    });
  }
  lines.push(`Red flags: ${result.redFlags}`);
  lines.push(`Confidence Score: ${result.confidenceScore}`);
  lines.push(`Source Quality: ${result.sourceQuality}`);
  lines.push(`Verdict: ${result.verdict}`);
  return lines.join("\n");
}

app.post("/api/research", upload.single("file"), async (req, res) => {
  try {
    const rawInput = (req.body?.input || "").trim();
    const inputType = detectInputType(rawInput, req.file);
    const isUrlInput = isLikelyUrl(rawInput);
    const baseQuery =
      (isUrlInput ? phraseFromUrl(rawInput) : rawInput) ||
      req.file?.originalname?.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[_-]+/g, " ") ||
      "";
    if (!baseQuery && !req.file) {
      return res.status(400).json({ error: "Provide text/link input or upload an image." });
    }

    const coverage = [];
    const errors = [];
    const sources = [];
    const socialSourcesChecked = {};
    SOCIAL_PLATFORMS.forEach((platform) => {
      socialSourcesChecked[platform] = { status: SOCIAL_STATUS_VALUES.SKIPPED, detail: "not searched yet" };
    });

    let ocr = null;
    let reverseImage = { hostedImageUrl: null, visualMatches: [], reverseSearchLinks: [] };
    let extractedPost = null;

    const preTasks = [];
    if (req.file && req.file.mimetype?.startsWith("image/")) {
      preTasks.push(
        (async () => {
          try {
            const hosted = await uploadImage(req.file);
            const encoded = encodeURIComponent(hosted);
            reverseImage.hostedImageUrl = hosted;
            reverseImage.reverseSearchLinks = [
              `https://lens.google.com/uploadbyurl?url=${encoded}`,
              `https://www.bing.com/images/search?q=imgurl:${encoded}&view=detailv2&iss=sbi`,
              `https://yandex.com/images/search?rpt=imageview&url=${encoded}`,
            ];
            coverage.push("image_upload");
          } catch (error) {
            errors.push(`image upload failed: ${error.message}`);
          }
        })(),
      );
      preTasks.push(
        (async () => {
          try {
            ocr = await runOCR(req.file);
            coverage.push("ocr");
          } catch (error) {
            errors.push(`ocr failed: ${error.message}`);
          }
        })(),
      );
    }

    if (isUrlInput) {
      preTasks.push(
        (async () => {
          try {
            const adapter = getAdapterForUrl(rawInput);
            const adapterContext = {
              extractOpenGraph,
              extractRedditJson,
              extractLinkedSource,
              extractEngagementFromText,
              detectRepostIndicators,
            };
            extractedPost = await adapter.extractFromUrl(rawInput, adapterContext);
            coverage.push(`url_extract:${adapter.platform}`);
            sources.push(
              normalizeSource({
                sourceType: "post_extract",
                platform: extractedPost.platform,
                title: extractedPost.title,
                url: extractedPost.url,
                snippet: extractedPost.caption,
                author: extractedPost.author,
                date: extractedPost.date,
                image: extractedPost.media,
                comments: extractedPost.comments,
                engagement: extractedPost.engagement,
                linkedOriginalSource: extractedPost.linkedOriginalSource,
              }),
            );
          } catch (error) {
            errors.push(`url extraction failed: ${error.message}`);
          }
        })(),
      );
    }

    await Promise.allSettled(preTasks);

    if (reverseImage.hostedImageUrl && SERPAPI_KEY) {
      try {
        const lensMatches = await serpGoogleLens(reverseImage.hostedImageUrl);
        reverseImage.visualMatches = lensMatches.slice(0, 10).map((entry, index) => ({
          rank: index + 1,
          title: entry.title,
          source: entry.platform,
          link: entry.url,
          image: entry.image,
          snippet: entry.snippet,
          visualScore: entry.visualScore,
        }));
        sources.push(...lensMatches);
        coverage.push("serpapi_lens");
      } catch (error) {
        errors.push(`serpapi lens failed: ${error.message}`);
      }
    }

    const effectiveQuery = extractedPost?.title || baseQuery;
    const queries = makeSearchQueries(effectiveQuery, ocr, extractedPost);

    const broadTasks = [
      SERPAPI_KEY ? serpWebSearch(queries[0] || effectiveQuery) : fallbackDuckDuckGo(queries[0] || effectiveQuery),
      SERPAPI_KEY ? serpNewsSearch(effectiveQuery) : fallbackNewsRss(effectiveQuery),
    ];
    const broadSettled = await Promise.allSettled(broadTasks);
    if (broadSettled[0]?.status === "fulfilled") {
      coverage.push("web");
      sources.push(...broadSettled[0].value);
    } else if (broadSettled[0]) {
      errors.push(`web search failed: ${broadSettled[0].reason?.message || "unknown"}`);
    }
    if (broadSettled[1]?.status === "fulfilled") {
      coverage.push("news");
      sources.push(...broadSettled[1].value);
    } else if (broadSettled[1]) {
      errors.push(`news search failed: ${broadSettled[1].reason?.message || "unknown"}`);
    }

    const adapterContext = {
      searchBySite,
      normalizeSource,
      extractOpenGraph,
      extractRedditJson,
      extractLinkedSource,
      extractEngagementFromText,
      detectRepostIndicators,
    };

    const socialAdapters = getSocialAdapters();
    const socialPlatformTasks = socialAdapters.map(async (adapter) => {
      const perQueryTasks = queries.slice(0, 3).map((query) => adapter.searchPlatform(query, adapterContext));
      const settled = await Promise.allSettled(perQueryTasks);
      const results = [];
      let hasChecked = false;
      let hasApiMissing = detectApifyActorStatus(adapter.platform) === SOCIAL_STATUS_VALUES.API_MISSING;
      let hasFailed = false;

      settled.forEach((entry) => {
        if (entry.status === "fulfilled") {
          const payload = entry.value;
          (payload.results || []).forEach((item) => results.push(adapter.normalizeResult(item, adapterContext)));
          if (payload.status === SOCIAL_STATUS_VALUES.CHECKED) hasChecked = true;
          if (payload.status === SOCIAL_STATUS_VALUES.API_MISSING) hasApiMissing = true;
          if (payload.status === SOCIAL_STATUS_VALUES.FAILED) hasFailed = true;
        } else {
          hasFailed = true;
          errors.push(`${adapter.platform} search failed: ${entry.reason?.message || "unknown error"}`);
        }
      });

      if (hasChecked) {
        socialSourcesChecked[adapter.platform] = {
          status: SOCIAL_STATUS_VALUES.CHECKED,
          detail: hasApiMissing ? "checked via fallback; Apify API missing" : "checked",
        };
      } else if (hasApiMissing && !hasFailed) {
        socialSourcesChecked[adapter.platform] = {
          status: SOCIAL_STATUS_VALUES.API_MISSING,
          detail: "Apify token/actor missing and no fallback hits",
        };
      } else if (hasFailed) {
        socialSourcesChecked[adapter.platform] = { status: SOCIAL_STATUS_VALUES.FAILED, detail: "search failed" };
      } else {
        socialSourcesChecked[adapter.platform] = { status: SOCIAL_STATUS_VALUES.SKIPPED, detail: "no query" };
      }
      return results;
    });

    const socialResults = await Promise.allSettled(socialPlatformTasks);
    socialResults.forEach((entry) => {
      if (entry.status === "fulfilled") {
        sources.push(...entry.value);
      }
    });

    const cleaned = sources
      .filter((entry) => entry.url)
      .map((entry) => ({ ...entry, title: compactText(entry.title, 180), snippet: compactText(entry.snippet, 320) }));

    const dedupByUrl = new Map();
    cleaned.forEach((entry) => {
      const key = `${entry.url}|${entry.title}`.toLowerCase();
      if (!dedupByUrl.has(key)) dedupByUrl.set(key, entry);
    });
    const deduped = [...dedupByUrl.values()];

    const backLinks = {};
    deduped.forEach((entry) => {
      deduped.forEach((candidate) => {
        if (!entry.url || entry === candidate) return;
        const text = `${candidate.snippet} ${candidate.title}`;
        if (text.includes(entry.url)) {
          backLinks[entry.url] = (backLinks[entry.url] || 0) + 1;
        }
      });
    });

    const hostFrequency = deduped.reduce((acc, entry) => {
      const host = getPlatformFromUrl(entry.url || "");
      acc[host] = (acc[host] || 0) + 1;
      return acc;
    }, {});

    const creatorHints = [
      extractedPost?.author ? extractedPost.author.replace(/^@/, "").toLowerCase() : null,
      ...(ocr?.handles || []).map((value) => value.replace(/^[@#]/, "").toLowerCase()),
    ].filter(Boolean);

    const context = {
      keyPhrases: [effectiveQuery, rawInput, extractedPost?.caption || "", ...(ocr?.handles || [])]
        .map((item) => normalizeWhitespace(item))
        .filter(Boolean),
      watermarkHints: [...(ocr?.handles || []), ...(ocr?.watermarks || [])],
      creatorHints,
      hostFrequency,
      backLinks,
    };

    const scored = deduped.map((entry) => {
      const scoredEntry = scoreSource(entry, context);
      return { ...entry, score: scoredEntry.score, scoreReasons: scoredEntry.reasons };
    });

    const clustered = clusterAndPickStrongest(scored).sort((a, b) => b.score - a.score);
    const earliest = pickEarliest(clustered);
    const top = clustered[0] || null;
    const confidenceScore = top
      ? Math.min(100, Math.round(top.score * 0.72 + Math.min(25, clustered.length * 1.8)))
      : 18;
    const sourceQuality = confidenceBand(confidenceScore);
    const sourcePrefix = sourceClaimPrefix(confidenceScore);

    const bestLinks = clustered.slice(0, 8).map((entry) => ({
      platform: entry.platform,
      title: entry.title,
      author: entry.author,
      date: toDateOnly(entry.publishedAt),
      url: entry.url,
      snippet: entry.snippet,
      whyItMatters: entry.scoreReasons.slice(0, 4).join(", ") || "context signal",
      confidence: entry.score,
      originLikelihood: originLikelihood(entry.score),
    }));

    const result = {
      inputType,
      name: compactText(top?.title || extractedPost?.title || effectiveQuery || "Unknown", 100),
      whatItIs: `Detected as ${inputType.replace(/_/g, " ")}. Aggregated ${clustered.length} clustered social/web sources.`,
      originalSource: top ? `${sourcePrefix}: ${top.title} (${top.url})` : null,
      earliestPostFound: earliest
        ? `${earliest.publishedAt || "Unknown date"} - ${earliest.title} (${earliest.url})`
        : null,
      lore: buildLore(clustered, ocr),
      whyViral: buildWhyViral(clustered),
      bestLinks,
      redFlags: buildRedFlags(inputType, clustered, confidenceScore),
      confidenceScore,
      sourceQuality,
      confidenceReason: confidenceReason(confidenceScore),
      verdict: buildVerdict(clustered),
      reverseImage,
      extractedPost,
      ocr,
      socialSourcesChecked,
      coverage: [...new Set(coverage)],
      evidence: clustered.slice(0, 25),
      errors,
    };

    return res.json({ result, formatted: toFormattedReport(result) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Research failed unexpectedly." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    serpApiConfigured: Boolean(SERPAPI_KEY),
    apifyConfigured: Boolean(APIFY_TOKEN),
  });
});

app.listen(PORT, () => {
  console.log(`Viral Lore Agent running on http://localhost:${PORT}`);
});
