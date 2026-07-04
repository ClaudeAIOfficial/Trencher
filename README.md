# Viral Lore Agent

Viral Lore Agent is a web app that accepts clues (image, screenshot, URL, sentence, caption, or name) and performs fast cross-source research to estimate origin, lore, and viral context.

## Supported Inputs

- Image upload
- Screenshot upload
- Post URL
- Tweet/X link
- Instagram link
- Facebook link
- TikTok link
- Reddit link
- Random sentence
- Caption
- Name of person/animal/meme/event/trend

## What it does

- Detects the input type automatically.
- Runs OCR on uploaded screenshots/images (Tesseract) to extract visible text, handles, timestamps, watermark clues, and logo-like text.
- Uses SerpApi Google Lens for real reverse-image research (visual matches are parsed and ranked).
- Uses SerpApi Google Search + Google News as primary research channels.
- Uses fallback search paths (DuckDuckGo HTML + Google News RSS) if SerpApi is unavailable/fails.
- For links/posts, extracts platform, title, description, author, date, image, and OpenGraph metadata.
- Runs parallel search tasks with `Promise.allSettled` and request timeouts, so one failed source does not break the run.
- Ranks sources with a scoring model and computes confidence + source quality.
- Returns the result in this format:

```text
Name:
What it is:
Original source:
Earliest post found:
Lore:
Why it is viral:
Best links:
Red flags:
Confidence Score:
Source Quality:
Verdict: early / mid / late / dead
```

## Setup

Create your env file:

```bash
cp .env.example .env
```

Set your key:

```bash
SERPAPI_KEY=your_serpapi_key_here
APIFY_TOKEN=your_apify_token_here
```

Optional Apify actor IDs (recommended for richer platform extraction/search):

```bash
APIFY_X_ACTOR_ID=
APIFY_TIKTOK_ACTOR_ID=
APIFY_INSTAGRAM_ACTOR_ID=
APIFY_FACEBOOK_ACTOR_ID=
APIFY_REDDIT_ACTOR_ID=
APIFY_YOUTUBE_ACTOR_ID=
```

Notes:
- OCR runs locally via `tesseract.js` (no extra key needed).
- If `SERPAPI_KEY` is missing, the app still runs with fallback search.
- If `APIFY_TOKEN` or platform actor IDs are missing, social search falls back to site-scoped SerpApi/DuckDuckGo queries.

## Platform deep extractor adapter system

The backend routes platform-specific logic through:

- `adapters/x.js`
- `adapters/tiktok.js`
- `adapters/instagram.js`
- `adapters/facebook.js`
- `adapters/reddit.js`
- `adapters/youtube.js`
- `adapters/generic.js`

Each adapter exposes:

- `extractFromUrl(url)`
- `searchPlatform(query)`
- `normalizeResult(raw)`

## Apify + fallback behavior

When an Apify actor is configured for a platform:

- URL extraction/search attempts use Apify actor output first.
- If actor run fails or returns no usable data, fallback search runs.

Fallback search uses:

- SerpApi Google site queries (`site:x.com`, `site:tiktok.com`, etc.) when `SERPAPI_KEY` exists.
- DuckDuckGo HTML parsing when SerpApi is unavailable.

The UI shows platform status in **Social Sources Checked**:

- `checked`
- `failed`
- `skipped`
- `API missing`

## Current limitations

- Some social platforms restrict public scraping; coverage quality depends on available metadata and configured actors.
- Reddit JSON/search endpoints may return 403 in some environments.
- “Confirmed original source” is only used when confidence is strong; otherwise output uses “likely” or “possible” to avoid fake certainty.

## Run locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`
