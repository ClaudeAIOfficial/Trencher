const state = {
  image: null,
  links: [],
  reportText: ""
};

const PLATFORM_PATTERNS = [
  { name: "X/Twitter", hosts: ["x.com", "twitter.com"], type: "Tweet/X link" },
  { name: "Instagram", hosts: ["instagram.com"], type: "Instagram link" },
  { name: "Facebook", hosts: ["facebook.com", "fb.watch", "m.facebook.com"], type: "Facebook link" },
  { name: "TikTok", hosts: ["tiktok.com", "vm.tiktok.com"], type: "TikTok link" },
  { name: "Reddit", hosts: ["reddit.com", "redd.it"], type: "Reddit link" }
];

const VIRAL_MARKERS = [
  "meme",
  "trend",
  "viral",
  "tiktok",
  "challenge",
  "template",
  "lore",
  "copypasta",
  "reaction",
  "sound",
  "edit"
];

const form = document.querySelector("#lore-form");
const fileInput = document.querySelector("#file-input");
const dropzone = document.querySelector("#dropzone");
const imagePreview = document.querySelector("#image-preview");
const clueInput = document.querySelector("#clue-input");
const detectedBadge = document.querySelector("#detected-badge");
const report = document.querySelector("#report");
const reportEmpty = document.querySelector("#report-empty");
const linksGrid = document.querySelector("#links-grid");
const openAllButton = document.querySelector("#open-all-button");
const clearButton = document.querySelector("#clear-button");
const copyReportButton = document.querySelector("#copy-report-button");
const notesInput = document.querySelector("#evidence-notes");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runResearch();
});

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) setImage(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("drag-over");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("drag-over");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag-over");
  const [file] = event.dataTransfer.files;
  if (file && file.type.startsWith("image/")) setImage(file);
});

openAllButton.addEventListener("click", () => {
  state.links.slice(0, 9).forEach((link, index) => {
    setTimeout(() => window.open(link.url, "_blank", "noopener,noreferrer"), index * 80);
  });
});

clearButton.addEventListener("click", resetApp);

copyReportButton.addEventListener("click", async () => {
  const notes = notesInput.value.trim();
  const text = notes ? `${state.reportText}\n\nEvidence notes:\n${notes}` : state.reportText;
  await navigator.clipboard.writeText(text);
  copyReportButton.textContent = "Copied";
  setTimeout(() => {
    copyReportButton.textContent = "Copy report";
  }, 1200);
});

function setImage(file) {
  const imageUrl = URL.createObjectURL(file);
  state.image = {
    file,
    url: imageUrl,
    isScreenshot: /screen|screenshot|capture/i.test(file.name)
  };

  imagePreview.innerHTML = `
    <img src="${imageUrl}" alt="Uploaded clue preview">
    <div>
      <p>${escapeHtml(file.name)}</p>
      <small>${formatBytes(file.size)} · ${file.type || "image"}${
        state.image.isScreenshot ? " · likely screenshot" : ""
      }</small>
    </div>
  `;
  imagePreview.classList.remove("hidden");
}

function runResearch() {
  const rawClue = clueInput.value.trim();
  const input = classifyInput(rawClue, state.image);
  const reportData = buildReport(input);

  state.links = buildResearchLinks(input);
  state.reportText = formatReportText(reportData);

  detectedBadge.textContent = input.label;
  renderReport(reportData);
  renderLinks(state.links);

  reportEmpty.classList.add("hidden");
  report.classList.remove("hidden");
  openAllButton.disabled = state.links.length === 0;
  copyReportButton.disabled = false;
}

