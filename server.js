const express = require("express");
const multer = require("multer");
const cheerio = require("cheerio");

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const PORT = process.env.PORT || 3000;

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

function isLikelyUrl(value) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function detectInputType(rawInput, file) {
  if (file && file.mimetype?.startsWith("image/")) {
    const name = file.originalname.toLowerCase();
    if (name.includes("screen") || name.includes("screenshot")) {
      return INPUT_TYPES.SCREENSHOT_UPLOAD;
    }
    return INPUT_TYPES.IMAGE_UPLOAD;
  }

  const input = (rawInput || "").trim();
  if (!input) return INPUT_TYPES.UNKNOWN;

  if (isLikelyUrl(input)) {
    const host = new URL(input).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return INPUT_TYPES.X_URL;
    if (host.includes("instagram.com")) return INPUT_TYPES.INSTAGRAM_URL;
    if (host.includes("facebook.com") || host.includes("fb.watch")) return INPUT_TYPES.FACEBOOK_URL;
    if (host.includes("tiktok.com")) return INPUT_TYPES.TIKTOK_URL;
    if (host.includes("reddit.com") || host.includes("redd.it")) return INPUT_TYPES.REDDIT_URL;
    return INPUT_TYPES.POST_URL;
  }

  const words = input.split(/\s+/).filter(Boolean);
  if (words.length >= 6) return INPUT_TYPES.RANDOM_SENTENCE;
  if (words.length >= 3 && input.length < 120) return INPUT_TYPES.CAPTION;
  if (words.length <= 4) return INPUT_TYPES.NAME_OR_ENTITY;
  return INPUT_TYPES.UNKNOWN;
}

function normalizeWhitespace(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function toIsoIfDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function compactText(value, max = 260) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function decodeEntities(text) {
  return (text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) ViralLoreAgent/1.0",
      accept: "application/json,text/plain,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) ViralLoreAgent/1.0",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

function makeDuckDuckGoQueryCandidates(value) {
  const escaped = value.trim().replace(/^"+|"+$/g, "");
  return [
    `"${escaped}"`,
    escaped,
    `${escaped} meme origin`,
    `${escaped} first post`,
    `${escaped} lore`,
  ];
}

function unwrapDuckDuckGoUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.includes("duckduckgo.com")) return rawUrl;
    const direct = parsed.searchParams.get("uddg");
    return direct ? decodeURIComponent(direct) : rawUrl;
  } catch (_error) {
    return rawUrl;
  }
}

function phraseFromUrl(url) {
  if (!isLikelyUrl(url)) return url;
  const parsed = new URL(url);
  const tokens = `${parsed.pathname} ${parsed.search}`
    .replace(/[/?&=_\-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !/^\d+$/.test(token))
    .slice(0, 12);
  return tokens.join(" ").trim();
}

async function searchDuckDuckGo(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const results = [];
  $(".result").each((_idx, node) => {
    const title = normalizeWhitespace($(node).find(".result__title").text());
    let href = $(node).find(".result__url").attr("href") || $(node).find("a.result__a").attr("href");
    const snippet = normalizeWhitespace($(node).find(".result__snippet").text());
    if (!href || !title) return;

    if (href.startsWith("//")) href = `https:${href}`;
    results.push({
      source: "web",
      title: decodeEntities(title),
      url: unwrapDuckDuckGoUrl(href),
      snippet: decodeEntities(snippet),
      publishedAt: null,
    });
  });
  return results.slice(0, 8);
}

async function searchGoogleNews(query) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await fetchText(rssUrl);
  const $ = cheerio.load(xml, { xmlMode: true });
  const results = [];
  $("item").each((_idx, node) => {
    const title = normalizeWhitespace($(node).find("title").first().text());
    const link = normalizeWhitespace($(node).find("link").first().text());
    const pubDate = normalizeWhitespace($(node).find("pubDate").first().text());
    if (!title || !link) return;
    results.push({
      source: "news",
      title,
      url: link,
      snippet: "",
      publishedAt: toIsoIfDate(pubDate),
    });
  });
  return results.slice(0, 8);
}

async function searchReddit(query) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10`;
  const data = await fetchJson(url);
  const posts = data?.data?.children || [];
  return posts.map((entry) => {
    const post = entry.data;
    return {
      source: "reddit",
      title: post.title,
      url: `https://www.reddit.com${post.permalink}`,
      snippet: compactText(post.selftext || ""),
      author: post.author || null,
      comments: post.num_comments || 0,
      score: post.score || 0,
      subreddit: post.subreddit_name_prefixed || null,
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
    };
  });
}

function isLikelyPostUrl(inputType) {
  return [
    INPUT_TYPES.POST_URL,
    INPUT_TYPES.X_URL,
    INPUT_TYPES.INSTAGRAM_URL,
    INPUT_TYPES.FACEBOOK_URL,
    INPUT_TYPES.TIKTOK_URL,
    INPUT_TYPES.REDDIT_URL,
  ].includes(inputType);
}

