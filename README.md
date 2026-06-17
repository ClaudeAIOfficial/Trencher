# Research Agent Web App

A production-ready research agent built with **Next.js + TypeScript + Tailwind CSS**.

Users enter any topic (person, company, token, trend, question), and the app:

1. Searches the web through a pluggable provider (Tavily, SerpAPI, Brave, or Exa)
2. Fetches and extracts article content
3. Filters low-quality/irrelevant sources
4. Uses an LLM to compare sources and generate a structured report
5. Returns source-grounded JSON to the frontend

## Features

- Dark-mode UI
- Large search input + **Start Research** action
- Loading flow that shows what the agent is doing
- Source cards with title, URL, author/date, summary, claims, and relevance score
- Full report rendering:
  - Executive Summary
  - Key Findings
  - Source Breakdown
  - Timeline
  - Conflicting Information
  - Opportunities / Insights
  - Final Verdict
- **Copy report** and **Export markdown** actions
- API input validation + error handling
- In-memory rate limiting
- Confidence scoring (`low | medium | high`)
- Explicit fallback when reliable sources are insufficient

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS (v4)
- OpenAI SDK
- Zod validation
- Cheerio for HTML extraction

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

```bash
cp .env.example .env.local
```

Set at least:

- `OPENAI_API_KEY`
- `SEARCH_PROVIDER`
- Corresponding provider key:
  - `TAVILY_API_KEY` or
  - `SERPAPI_API_KEY` or
  - `BRAVE_SEARCH_API_KEY` or
  - `EXA_API_KEY`

### 3) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Contract

### Endpoint

`POST /api/research`

### Request

```json
{
  "topic": "latest Solana memecoin meta"
}
```

### Response shape

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
  "confidence": "low"
}
```

## Search Provider Swapping

Provider abstraction lives in:

- `src/lib/search/providers.ts`

Set `SEARCH_PROVIDER` to one of:

- `tavily`
- `serpapi`
- `brave`
- `exa`

The API route (`src/app/api/research/route.ts`) is unchanged when switching providers.

## Reliability & Non-Hallucination Rules

- The model only receives extracted source payloads
- Output metadata (title, URL, author, date, source) is merged from extracted articles, not invented by the model
- Claims must map to source URLs
- If evidence is weak or sparse, confidence is reduced and fallback messaging is returned

## Scripts

- `npm run dev` - start dev server
- `npm run lint` - lint checks
- `npm run build` - production build
- `npm run start` - run production server

