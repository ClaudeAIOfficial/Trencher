# Research Agent Web App

A production-ready Next.js research agent that accepts any topic, searches the web, extracts readable article content, compares multiple sources, and returns a structured research report.

## Features

- Dark, modern research interface with a large topic input
- Loading states that show the research pipeline
- Source cards with title, website, author, date, URL, summary, claims, quotes, and relevance score
- Final report sections:
  - Executive Summary
  - Key Findings
  - Source Breakdown
  - Timeline
  - Conflicting Information
  - Opportunities / Insights
  - Final Verdict
- Copy report button
- Export as Markdown button
- `/api/research` API route with:
  - Input validation
  - Basic per-client rate limiting
  - Search provider abstraction
  - Article HTML fetching and readability extraction
  - OpenAI JSON-schema response validation
  - Clear low-confidence and not-enough-sources responses

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- OpenAI API
- Tavily, Brave Search, SerpAPI, or Exa for web search
- Cheerio, JSDOM, and Mozilla Readability for article extraction

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.example .env.local
```

Add your API keys:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini

# Choose one: tavily, brave, serpapi, exa
SEARCH_PROVIDER=tavily

TAVILY_API_KEY=your_tavily_key
BRAVE_SEARCH_API_KEY=
SERPAPI_API_KEY=
EXA_API_KEY=
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Search Providers

Set `SEARCH_PROVIDER` to one of:

- `tavily` with `TAVILY_API_KEY`
- `brave` with `BRAVE_SEARCH_API_KEY`
- `serpapi` with `SERPAPI_API_KEY`
- `exa` with `EXA_API_KEY`

The provider interface lives in `lib/research/search-providers.ts`, so adding a new search API only requires returning normalized `SearchResult` objects.

## API Route

`POST /api/research`

Request body:

```json
{
  "topic": "latest Solana memecoin meta"
}
```

Response shape:

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

## Reliability Rules

The prompt and server-side reconciliation are designed to reduce hallucinations:

- The model receives only extracted source text and metadata.
- The model is instructed to cite source IDs like `[S1]`.
- Source metadata returned by the model is overwritten with fetched metadata.
- If no useful sources are found, the API returns a low-confidence "not enough reliable sources found" report.
- If only one useful source is found, the API forces low confidence.

## Rate Limiting

The API includes a simple in-memory rate limiter allowing 8 requests per client per hour. For multi-region or serverless production deployments, replace `lib/research/rate-limit.ts` with Redis, Upstash, or another durable store.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
```