function classifyInput(rawClue, image) {
  const urls = extractUrls(rawClue);
  const firstUrl = urls[0] ? safeUrl(urls[0]) : null;
  const platform = firstUrl ? detectPlatform(firstUrl) : null;
  const lowered = rawClue.toLowerCase();
  const words = rawClue.split(/\s+/).filter(Boolean);
  const hasSentenceShape = /[.!?]$/.test(rawClue) || words.length >= 5;
  const hasCaptionShape = words.length >= 3 && (/#\w+/.test(rawClue) || /@\w+/.test(rawClue));
  const hasViralMarker = VIRAL_MARKERS.some((marker) => lowered.includes(marker));

  if (image && rawClue) {
    return {
      kind: "mixed",
      label: image.isScreenshot ? "Screenshot + text clue" : "Image + text clue",
      query: rawClue,
      normalized: normalizeQuery(rawClue),
      urls,
      platform,
      image
    };
  }

  if (image) {
    return {
      kind: image.isScreenshot ? "screenshot" : "image",
      label: image.isScreenshot ? "Screenshot upload" : "Image upload",
      query: image.file.name.replace(/\.[^.]+$/, ""),
      normalized: normalizeQuery(image.file.name.replace(/\.[^.]+$/, "")),
      urls: [],
      platform: null,
      image
    };
  }

  if (firstUrl) {
    return {
      kind: "url",
      label: platform ? platform.type : "Post URL / web link",
      query: firstUrl.href,
      normalized: normalizeQuery(firstUrl.href),
      urls,
      platform,
      image: null
    };
  }

  if (hasCaptionShape) {
    return {
      kind: "caption",
      label: "Caption / social text",
      query: rawClue,
      normalized: normalizeQuery(rawClue),
      urls: [],
      platform: null,
      image: null
    };
  }

  if (hasSentenceShape) {
    return {
      kind: "sentence",
      label: "Random sentence / exact phrase",
      query: rawClue,
      normalized: normalizeQuery(rawClue),
      urls: [],
      platform: null,
      image: null
    };
  }

  return {
    kind: hasViralMarker ? "trend" : "name",
    label: hasViralMarker ? "Meme / event / trend name" : "Name / clue",
    query: rawClue || "viral internet clue",
    normalized: normalizeQuery(rawClue || "viral internet clue"),
    urls: [],
    platform: null,
    image: null
  };
}

function buildReport(input) {
  const sourceStrategy = sourceStrategyFor(input);
  const redFlags = redFlagsFor(input);
  const verdict = verdictFor(input);
  const inferredName = inferName(input);

  return {
    "Name": inferredName,
    "What it is": whatItIs(input),
    "Original source": sourceStrategy.originalSource,
    "Earliest post found": sourceStrategy.earliestPost,
    "Lore": loreSummary(input),
    "Why it is viral": viralSummary(input),
    "Best links": "Use the generated links below in order: exact match, date-sorted web search, platform search, news, Reddit, then social-native searches.",
    "Red flags": redFlags.join(" "),
    "Verdict": verdict
  };
}

function buildResearchLinks(input) {
  const query = input.normalized || input.query;
  const exact = `"${query}"`;
  const originQuery = `${query} original source origin first posted`;
  const loreQuery = `${query} lore meme trend viral context`;
  const platformQuery = input.platform ? `${query} ${input.platform.name}` : query;
  const links = [
    link("Google exact phrase", googleSearch(exact), "Find exact copies and repost chains."),
    link("Google date sorted", googleSearch(originQuery, "sbd:1"), "Prioritize earliest indexed pages."),
    link("Google News", `https://news.google.com/search?q=${encode(query)}`, "Check if the trend became a news story."),
    link("Reddit search", `https://www.reddit.com/search/?q=${encode(loreQuery)}&sort=new`, "Look for comments explaining lore and first sightings."),
    link("X/Twitter search", `https://twitter.com/search?q=${encode(`${platformQuery} min_faves:10`)}&src=typed_query&f=live`, "Find quote tweets, repost context, and early discussion."),
    link("Instagram search", googleSearch(`site:instagram.com ${loreQuery}`), "Search public Instagram captions and reposts."),
    link("Facebook search", googleSearch(`site:facebook.com ${loreQuery}`), "Search public Facebook pages and reposts."),
    link("TikTok search", `https://www.tiktok.com/search?q=${encode(loreQuery)}`, "Find sounds, stitches, duets, and creator reuse."),
    link("Know Your Meme", googleSearch(`site:knowyourmeme.com ${query}`), "Check meme documentation and timelines.")
  ];

  if (input.platform) {
    links.unshift(
      link(`${input.platform.name} URL`, input.urls[0], "Open the original link and inspect author, date, media, comments, and repost context.")
    );
  }

  if (input.image) {
    links.unshift(
      link("Google Lens", "https://lens.google.com/upload", "Upload the image to find visually similar and older copies."),
      link("TinEye", "https://tineye.com/search", "Reverse image search with oldest-result sorting."),
      link("Yandex Images", "https://yandex.com/images/search", "Strong visual matching for memes and screenshots.")
    );
  }

  if (input.kind === "sentence" || input.kind === "caption") {
    links.push(
      link("Exact phrase without punctuation", googleSearch(`"${stripPunctuation(query)}"`), "Catch reposts that remove punctuation."),
      link("Similar phrase search", googleSearch(`${stripPunctuation(query)} meme OR caption OR trend`), "Find paraphrases and template variations.")
    );
  }

  if (input.kind === "url" && input.urls[0]) {
    links.push(
      link("URL mentions", googleSearch(`"${input.urls[0]}"`), "Find pages or posts that quote the same URL."),
      link("Archive search", `https://webcache.googleusercontent.com/search?q=${encode(input.urls[0])}`, "Look for cached or archived copies when posts disappear.")
    );
  }

  return dedupeLinks(links);
}

function renderReport(reportData) {
  const rows = Object.entries(reportData)
    .map(([key, value]) => {
      const renderedValue =
        key === "Verdict"
          ? `<span class="verdict-pill verdict-${value.tone}">${escapeHtml(value.label)}</span> ${escapeHtml(value.reason)}`
          : escapeHtml(value);
      return `<div class="report-row"><dt>${escapeHtml(key)}:</dt><dd>${renderedValue}</dd></div>`;
    })
    .join("");

  report.innerHTML = `<dl>${rows}</dl>`;
}

function renderLinks(links) {
  if (!links.length) {
    linksGrid.innerHTML = "<p class=\"muted\">No links generated yet.</p>";
    return;
  }

  linksGrid.innerHTML = links
    .map(
      (item) => `
        <a class="link-card" href="${item.url}" target="_blank" rel="noopener noreferrer">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </a>
      `
    )
    .join("");
}

function sourceStrategyFor(input) {
  if (input.image) {
    return {
      originalSource: "Run Google Lens, TinEye oldest-first, and Yandex Images. Compare the oldest matching image page with caption text and watermarks.",
      earliestPost: "Not confirmed yet. Start with TinEye oldest results, then Google date-sorted exact text/watermark searches."
    };
  }

  if (input.platform) {
    return {
      originalSource: `Open the ${input.platform.name} post first, then verify author handle, post date, media, comments, quote/repost trail, and any linked original.`,
      earliestPost: "Not confirmed yet. Use URL mentions, exact caption search, and date-sorted platform/web searches."
    };
  }

  if (input.kind === "sentence" || input.kind === "caption") {
    return {
      originalSource: "Search the exact phrase, then repeat without punctuation and with short distinctive fragments.",
      earliestPost: "Not confirmed yet. Sort exact-match results by date and compare against Reddit/X/TikTok repost timestamps."
    };
  }

  return {
    originalSource: "Search the name with origin, first posted, meme, trend, and lore modifiers.",
    earliestPost: "Not confirmed yet. Cross-check web search dates with Reddit threads, X posts, TikTok sounds, and meme databases."
  };
}

function redFlagsFor(input) {
  const flags = [
    "Screenshots can be cropped, edited, or reposted without the original author.",
    "Search engines index reposts before originals when the original is deleted, private, or on a restricted platform."
  ];

  if (input.platform) {
    flags.push(`${input.platform.name} may hide comments, edits, deleted posts, or repost chains unless you are logged in.`);
  }

  if (input.image) {
    flags.push("Reverse image matches should be verified against watermarks, upload dates, and page snapshots.");
  }

  if (input.kind === "name" || input.kind === "trend") {
    flags.push("Short names can collide with unrelated people, animals, events, or older memes.");
  }

  return flags;
}

function verdictFor(input) {
  const text = `${input.query} ${input.label}`.toLowerCase();

  if (/dead|old|classic|throwback|archive|201\d|2020|2021|2022/.test(text)) {
    return {
      label: "dead",
      tone: "dead",
      reason: "The clue contains old/archival signals; confirm with current repost activity."
    };
  }

  if (/news|event|breaking|today|now|just happened|leak|drama/.test(text)) {
    return {
      label: "early",
      tone: "early",
      reason: "The clue has current-event language, so hunt for the first post before reposts overtake it."
    };
  }

  if (input.platform || input.image) {
    return {
      label: "mid",
      tone: "mid",
      reason: "There is concrete media or a post to trace, but virality needs confirmation from repost velocity and comments."
    };
  }

  return {
    label: "late",
    tone: "late",
    reason: "Text-only clues often arrive after a meme or trend has already spread; verify by earliest exact-match dates."
  };
}

function whatItIs(input) {
  if (input.image) {
    return input.image.isScreenshot
      ? "A screenshot clue that needs OCR-style text reading, visual matching, and repost-chain checks."
      : "An image clue that needs reverse image search, watermark inspection, and caption/context searches.";
  }

  if (input.platform) {
    return `A ${input.platform.name} post link to inspect for text, image/video, author, date, comments, and repost context.`;
  }

  if (input.kind === "sentence") {
    return "A phrase clue. Exact-match and near-match searches should reveal where it started spreading.";
  }

  if (input.kind === "caption") {
    return "A caption or social-text clue. Hashtags, handles, and repeated wording are the main trace signals.";
  }

  return "A name, meme, event, character, animal, or trend clue to identify through origin and lore searches.";
}

function loreSummary(input) {
  const clue = input.query || "this clue";
  if (input.platform) {
    return `Start from the linked post, then follow quoted captions, comments naming the source, watermarks, duets/stitches, and reposts that mention "${clue}".`;
  }

  if (input.image) {
    return "Compare visual matches across reverse image tools, then search any visible text, usernames, watermarks, logos, faces, or setting details.";
  }

  return `Search "${clue}" exactly first, then search shorter distinctive fragments plus origin, lore, meme, trend, and first posted.`;
}

function viralSummary(input) {
  if (input.platform) {
    return "Likely viral signals are comments explaining the joke, quote posts, stitches/duets, repost captions, creator callouts, and news coverage.";
  }

  if (input.image) {
    return "Image virality usually comes from recognizability, reaction-template reuse, controversy, celebrity/event context, or a strong visual gag.";
  }

  return "Phrase/name virality usually comes from repeatable wording, social identity, remix potential, current-event timing, or a recognizable meme format.";
}

function inferName(input) {
  if (input.platform) {
    return `${input.platform.name} post: ${input.urls[0]}`;
  }

  if (input.image && input.query) {
    return input.image.isScreenshot ? `Screenshot clue: ${input.query}` : `Image clue: ${input.query}`;
  }

  return input.query || "Unknown clue";
}

function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  return matches.map((url) => url.replace(/[),.;!?]+$/, ""));
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function detectPlatform(url) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return PLATFORM_PATTERNS.find((platform) =>
    platform.hosts.some((knownHost) => host === knownHost || host.endsWith(`.${knownHost}`))
  );
}

