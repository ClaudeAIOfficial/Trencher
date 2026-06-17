# Research Agent Web App

A production-ready web research agent built with **Next.js + TypeScript + Tailwind CSS**.

It accepts any topic/question, searches the web, extracts useful article content, filters low-quality pages, and generates a structured report using an LLM.

## Features

- Dark, modern UI
- Large search input + Start Research action
- Loading state with agent progress messages
- Source cards with:
  - title
  - source/domain
  - author (if available)
  - publish date (if available)
  - URL
  - summary
  - main claims
  - relevance score (1-10)
- Final report sections:
  - Executive Summary
  - Key Findings
  - Source Breakdown
  - Timeline
  - Conflicting Information
  - Opportunities / Insights
  - Final Verdict
- Copy report button
- Export to Markdown button
- Rate limit protection on API route
- Input validation + error handling
- "Not enough reliable sources found" fallback when quality is too low

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (LLM report synthesis)
- Search provider adapter layer (swap easily):
  - Tavily
  - SerpAPI
  - Brave Search
  - Exa

## Folder Structure

```txt
app/
  api/research/route.ts      # Main research endpoint
  layout.tsx
  page.tsx                   # UI
components/
  report-view.tsx
  source-card.tsx
lib/
  research/
    article-extractor.ts     # Fetch + clean article content
    markdown.ts              # Markdown export formatter
    report-builder.ts        # LLM synthesis + schema validation
    search-providers.ts      # Search provider abstraction
    types.ts                 # Shared report/source types
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Add your API keys in `.env.local`.

### Required

- `OPENAI_API_KEY`
- `SEARCH_PROVIDER` (one of: `tavily`, `serpapi`, `brave`, `exa`)
- Matching provider key:
  - `TAVILY_API_KEY` OR
  - `SERPAPI_API_KEY` OR
  - `BRAVE_SEARCH_API_KEY` OR
  - `EXA_API_KEY`

### Optional

- `OPENAI_MODEL` (default: `gpt-4.1-mini`)

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## API

### `POST /api/research`

#### Request body

```json
{
  "topic": "latest Solana memecoin meta"
}
```

#### Response shape

```json
{
  "topic": "",
  "summary": "",
  "keyFindings": [],
  "sources": [
    {
      "title": "",
      "url": "",
      "source": "",
      "author": "",
      "publishedDate": "",
      "summary": "",
      "mainClaims": [],
      "importantFacts": [],
      "keyQuotes": [],
      "relevanceScore": 0
    }
  ],
  "timeline": [],
  "conflicts": [],
  "opportunities": [],
  "finalVerdict": "",
  "confidence": "low | medium | high"
}
```

## Reliability & Safety Notes

- The model is instructed to only use supplied sources and avoid hallucination.
- Source metadata (title/url/domain/date/author) is normalized from fetched results, not invented.
- If evidence quality is weak, confidence is set low and report quality degrades gracefully.
- If not enough reliable sources are available, the endpoint returns a clear fallback message.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```
