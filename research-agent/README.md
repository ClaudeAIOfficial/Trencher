# Research Agent

An AI-powered web research tool. Enter any topic, keyword, question, person, or trend and get a comprehensive research report — backed by live web sources and AI analysis.

![Research Agent Screenshot](https://placehold.co/1200x630/0a0a0f/6366f1?text=Research+Agent)

## Features

- **Live web search** via Tavily, Brave, SerpAPI, or Exa
- **Multi-source article extraction** — reads and cleans actual article content
- **AI analysis** — compares sources, detects conflicts, scores relevance
- **Structured report** with executive summary, key findings, timeline, conflicts, and opportunities
- **Export as Markdown** — copy or download the full report
- **Dark mode UI** with loading states and source cards
- **Rate limiting** and input validation built-in

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

Edit `.env.local` and add your keys:

```env
# Required
OPENAI_API_KEY=sk-...

# Required (pick one)
TAVILY_API_KEY=tvly-...
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Keys

### OpenAI (required)

Used for AI analysis and report generation.

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add to `.env.local` as `OPENAI_API_KEY`

**Model:** defaults to `gpt-4o-mini` (fast and cheap). Set `OPENAI_MODEL=gpt-4o` for higher quality.

### Search API (pick one)

| Provider | Variable | Get Key | Notes |
|---|---|---|---|
| **Tavily** (recommended) | `TAVILY_API_KEY` | [app.tavily.com](https://app.tavily.com) | Best for AI research |
| Brave Search | `BRAVE_API_KEY` | [brave.com/search/api](https://brave.com/search/api) | Privacy-focused |
| SerpAPI | `SERP_API_KEY` | [serpapi.com](https://serpapi.com) | Google results |
| Exa | `EXA_API_KEY` | [exa.ai](https://exa.ai) | Neural/semantic search |

The app auto-detects which key is present. Priority: Tavily → Brave → SerpAPI → Exa.

---

## API Reference

### `POST /api/research`

**Request body:**
```json
{
  "topic": "latest Solana memecoin meta",
  "maxSources": 8
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `topic` | string | Yes | — | Research topic (max 500 chars) |
| `maxSources` | number | No | 8 | Number of sources to analyze (3–15) |

**Response:**
```json
{
  "topic": "latest Solana memecoin meta",
  "summary": "Executive summary...",
  "keyFindings": ["Finding 1", "Finding 2"],
  "sources": [
    {
      "title": "Article title",
      "url": "https://...",
      "source": "example.com",
      "author": "Jane Doe",
      "publishedDate": "2024-01-15",
      "summary": "What this article says...",
      "mainClaims": ["Claim 1", "Claim 2"],
      "relevanceScore": 8
    }
  ],
  "timeline": [
    { "date": "Jan 2024", "event": "Something happened", "source": "https://..." }
  ],
  "conflicts": ["Source A says X, Source B says Y"],
  "opportunities": ["Key insight or angle"],
  "finalVerdict": "Overall conclusion...",
  "confidence": "high"
}
```

---

## Project Structure

```
research-agent/
├── app/
│   ├── api/
│   │   └── research/
│   │       └── route.ts        # Main API endpoint
│   ├── globals.css             # Dark mode styles
│   ├── layout.tsx
│   └── page.tsx                # Main page
├── components/
│   ├── SearchBar.tsx           # Search input with examples
│   ├── LoadingState.tsx        # Animated research progress
│   ├── SourceCard.tsx          # Individual source display
│   └── ResearchReport.tsx      # Full report with tabs
├── lib/
│   ├── search.ts               # Search provider abstraction
│   ├── extract.ts              # HTML content extraction
│   └── ai.ts                   # OpenAI report generation
├── types/
│   └── research.ts             # TypeScript types
├── .env.local.example          # Environment variable template
└── README.md
```

---

## Switching Search Providers

The search provider is auto-detected from your environment variables. To switch:

1. Comment out your current search API key in `.env.local`
2. Add the new provider's key
3. Restart the dev server

To hardcode a provider, pass `searchProvider` in the request body:
```json
{ "topic": "...", "searchProvider": "brave" }
```

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Add your environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Rate Limiting

The API has a built-in in-memory rate limiter:
- **10 requests per IP per minute**
- Resets on server restart (use Redis for production persistence)

---

## Limitations & Notes

- The agent cannot access paywalled content
- Social media URLs (Twitter, Instagram, etc.) are skipped automatically
- Article extraction quality varies by website
- All claims in the report are sourced from the extracted articles — the AI is instructed not to hallucinate
- If sources are weak, the confidence level will be `low` and the report will say so clearly

---

## Tech Stack

- **Next.js 15** — App Router
- **TypeScript** — Full type safety
- **Tailwind CSS v4** — Styling
- **OpenAI SDK** — AI analysis
- **Axios** — HTTP requests
- **Cheerio** — HTML parsing

## License

MIT