function normalizeQuery(value) {
  return value
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function stripPunctuation(value) {
  return value.replace(/[^\w\s#@-]/g, " ").replace(/\s+/g, " ").trim();
}

function googleSearch(query, tbs = "") {
  const params = new URLSearchParams({ q: query });
  if (tbs) params.set("tbs", tbs);
  return `https://www.google.com/search?${params.toString()}`;
}

function encode(value) {
  return encodeURIComponent(value);
}

function link(title, url, description) {
  return { title, url, description };
}

function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function formatReportText(reportData) {
  return Object.entries(reportData)
    .map(([key, value]) => {
      const renderedValue =
        key === "Verdict" ? `${value.label} - ${value.reason}` : value;
      return `${key}: ${renderedValue}`;
    })
    .join("\n");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetApp() {
  clueInput.value = "";
  fileInput.value = "";
  notesInput.value = "";
  state.image = null;
  state.links = [];
  state.reportText = "";
  imagePreview.innerHTML = "";
  imagePreview.classList.add("hidden");
  report.innerHTML = "";
  report.classList.add("hidden");
  reportEmpty.classList.remove("hidden");
  linksGrid.innerHTML = "";
  detectedBadge.textContent = "Waiting for clue";
  openAllButton.disabled = true;
  copyReportButton.disabled = true;
}