async function extractOpenGraph(url) {
  if (/reddit\.com|redd\.it/i.test(url)) {
    const jsonUrl = url.endsWith("/") ? `${url}.json` : `${url}/.json`;
    const listing = await fetchJson(jsonUrl);
    const postData = listing?.[0]?.data?.children?.[0]?.data;
    if (postData) {
      return {
        source: "post_extract",
        url: `https://www.reddit.com${postData.permalink}`,
        title: postData.title || "Untitled",
        snippet: compactText(postData.selftext || postData.title || ""),
        author: postData.author || null,
        image: postData.thumbnail && postData.thumbnail.startsWith("http") ? postData.thumbnail : null,
        publishedAt: postData.created_utc ? new Date(postData.created_utc * 1000).toISOString() : null,
        comments: postData.num_comments || 0,
        repostContext: `Subreddit: ${postData.subreddit_name_prefixed || "unknown"}`,
      };
    }
  }

  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const getMeta = (selectors) => {
    for (const selector of selectors) {
      const value = $(selector).attr("content");
      if (value) return normalizeWhitespace(value);
    }
    return null;
  };

  const title =
    getMeta([
      "meta[property='og:title']",
      "meta[name='twitter:title']",
      "meta[name='title']",
    ]) || normalizeWhitespace($("title").first().text());

  const description = getMeta([
    "meta[property='og:description']",
    "meta[name='description']",
    "meta[name='twitter:description']",
  ]);

  const image = getMeta([
    "meta[property='og:image']",
    "meta[name='twitter:image']",
  ]);

  const author = getMeta([
    "meta[name='author']",
    "meta[property='article:author']",
    "meta[name='twitter:creator']",
  ]);

  const publishedAt = toIsoIfDate(
    getMeta([
      "meta[property='article:published_time']",
      "meta[name='publish_date']",
      "meta[property='og:updated_time']",
    ]),
  );

  return {
    source: "post_extract",
    url,
    title: title || "Untitled",
    snippet: description || "",
    author,
    image,
    publishedAt,
    comments: null,
    repostContext: null,
  };
}

async function uploadImageAndMakeReverseLinks(file) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  form.append("file", blob, file.originalname || "upload.png");

  const response = await fetch("https://0x0.st", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Image host upload failed (${response.status})`);
  }

  const hostedImageUrl = (await response.text()).trim();
  const encoded = encodeURIComponent(hostedImageUrl);
  return {
    hostedImageUrl,
    reverseSearchLinks: [
      `https://lens.google.com/uploadbyurl?url=${encoded}`,
      `https://www.bing.com/images/search?q=imgurl:${encoded}&view=detailv2&iss=sbi`,
      `https://yandex.com/images/search?rpt=imageview&url=${encoded}`,
    ],
  };
}

function extractBestName(input, aggregated) {
  const candidate = aggregated
    .map((item) => item.title)
    .find((title) => title && title.length > 3);
  if (candidate) return compactText(candidate, 100);
  return compactText(input, 100) || "Unknown";
}

function pickEarliest(entries) {
  const dated = entries.filter((entry) => entry.publishedAt);
  if (!dated.length) return null;
  return dated
    .slice()
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))[0];
}

function findOriginalSource(entries, inputUrl) {
  if (inputUrl) {
    const direct = entries.find((item) => item.source === "post_extract");
    if (direct) return direct;
    const normalizedInput = inputUrl.replace(/\/$/, "");
    const directUrlMatch = entries.find((item) => (item.url || "").replace(/\/$/, "") === normalizedInput);
    if (directUrlMatch) return directUrlMatch;
    const looseMatch = entries.find((item) => (item.url || "").includes(normalizedInput));
    if (looseMatch) return looseMatch;
  }
  const earliest = pickEarliest(entries);
  if (earliest) return earliest;
  return entries[0] || null;
}

function buildLore(entries) {
  const snippets = entries
    .map((entry) => entry.snippet)
    .filter(Boolean)
    .slice(0, 3)
    .map((snippet) => `- ${compactText(snippet, 180)}`);
  if (!snippets.length) return "Not enough textual context found yet.";
  return snippets.join("\n");
}

function buildWhyViral(entries) {
  const socialHits = entries.filter((item) =>
    /(reddit|tiktok|twitter|x\.com|instagram|facebook)/i.test(item.url || ""),
  ).length;
  const newsHits = entries.filter((item) => item.source === "news").length;
  const early = pickEarliest(entries);

  const reasons = [];
  if (socialHits >= 3) reasons.push("Strong multi-platform social spread detected.");
  if (newsHits >= 1) reasons.push("Picked up by news/media indexing.");
  if (early) reasons.push(`Traceable timeline starts at ${early.publishedAt.slice(0, 10)}.`);
  if (!reasons.length) reasons.push("Currently niche or under-indexed across major sources.");
  return reasons.join(" ");
}

function buildRedFlags(inputType, entries) {
  const flags = [];
  if ([INPUT_TYPES.IMAGE_UPLOAD, INPUT_TYPES.SCREENSHOT_UPLOAD].includes(inputType)) {
    flags.push("Image-only evidence can be reposted without provenance.");
  }
  const undatedCount = entries.filter((entry) => !entry.publishedAt).length;
  if (undatedCount > entries.length / 2) {
    flags.push("Most results lack clear timestamps.");
  }
  if (!entries.length) {
    flags.push("No reliable matches found.");
  }
  return flags.length ? flags.join(" ") : "No major authenticity red flags found.";
}

