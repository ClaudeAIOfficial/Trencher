const express = require("express");
const multer = require("multer");
const cheerio = require("cheerio");
const Tesseract = require("tesseract.js");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const PORT = process.env.PORT || 3000;
const SERP_API_BASE = "https://serpapi.com/search.json";
const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const DEFAULT_TIMEOUT_MS = 12000;

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
  RANDOM_SENTENCE: "random_sentence",
  CAPTION: "caption",
  NAME_OR_ENTITY: "name_or_entity",
  UNKNOWN: "unknown",
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
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : new Date(ts).toISOString();
}

function toDateOnly(value) {
  const iso = toIsoIfDate(value);
  return iso ? iso.slice(0, 10) : null;
}

function isLikelyUrl(value) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function getPlatformFromUrl(value) {
  if (!isLikelyUrl(value)) return "web";
  const host = new URL(value).hostname.toLowerCase();
  if (host.includes("x.com") || host.includes("twitter.com")) return "x";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("reddit.com") || host.includes("redd.it")) return "reddit";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("wikipedia.org")) return "wikipedia";
  if (host.includes("news.google.com")) return "news";
  return host.replace(/^www\./, "");
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
    if (platform === "instagram") return INPUT_TYPES.INSTAGRAM_URL;
    if (platform === "facebook") return INPUT_TYPES.FACEBOOK_URL;
    if (platform === "tiktok") return INPUT_TYPES.TIKTOK_URL;
    if (platform === "reddit") return INPUT_TYPES.REDDIT_URL;
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
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) ViralLoreAgent/2.0",
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}, timeoutMs) {
  const response = await fetchWithTimeout(
    url,
    { ...options, headers: { accept: "application/json,text/plain,*/*", ...(options.headers || {}) } },
    timeoutMs,
  );
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`);
  return response.json();
}

async function fetchText(url, options = {}, timeoutMs) {
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

function makeQueryCandidates(baseQuery, ocr) {
  const seed = [
    baseQuery,
    `"${baseQuery}"`,
    `${baseQuery} meme origin`,
    `${baseQuery} earliest post`,
    `${baseQuery} lore`,
    ...(ocr?.handles || []).slice(0, 3).map((h) => `${baseQuery} ${h}`),
    ...(ocr?.watermarks || []).slice(0, 2).map((w) => `${baseQuery} ${w}`),
  ]
    .map((v) => normalizeWhitespace(v))
    .filter(Boolean);
  return [...new Set(seed)].slice(0, 8);
}

function phraseFromUrl(url) {
  if (!isLikelyUrl(url)) return "";
  const parsed = new URL(url);
  return `${parsed.pathname} ${parsed.search}`
    .replace(/[/?&=_\-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !/^\d+$/.test(token))
    .slice(0, 10)
    .join(" ");
}

function unwrapDuckDuckGoUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
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

function normalizeSource(raw, defaults = {}) {
  return {
    sourceType: raw.sourceType || defaults.sourceType || "web",
    platform: raw.platform || getPlatformFromUrl(raw.url || "") || defaults.platform || "web",
    title: compactText(raw.title || "Untitled", 180),
    url: raw.url || null,
    snippet: compactText(raw.snippet || "", 300),
    publishedAt: toIsoIfDate(raw.publishedAt || raw.date || null),
    author: raw.author || null,
    image: raw.image || null,
    visualScore: raw.visualScore || 0,
    rank: raw.rank || null,
    repostHint: raw.repostHint || false,
    metadata: raw.metadata || {},
  };
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
  const handles = [...new Set((text.match(/[@#][a-zA-Z0-9._]{2,30}/g) || []).slice(0, 15))];
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
  const organic = data?.organic_results || [];
  return organic.map((item) =>
    normalizeSource({
      sourceType: "web",
      platform: getPlatformFromUrl(item.link),
      title: item.title,
      url: item.link,
      snippet: item.snippet || item.snippet_highlighted_words?.join(" "),
      date: item.date,
      rank: item.position,
    }),
  );
}

async function serpNewsSearch(query) {
  const data = await serpApiRequest({ engine: "google_news", q: query, num: 10 });
  const items = data?.news_results || [];
  return items.map((item) =>
    normalizeSource({
      sourceType: "news",
      platform: getPlatformFromUrl(item.link),
      title: item.title,
      url: item.link,
      snippet: item.snippet || "",
      date: item.date,
      image: item.thumbnail,
      rank: item.position,
      metadata: { sourceName: item.source?.name || null },
    }),
  );
}

async function serpGoogleLens(imageUrl) {
  const data = await serpApiRequest({ engine: "google_lens", url: imageUrl }, 18000);
  const visual = data?.visual_matches || [];
  const converted = visual.map((item, index) =>
    normalizeSource({
      sourceType: "visual_match",
      platform: getPlatformFromUrl(item.link),
      title: item.title,
      url: item.link,
      snippet: item.source || item.snippet || "",
      image: item.thumbnail,
      visualScore: Math.max(0, 100 - index * 6),
      rank: index + 1,
    }),
  );
  return { visualMatches: converted, raw: data };
}

async function fallbackDuckDuckGo(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url, {}, 10000);
  const $ = cheerio.load(html);
  const results = [];
  $(".result").each((_idx, node) => {
    const title = normalizeWhitespace($(node).find(".result__title").text());
    const href = unwrapDuckDuckGoUrl($(node).find("a.result__a").attr("href"));
    const snippet = normalizeWhitespace($(node).find(".result__snippet").text());
    if (!title || !href) return;
    results.push(
      normalizeSource({
        sourceType: "web_fallback",
        platform: getPlatformFromUrl(href),
        title,
        url: href,
        snippet,
      }),
    );
  });
  return results.slice(0, 8);
}

async function fallbackNewsRss(query) {
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await fetchText(rss, {}, 10000);
  const $ = cheerio.load(xml, { xmlMode: true });
  const out = [];
  $("item").each((_idx, node) => {
    const title = normalizeWhitespace($(node).find("title").first().text());
    const link = normalizeWhitespace($(node).find("link").first().text());
    const date = normalizeWhitespace($(node).find("pubDate").first().text());
    if (!title || !link) return;
    out.push(normalizeSource({ sourceType: "news_fallback", title, url: link, date }));
  });
  return out.slice(0, 8);
}

async function searchReddit(query) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10`;
  const data = await fetchJson(url, {}, 10000);
  const posts = data?.data?.children || [];
  return posts.map((entry) => {
    const post = entry.data;
    return normalizeSource({
      sourceType: "reddit",
      platform: "reddit",
      title: post.title,
      url: `https://www.reddit.com${post.permalink}`,
      snippet: post.selftext || "",
      author: post.author || null,
      date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
      rank: null,
    });
  });
}

