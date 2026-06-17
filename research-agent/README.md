# Research Agent

An AI-powered web research assistant. Enter any topic, person, company, keyword, or question and get a structured, multi-source research report in seconds.

## Features

- **Autonomous web research** — searches the web, fetches articles, and extracts key information
- **Multi-source synthesis** — compares information across multiple sources
- **Conflict detection** — flags when sources disagree
- **Structured reports** — executive summary, key findings, timeline, source breakdown, opportunities, and verdict
- **Confidence scoring** — tells you how reliable the findings are
- **Export** — copy as text or download as Markdown
- **Dark mode UI** — clean, modern interface

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (`gpt-4o` by default)
- Tavily / Brave / SerpAPI / Exa (search provider — pick one)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd research-agent
npm install
```

### 2. Set up API keys

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your API keys:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI key for GPT-4o summarization |
| `TAVILY_API_KEY` | ✅ One of these | [Tavily](https://tavily.com) — recommended |
| `BRAVE_API_KEY` | ✅ One of these | [Brave Search API](https://api.search.brave.com) |
| `SERP_API_KEY` | ✅ One of these | [SerpAPI](https://serpapi.com) |
| `EXA_API_KEY` | ✅ One of these | [Exa](https://exa.ai) |
| `SEARCH_PROVIDER` | Optional | Explicitly set provider (`tavily`/`brave`/`serp`/`exa`) |
| `OPENAI_MODEL` | Optional | Override the OpenAI model (default: `gpt-4o`) |

You need **at least one search API key** and the **OpenAI key**.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API

### `POST /api/research`

**Request body:**
```json
{ "topic": "your research topic" }
```

**Response:**
```json
{
  "topic": "string",
  "summary": "string",
  "keyFindings": ["string"],
  "sources": [
    {
      "title": "string",
      "url": "string",
      "source": "string",
      "author": "string",
      "publishedDate": "string",
      "summary": "string",
      "mainClaims": ["string"],
      "keyQuotes": ["string"],
      "relevanceScore": 0
    }
  ],
  "timeline": [{ "date": "string", "event": "string", "source": "string" }],
  "conflicts": [{ "claim": "string", "perspectives": [{ "source": "string", "position": "string" }] }],
  "opportunities": ["string"],
  "finalVerdict": "string",
  "confidence": "low | medium | high"
}
```

**Rate limiting:** 5 requests per minute per IP.

---

## Swapping Search Providers

The search layer is modular. Each provider is implemented as a separate function in `lib/search.ts`. To add a new provider:

1. Add a new `async function searchMyProvider(query: string): Promise<SearchResult[]>` in `lib/search.ts`
2. Add the new provider name to the `SearchProvider` type in `lib/types.ts`
3. Add the case to the `switch` in `searchWeb()`
4. Set `SEARCH_PROVIDER=myprovider` in `.env.local`

---

## Project Structure

```
research-agent/
├── app/
│   ├── api/research/route.ts    # Main API endpoint
│   ├── components/
│   │   ├── SearchInput.tsx      # Search bar UI
│   │   ├── LoadingState.tsx     # Animated loading steps
│   │   ├── SourceCard.tsx       # Individual source display
│   │   ├── ResearchReport.tsx   # Full report layout
│   │   └── EmptyState.tsx       # Initial state
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Main page + state management
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── search.ts                # Search provider abstraction
│   ├── extract.ts               # HTML content extraction
│   └── ai.ts                    # OpenAI integration
├── .env.local.example
└── README.md
```

---

## Deployment

### Vercel (recommended)

```bash
npx vercel
```

Set environment variables in the Vercel dashboard under Project Settings > Environment Variables.

### Docker

```bash
docker build -t research-agent .
docker run -p 3000:3000 --env-file .env.local research-agent
```

---

## Notes

- The agent only reports information it finds in sources — it will not invent facts.
- If sources are thin or unreliable, the confidence level is set to `low` and the verdict says so.
- Rate limiting (5 req/min/IP) protects against abuse but resets on server restart. For production, use Redis-backed rate limiting.
- Article fetching has an 8-second timeout per URL to keep total response time reasonable.
