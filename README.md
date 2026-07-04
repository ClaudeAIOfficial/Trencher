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
```

Notes:
- OCR runs locally via `tesseract.js` (no extra key needed).
- If `SERPAPI_KEY` is missing, the app still runs with fallback search.

## Run locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`
