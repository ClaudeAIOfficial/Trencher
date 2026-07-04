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
- For image uploads, uploads the image to a temporary host and generates reverse-search links for Google Lens, Bing, and Yandex.
- For links/posts, extracts OpenGraph/Twitter metadata where available (title, text, image, author, date).
- For text clues, performs exact and related phrase lookups.
- Searches web index, Google News RSS, Reddit, and social-site scoped queries.
- Attempts to identify earliest source based on available timestamps.
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
Verdict: early / mid / late / dead
```

## Run locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`
