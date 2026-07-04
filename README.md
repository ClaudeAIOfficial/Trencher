# Viral Lore Agent

Viral Lore Agent is a browser-based research assistant for tracing the origin,
lore, and viral context of internet clues.

It accepts:

- Image or screenshot uploads
- Post URLs
- X/Twitter, Instagram, Facebook, TikTok, and Reddit links
- Random sentences, captions, names, memes, events, animals, people, or trends

The app detects the clue type, creates a structured research brief, and generates
targeted search links for reverse image lookup, Google, Google News, Reddit,
X/Twitter, Instagram, Facebook, TikTok, Know Your Meme, and the Internet Archive.

## Run locally

```bash
npm start
```

Then open `http://localhost:5173`.

## Validate

```bash
npm test
```

## Notes

Public social platforms and search engines restrict direct browser scraping. This
app avoids pretending it can bypass those restrictions: it classifies the clue,
opens the right research paths quickly, and formats the report so confirmed
evidence can be copied into the final lore brief.