function buildVerdict(entries) {
  const earliest = pickEarliest(entries);
  if (!earliest) return "mid";

  const daysOld = (Date.now() - Date.parse(earliest.publishedAt)) / (1000 * 60 * 60 * 24);
  if (daysOld <= 2) return "early";
  if (daysOld <= 14) return "mid";
  if (daysOld <= 90) return "late";
  return "dead";
}

function toFormattedReport(result) {
  return [
    `Name: ${result.name}`,
    `What it is: ${result.whatItIs}`,
    `Original source: ${result.originalSource || "Unknown"}`,
    `Earliest post found: ${result.earliestPostFound || "Unknown"}`,
    `Lore: ${result.lore}`,
    `Why it is viral: ${result.whyViral}`,
    `Best links:`,
    ...(result.bestLinks.length ? result.bestLinks.map((link) => `- ${link}`) : ["- None"]),
    `Red flags: ${result.redFlags}`,
    `Verdict: ${result.verdict}`,
  ].join("\n");
}

app.post("/api/research", upload.single("file"), async (req, res) => {
  try {
    const rawInput = (req.body?.input || "").trim();
    const inputType = detectInputType(rawInput, req.file);
    const initialQuery = isLikelyUrl(rawInput) ? phraseFromUrl(rawInput) : rawInput;
    let query =
      initialQuery ||
      req.file?.originalname?.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[_-]+/g, " ") ||
      "";

    if (!query && !req.file) {
      return res.status(400).json({ error: "Provide text/link input or upload an image." });
    }

    const aggregated = [];
    const coverage = [];
    let postExtract = null;
    let reverseImage = null;

    if ([INPUT_TYPES.IMAGE_UPLOAD, INPUT_TYPES.SCREENSHOT_UPLOAD].includes(inputType) && req.file) {
      try {
        reverseImage = await uploadImageAndMakeReverseLinks(req.file);
        coverage.push("reverse_image");
      } catch (error) {
        coverage.push("reverse_image_failed");
      }
    }

    if (isLikelyPostUrl(inputType)) {
      try {
        postExtract = await extractOpenGraph(rawInput);
        aggregated.push(postExtract);
        coverage.push("post_extract");
        if (!initialQuery && postExtract.title) {
          query = postExtract.title;
        }
      } catch (error) {
        coverage.push("post_extract_failed");
      }
    }

    const searchQueries = makeDuckDuckGoQueryCandidates(query).slice(0, 3);
    for (const q of searchQueries) {
      try {
        const webResults = await searchDuckDuckGo(q);
        aggregated.push(...webResults);
        coverage.push("web");
      } catch (error) {
        coverage.push("web_failed");
      }
    }

    try {
      const news = await searchGoogleNews(query);
      aggregated.push(...news);
      coverage.push("news");
    } catch (error) {
      coverage.push("news_failed");
    }

    try {
      const reddit = await searchReddit(query);
      aggregated.push(...reddit);
      coverage.push("reddit");
    } catch (error) {
      coverage.push("reddit_failed");
    }

    const socialSiteQueries = [
      `site:x.com ${query}`,
      `site:instagram.com ${query}`,
      `site:facebook.com ${query}`,
      `site:tiktok.com ${query}`,
    ];
    for (const siteQuery of socialSiteQueries) {
      try {
        const results = await searchDuckDuckGo(siteQuery);
        aggregated.push(...results);
        coverage.push("social_search");
      } catch (error) {
        coverage.push("social_search_failed");
      }
    }

    const deduped = [];
    const seen = new Set();
    for (const item of aggregated) {
      const key = `${item.url || ""}|${item.title || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    const earliest = pickEarliest(deduped);
    const original = findOriginalSource(deduped, isLikelyUrl(rawInput) ? rawInput : null);

    const result = {
      inputType,
      name: extractBestName(query || rawInput, deduped),
      whatItIs: `Detected as ${inputType.replace(/_/g, " ")}. Aggregated ${deduped.length} cross-source signals.`,
      originalSource: original ? `${original.title || "Untitled"} (${original.url})` : null,
      earliestPostFound: earliest
        ? `${earliest.publishedAt || "Unknown date"} - ${earliest.title || "Untitled"} (${earliest.url})`
        : null,
      lore: buildLore(deduped),
      whyViral: buildWhyViral(deduped),
      bestLinks: deduped.slice(0, 8).map((item) => item.url).filter(Boolean),
      redFlags: buildRedFlags(inputType, deduped),
      verdict: buildVerdict(deduped),
      reverseImage,
      extractedPost: postExtract,
      coverage: [...new Set(coverage)],
      evidence: deduped.slice(0, 25),
    };

    return res.json({
      result,
      formatted: toFormattedReport(result),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Research failed unexpectedly.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Viral Lore Agent running on http://localhost:${PORT}`);
});
