# Viral Lore Agent 🔍

> Give it any clue — it researches the internet fast to find the origin, lore, and viral context.

## What it does

The Viral Lore Agent accepts any of these inputs:

| Input Type | Example |
|------------|---------|
| Image / Screenshot | Upload a meme or screenshot |
| Tweet / X link | `https://x.com/user/status/...` |
| Instagram link | `https://www.instagram.com/p/...` |
| TikTok link | `https://www.tiktok.com/@user/video/...` |
| Reddit link | `https://www.reddit.com/r/.../` |
| Facebook link | `https://www.facebook.com/...` |
| YouTube link | `https://www.youtube.com/watch?v=...` |
| Generic URL | Any web page |
| Meme caption | `"we do a little trolling"` |
| Person / character name | `"Giga Chad"` |
| Event or trend name | `"ice bucket challenge"` |

It then:
1. **Detects** the input type automatically
2. **Enriches** — scrapes the URL or analyzes the image with GPT-4o Vision
3. **Searches** the web across Google, Reddit, and news sources simultaneously
4. **Synthesizes** all findings into a structured report using GPT-4o

## Output format

```
Name:            The meme / trend / person / event name
What it is:      2-3 sentence plain-English explanation
Original source: Who created it and where it first appeared
Earliest post:   Date + platform of earliest known instance
Lore:            Backstory, evolution, notable moments
Why viral:       What drove the spread
Best links:      Top 4 source URLs
Red flags:       Misinformation, misattribution, or satire warnings
Verdict:         early / mid / late / dead
```

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd <repo>
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

You only **need** an OpenAI API key. The app uses DuckDuckGo for web search (no key required). Optionally add a `SERP_API_KEY` for richer results.

### 3. Run

```bash
python app.py
# or
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Then open [http://localhost:8000](http://localhost:8000).

## Tech stack

- **Backend**: FastAPI + Python 3.12
- **AI**: OpenAI GPT-4o (Vision + text synthesis)
- **Search**: DuckDuckGo Search (duckduckgo-search library, free)
- **Scraping**: requests + BeautifulSoup4 + lxml
- **Frontend**: Vanilla JS, custom CSS (no framework)

## Project structure

```
viral-lore-agent/
├── app.py              # FastAPI backend + research logic
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
├── README.md
└── static/
    ├── index.html      # Frontend HTML
    ├── styles.css      # Dark theme UI styles
    └── app.js          # Frontend JavaScript
```