function isLikelyPostUrl(type) {
  return [
    INPUT_TYPES.POST_URL,
    INPUT_TYPES.X_URL,
    INPUT_TYPES.INSTAGRAM_URL,
    INPUT_TYPES.FACEBOOK_URL,
    INPUT_TYPES.TIKTOK_URL,
    INPUT_TYPES.REDDIT_URL,
  ].includes(type);
}

function getMeta($, selectors) {
  for (const selector of selectors) {
    const value = $(selector).attr("content");
    if (value) return normalizeWhitespace(value);
  }
  return null;
}

async function extractPostDetails(url) {
  const platform = getPlatformFromUrl(url);
  if (platform === "reddit") {
    const jsonUrl = url.endsWith("/") ? `${url}.json` : `${url}/.json`;
    const listing = await fetchJson(jsonUrl, {}, 10000);
    const postData = listing?.[0]?.data?.children?.[0]?.data;
    if (postData) {
      return {
        sourceType: "post_extract",
        platform,
        url: `https://www.reddit.com${postData.permalink}`,
        title: postData.title || "Untitled",
        description: compactText(postData.selftext || ""),
        author: postData.author || null,
        publishedAt: postData.created_utc ? new Date(postData.created_utc * 1000).toISOString() : null,
        image: postData.url_overridden_by_dest || null,
        openGraph: {},
      };
    }
  }

  const html = await fetchText(url, {}, 12000);
  const $ = cheerio.load(html);
  const og = {
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
  const title = og.title || normalizeWhitespace($("title").first().text()) || "Untitled";
  return {
    sourceType: "post_extract",
    platform,
    url,
    title,
    description: og.description || "",
    author: og.author || null,
    publishedAt: og.publishedAt || null,
    image: og.image || null,
    openGraph: og,
  };
}

function uniqueByUrlAndTitle(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = `${entry.url || ""}|${entry.title || ""}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

function domainAuthorityScore(url) {
  if (!url) return 0;
  const host = getPlatformFromUrl(url);
  const authority = {
    reddit: 7,
    x: 7,
    instagram: 7,
    tiktok: 7,
    facebook: 7,
    wikipedia: 10,
    youtube: 8,
    news: 9,
    "nytimes.com": 10,
    "bbc.com": 10,
    "theguardian.com": 9,
    "knowyourmeme.com": 8,
  };
  return authority[host] || 4;
}

function scoreSource(source, context) {
  let score = 10;
  const reasons = [];
  if (source.publishedAt) {
    const daysOld = (Date.now() - Date.parse(source.publishedAt)) / (1000 * 60 * 60 * 24);
    if (daysOld > 30) {
      score += 16;
      reasons.push("older timestamp");
    } else if (daysOld > 7) {
      score += 8;
      reasons.push("dated source");
    }
  }

  const haystack = `${source.title} ${source.snippet}`.toLowerCase();
  const exact = context.keyPhrases.some((phrase) => phrase && haystack.includes(phrase.toLowerCase()));
  if (exact) {
    score += 14;
    reasons.push("exact phrase overlap");
  }

  if (source.visualScore > 0) {
    score += Math.min(18, Math.round(source.visualScore / 6));
    reasons.push("visual similarity");
  }

  if (source.sourceType === "post_extract") {
    score += 18;
    reasons.push("direct post extraction");
  }

  const repostWords = /(repost|compilation|reaction|mirror|reupload|recap)/i;
  if (repostWords.test(`${source.title} ${source.snippet}`)) {
    score -= 12;
    reasons.push("possible repost signal");
  }

  const authority = domainAuthorityScore(source.url);
  score += authority;
  reasons.push("source authority");

  if (context.ocrHandles.some((handle) => haystack.includes(handle.toLowerCase()))) {
    score += 8;
    reasons.push("handle watermark overlap");
  }

  const host = getPlatformFromUrl(source.url || "");
  const pointingBack = context.hostFrequency[host] > 1;
  if (pointingBack) {
    score += 6;
    reasons.push("corroborated by other sources");
  }

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, reasons };
}

function pickEarliest(entries) {
  const dated = entries.filter((item) => item.publishedAt);
  if (!dated.length) return null;
  return dated.slice().sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))[0];
}

function buildLore(entries, ocr) {
  const lines = [];
  if (ocr?.text) lines.push(`OCR clues: ${compactText(ocr.text, 160)}`);
  const snippets = entries
    .map((e) => e.snippet)
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => compactText(text, 160));
  snippets.forEach((s) => lines.push(s));
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : "Not enough textual context found yet.";
}

function buildWhyViral(entries) {
  const social = entries.filter((e) => ["x", "instagram", "facebook", "tiktok", "reddit"].includes(e.platform)).length;
  const visual = entries.filter((e) => e.sourceType === "visual_match").length;
  const news = entries.filter((e) => e.sourceType.includes("news")).length;
  const reasons = [];
  if (social >= 3) reasons.push("cross-platform social spread");
  if (visual >= 3) reasons.push("strong visual repost trails");
  if (news >= 1) reasons.push("news/index coverage");
  return reasons.length ? `${reasons.join(", ")}.` : "Signals are still limited across platforms.";
}

function buildRedFlags(inputType, entries, confidenceScore) {
  const flags = [];
  if ([INPUT_TYPES.IMAGE_UPLOAD, INPUT_TYPES.SCREENSHOT_UPLOAD].includes(inputType)) {
    flags.push("image evidence can be reposted without provenance");
  }
  if (entries.filter((e) => !e.publishedAt).length > entries.length / 2) {
    flags.push("many sources missing dates");
  }
  if (confidenceScore < 60) {
    flags.push("origin remains uncertain; treat as possible original source");
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
        `- [${link.platform}] ${link.title} | ${link.url} | date: ${link.date || "unknown"} | confidence: ${link.confidence}/100 | why: ${link.whyItMatters} | snippet: ${link.snippet || "N/A"}`,
      );
    });
  }

  lines.push(`Red flags: ${result.redFlags}`);
  lines.push(`Confidence Score: ${result.confidenceScore}`);
  lines.push(`Source Quality: ${result.sourceQuality}`);
  lines.push(`Confidence reason: ${result.confidenceReason}`);
  lines.push(`Verdict: ${result.verdict}`);
  return lines.join("\n");
}

app.post("/api/research", upload.single("file"), async (req, res) => {
  try {
    const rawInput = (req.body?.input || "").trim();
    const inputType = detectInputType(rawInput, req.file);
    const baseQuery =
      (isLikelyUrl(rawInput) ? phraseFromUrl(rawInput) : rawInput) ||
      req.file?.originalname?.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[_-]+/g, " ") ||
      "";

    if (!baseQuery && !req.file) {
      return res.status(400).json({ error: "Provide text/link input or upload an image." });
    }

    const coverage = [];
    const sources = [];
    const errors = [];
    let ocr = null;
    let postExtract = null;
    let reverseImage = { hostedImageUrl: null, visualMatches: [], reverseSearchLinks: [] };

    const initialTasks = [];

    if (req.file && req.file.mimetype?.startsWith("image/")) {
      initialTasks.push(
        (async () => {
          const hostedImageUrl = await uploadImage(req.file);
          const encoded = encodeURIComponent(hostedImageUrl);
          reverseImage.hostedImageUrl = hostedImageUrl;
          reverseImage.reverseSearchLinks = [
            `https://lens.google.com/uploadbyurl?url=${encoded}`,
            `https://www.bing.com/images/search?q=imgurl:${encoded}&view=detailv2&iss=sbi`,
            `https://yandex.com/images/search?rpt=imageview&url=${encoded}`,
          ];
          coverage.push("image_upload");
        })(),
      );

      initialTasks.push(
        (async () => {
          ocr = await runOCR(req.file);
          coverage.push("ocr");
        })(),
      );
    }

    if (isLikelyPostUrl(inputType) && isLikelyUrl(rawInput)) {
      initialTasks.push(
        (async () => {
          postExtract = await extractPostDetails(rawInput);
          sources.push(
            normalizeSource({
              sourceType: "post_extract",
              platform: postExtract.platform,
              title: postExtract.title,
              url: postExtract.url,
              snippet: postExtract.description,
              date: postExtract.publishedAt,
              author: postExtract.author,
              image: postExtract.image,
            }),
          );
          coverage.push("post_extract");
        })(),
      );
    }

    const initialSettled = await Promise.allSettled(initialTasks);
    initialSettled.forEach((task) => {
      if (task.status === "rejected") errors.push(task.reason?.message || "initial task failed");
    });

    if (SERPAPI_KEY && reverseImage.hostedImageUrl) {
      try {
        const lens = await serpGoogleLens(reverseImage.hostedImageUrl);
        reverseImage.visualMatches = lens.visualMatches.slice(0, 10).map((entry) => ({
          rank: entry.rank,
          title: entry.title,
          source: entry.platform,
          link: entry.url,
          image: entry.image,
          snippet: entry.snippet,
          visualScore: entry.visualScore,
        }));
        sources.push(...lens.visualMatches);
        coverage.push("serpapi_lens");
      } catch (error) {
        errors.push(`serpapi lens failed: ${error.message}`);
        coverage.push("serpapi_lens_failed");
      }
    }

    const effectiveQuery = postExtract?.title || baseQuery;
    const queries = makeQueryCandidates(effectiveQuery, ocr);
    const phraseMatches = [effectiveQuery, rawInput, ...(ocr?.handles || [])].filter(Boolean);

    const searchTasks = [];
    const addTask = (name, task) => searchTasks.push({ name, task });

    queries.slice(0, 3).forEach((query) => {
      addTask(`web:${query}`, SERPAPI_KEY ? serpWebSearch(query) : fallbackDuckDuckGo(query));
    });

    addTask("news", SERPAPI_KEY ? serpNewsSearch(effectiveQuery) : fallbackNewsRss(effectiveQuery));
    addTask("reddit", searchReddit(effectiveQuery));

    ["x.com", "instagram.com", "facebook.com", "tiktok.com"].forEach((site) => {
      const socialQuery = `site:${site} ${effectiveQuery}`;
      addTask(
        `social:${site}`,
        SERPAPI_KEY ? serpWebSearch(socialQuery) : fallbackDuckDuckGo(socialQuery),
      );
    });

    const settled = await Promise.allSettled(searchTasks.map((item) => item.task));
    settled.forEach((result, index) => {
      const taskName = searchTasks[index].name;
      if (result.status === "fulfilled") {
        sources.push(...result.value);
        coverage.push(taskName);
      } else {
        coverage.push(`${taskName}_failed`);
        errors.push(`${taskName}: ${result.reason?.message || "failed"}`);
      }
    });

    const deduped = uniqueByUrlAndTitle(sources).filter((item) => item.url);
    const hostFrequency = deduped.reduce((acc, item) => {
      const host = getPlatformFromUrl(item.url);
      acc[host] = (acc[host] || 0) + 1;
      return acc;
    }, {});

    const context = {
      keyPhrases: phraseMatches.map((v) => normalizeWhitespace(v)).filter(Boolean),
      ocrHandles: ocr?.handles || [],
      hostFrequency,
    };

    const scored = deduped.map((item) => {
      const score = scoreSource(item, context);
      return { ...item, score: score.score, scoreReasons: score.reasons };
    });
    scored.sort((a, b) => b.score - a.score);

    const earliest = pickEarliest(scored);
    const originalCandidate = scored[0] || null;
    const confidenceScore = scored.length
      ? Math.min(100, Math.round(scored[0].score * 0.7 + Math.min(30, scored.length * 1.5)))
      : 15;
    const sourceQuality = confidenceScore >= 75 ? "strong" : confidenceScore >= 50 ? "okay" : "weak";
    const confidenceReason =
      confidenceScore >= 75
        ? "Multiple high-authority, cross-linked signals agree on likely origin."
        : confidenceScore >= 50
          ? "Some corroboration exists, but key provenance fields are incomplete."
          : "Sparse or conflicting evidence; origin is only a possible match.";

    const originalPrefix = confidenceScore < 60 ? "possible original source: " : "";

    const bestLinks = scored.slice(0, 8).map((item) => ({
      platform: item.platform,
      title: item.title,
      url: item.url,
      date: toDateOnly(item.publishedAt),
      snippet: item.snippet,
      whyItMatters: item.scoreReasons.slice(0, 3).join(", ") || "supporting context",
      confidence: item.score,
    }));

    const result = {
      inputType,
      name: compactText(
        postExtract?.title || (scored[0] && scored[0].title) || effectiveQuery || rawInput || "Unknown",
        100,
      ),
      whatItIs: `Detected as ${inputType.replace(/_/g, " ")}. Aggregated ${scored.length} ranked sources.`,
      originalSource: originalCandidate
        ? `${originalPrefix}${originalCandidate.title} (${originalCandidate.url})`
        : null,
      earliestPostFound: earliest
        ? `${earliest.publishedAt || "Unknown date"} - ${earliest.title} (${earliest.url})`
        : null,
      lore: buildLore(scored, ocr),
      whyViral: buildWhyViral(scored),
      bestLinks,
      redFlags: buildRedFlags(inputType, scored, confidenceScore),
      confidenceScore,
      sourceQuality,
      confidenceReason,
      verdict: buildVerdict(scored),
      reverseImage,
      extractedPost: postExtract,
      ocr,
      coverage: [...new Set(coverage)],
      evidence: scored.slice(0, 25),
      errors,
    };

    return res.json({ result, formatted: toFormattedReport(result) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Research failed unexpectedly." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, serpApiConfigured: Boolean(SERPAPI_KEY) });
});

app.listen(PORT, () => {
  console.log(`Viral Lore Agent running on http://localhost:${PORT}`);
});
