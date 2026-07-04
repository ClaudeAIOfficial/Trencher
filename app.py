"""
Viral Lore Agent - FastAPI Backend
Researches origin, lore, and viral context of any input.
"""

import asyncio
import base64
import json
import os
import re
import time
from typing import Optional

import httpx
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

load_dotenv()

app = FastAPI(title="Viral Lore Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


# ---------------------------------------------------------------------------
# Input Type Detection
# ---------------------------------------------------------------------------

PLATFORM_PATTERNS = {
    "twitter": [r"twitter\.com", r"x\.com/\w+/status"],
    "instagram": [r"instagram\.com"],
    "facebook": [r"facebook\.com", r"fb\.com", r"fb\.watch"],
    "tiktok": [r"tiktok\.com"],
    "reddit": [r"reddit\.com", r"redd\.it"],
    "youtube": [r"youtube\.com", r"youtu\.be"],
}


def detect_input_type(text: str, has_file: bool = False) -> str:
    if has_file:
        return "image"
    text = text.strip()
    if re.match(r"https?://", text, re.I):
        for platform, patterns in PLATFORM_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, text, re.I):
                    return platform
        return "url"
    return "text"


# ---------------------------------------------------------------------------
# Web Search (DuckDuckGo, no API key required)
# ---------------------------------------------------------------------------

def _ddg_search(query: str, max_results: int = 8) -> list[dict]:
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))
    except Exception as e:
        print(f"DDG search error for '{query}': {e}")
        return []


def _ddg_news(query: str, max_results: int = 6) -> list[dict]:
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return list(ddgs.news(query, max_results=max_results))
    except Exception as e:
        print(f"DDG news error for '{query}': {e}")
        return []


async def search_web(query: str, max_results: int = 8) -> list[dict]:
    return await asyncio.to_thread(_ddg_search, query, max_results)


async def search_news(query: str, max_results: int = 6) -> list[dict]:
    return await asyncio.to_thread(_ddg_news, query, max_results)


# ---------------------------------------------------------------------------
# URL Scraping
# ---------------------------------------------------------------------------

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _scrape(url: str) -> dict:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True)
        soup = BeautifulSoup(resp.text, "lxml")

        def meta(name=None, prop=None) -> str:
            if name:
                tag = soup.find("meta", attrs={"name": name})
            else:
                tag = soup.find("meta", attrs={"property": prop})
            return tag.get("content", "") if tag else ""

        title = meta(prop="og:title") or (soup.title.text.strip() if soup.title else "")
        description = meta(prop="og:description") or meta(name="description")
        og_image = meta(prop="og:image")
        author = meta(name="author") or meta(prop="article:author")
        published = meta(prop="article:published_time") or meta(name="date")

        # Also try JSON-LD for richer data
        json_ld_data = {}
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "{}")
                if isinstance(data, list):
                    data = data[0]
                json_ld_data.update(data)
            except Exception:
                pass

        # Extract readable text
        for el in soup(["script", "style", "nav", "footer", "header", "aside"]):
            el.decompose()
        text = soup.get_text(separator="\n", strip=True)[:4000]

        return {
            "title": title,
            "description": description,
            "text": text,
            "og_image": og_image,
            "author": author or json_ld_data.get("author", {}).get("name", ""),
            "published": published or str(json_ld_data.get("datePublished", "")),
            "url": url,
        }
    except Exception as e:
        return {"error": str(e), "url": url, "title": "", "description": "", "text": ""}


def _scrape_reddit(url: str) -> dict:
    """Use Reddit JSON API for richer data."""
    try:
        json_url = url.rstrip("/") + ".json"
        resp = requests.get(json_url, headers={**HEADERS, "Accept": "application/json"}, timeout=12)
        data = resp.json()
        post = data[0]["data"]["children"][0]["data"]
        comments_raw = data[1]["data"]["children"][:5]
        comments = [
            c["data"].get("body", "")
            for c in comments_raw
            if c.get("kind") == "t1"
        ]
        return {
            "title": post.get("title", ""),
            "description": post.get("selftext", "")[:1000],
            "author": post.get("author", ""),
            "subreddit": post.get("subreddit", ""),
            "score": post.get("score", 0),
            "num_comments": post.get("num_comments", 0),
            "created_utc": post.get("created_utc"),
            "url": post.get("url", url),
            "text": post.get("selftext", "")[:2000],
            "comments": comments,
        }
    except Exception:
        return _scrape(url)


async def scrape_url(url: str, platform: str = "url") -> dict:
    if platform == "reddit":
        return await asyncio.to_thread(_scrape_reddit, url)
    return await asyncio.to_thread(_scrape, url)


# ---------------------------------------------------------------------------
# Image Analysis (OpenAI Vision)
# ---------------------------------------------------------------------------

async def analyze_image(image_data: bytes, mime_type: str = "image/jpeg") -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")

    client = AsyncOpenAI(api_key=api_key)
    b64 = base64.b64encode(image_data).decode("utf-8")

    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Analyze this image thoroughly. "
                        "1) Describe exactly what you see. "
                        "2) Identify any text, memes, famous people, characters, logos, or cultural references. "
                        "3) What would be the best search query to find the origin of this image or meme? "
                        "4) List all notable elements. "
                        "Be specific and concise."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                },
            ],
        }],
        max_tokens=600,
    )
    return resp.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Build Search Queries Per Input Type
# ---------------------------------------------------------------------------

def build_queries(input_text: str, input_type: str, scraped: dict, image_desc: str) -> list[str]:
    queries = []

    if input_type == "image":
        short = image_desc[:120]
        queries = [
            short,
            f"{short} meme origin know your meme",
            f"{short} viral trend",
            f'"{short[:60]}" reddit',
        ]

    elif input_type in ("twitter", "instagram", "facebook", "tiktok"):
        title = scraped.get("title", "")
        desc = scraped.get("description", "")
        base = title or desc or input_text
        queries = [
            f"{base} origin viral",
            f"{base} meme",
            f'site:reddit.com "{base[:80]}"',
            f"{base} know your meme",
        ]

    elif input_type == "reddit":
        title = scraped.get("title", input_text)
        queries = [
            f"{title} origin",
            f"{title} meme viral",
            f"{title} know your meme",
        ]

    elif input_type == "youtube":
        title = scraped.get("title", "")
        queries = [
            f"{title} origin meme",
            f"{title} viral trend",
            f'"{title[:80]}" reddit discussion',
        ]

    elif input_type == "url":
        title = scraped.get("title", input_text)
        queries = [
            f"{title} origin viral",
            f"{title} meme",
            f'site:reddit.com "{title[:80]}"',
        ]

    else:  # text / name / caption / sentence
        clean = input_text.strip().strip('"').strip("'")
        queries = [
            f'"{clean}" origin',
            f'"{clean}" meme know your meme',
            f"{clean} viral trend history",
            f'site:reddit.com "{clean}"',
            f"{clean} first post earliest",
            f"{clean} who started",
        ]

    # Always add a Know Your Meme search
    kym_term = image_desc[:60] if input_type == "image" else input_text[:80]
    queries.append(f"site:knowyourmeme.com {kym_term}")

    return [q for q in queries if q.strip()]


# ---------------------------------------------------------------------------
# Main Research Orchestrator
# ---------------------------------------------------------------------------

async def run_research(
    input_text: str,
    image_data: Optional[bytes] = None,
    mime_type: str = "image/jpeg",
) -> dict:
    input_type = detect_input_type(input_text, bool(image_data))

    # Step 1: Enrich input
    image_desc = ""
    scraped = {}

    if input_type == "image" and image_data:
        image_desc = await analyze_image(image_data, mime_type)
    elif input_type in ("url", "twitter", "instagram", "facebook", "tiktok", "reddit", "youtube"):
        scraped = await scrape_url(input_text, input_type)

    # Step 2: Build queries
    queries = build_queries(input_text, input_type, scraped, image_desc)

    # Step 3: Run searches concurrently
    search_tasks = [search_web(q, max_results=6) for q in queries[:5]]
    news_query = image_desc[:80] if input_type == "image" else (scraped.get("title") or input_text)
    search_tasks.append(search_news(news_query, max_results=6))

    all_results = await asyncio.gather(*search_tasks)
    web_results = []
    for r in all_results[:-1]:
        web_results.extend(r)
    news_results = all_results[-1]

    # Deduplicate by URL
    seen = set()
    unique_web = []
    for r in web_results:
        href = r.get("href", "")
        if href not in seen:
            seen.add(href)
            unique_web.append(r)

    return {
        "input_type": input_type,
        "image_description": image_desc,
        "scraped_content": scraped,
        "web_results": unique_web[:25],
        "news_results": news_results,
        "search_queries": queries,
    }


# ---------------------------------------------------------------------------
# AI Synthesis
# ---------------------------------------------------------------------------

def format_web_results(results: list[dict]) -> str:
    lines = []
    for r in results[:20]:
        title = r.get("title", "")
        href = r.get("href", "")
        body = r.get("body", "")[:300]
        lines.append(f"• [{title}]({href})\n  {body}")
    return "\n\n".join(lines)


def format_news_results(results: list[dict]) -> str:
    lines = []
    for r in results[:8]:
        title = r.get("title", "")
        href = r.get("url", r.get("href", ""))
        date = r.get("date", "")
        body = r.get("body", "")[:200]
        lines.append(f"• [{title}]({href}) — {date}\n  {body}")
    return "\n\n".join(lines)


SYSTEM_PROMPT = """You are the Viral Lore Agent — an expert internet archaeologist and meme historian.
Your job is to analyze any input (image, URL, text, name, caption) and produce a definitive lore report
about its origin, history, virality, and cultural significance.

Always return ONLY valid JSON. No markdown, no code blocks, no preamble — just the JSON object."""

ANALYSIS_TEMPLATE = """\
INPUT TYPE: {input_type}
USER INPUT: {input_text}
{image_section}
{scraped_section}

=== WEB SEARCH RESULTS ===
{web_results}

=== NEWS RESULTS ===
{news_results}

Based on ALL the above research, produce a JSON report in EXACTLY this format:

{{
  "name": "The official or commonly known name of this meme, trend, person, event, or phenomenon",
  "what_it_is": "2-3 clear sentences explaining exactly what this is, in plain language",
  "original_source": "Who created it, where it first appeared (platform, account, community)",
  "earliest_post_found": "Best estimate: date (Month Year) and platform/URL of the earliest known instance",
  "lore": "3-5 sentences covering: backstory, how it evolved, key moments, cultural context, notable variants",
  "why_viral": "What made this spread — humor, relatability, shock, controversy, or community dynamics",
  "best_links": ["url1", "url2", "url3", "url4"],
  "red_flags": "Misinformation, misattribution, satire mistaken as real, or 'uncertain origin' if unknown. Write 'None found' if clean.",
  "verdict": "early OR mid OR late OR dead",
  "verdict_reason": "1-2 sentences justifying the verdict stage",
  "confidence": "high OR medium OR low"
}}

VERDICT GUIDE:
- early: Just emerging, under-researched, few results, mostly niche communities
- mid: Growing fast, spreading across platforms, hitting mainstream
- late: Peaked, widely known, now referenced retrospectively or ironically
- dead: Forgotten, cringe, played out, or culturally buried

If you cannot determine something with certainty, state your best estimate and note uncertainty.
Return ONLY the JSON object."""


async def synthesize(input_text: str, research_data: dict) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")

    client = AsyncOpenAI(api_key=api_key)

    image_desc = research_data.get("image_description", "")
    scraped = research_data.get("scraped_content", {})

    image_section = f"IMAGE ANALYSIS:\n{image_desc}" if image_desc else ""
    scraped_parts = []
    if scraped.get("title"):
        scraped_parts.append(f"Page Title: {scraped['title']}")
    if scraped.get("description"):
        scraped_parts.append(f"Description: {scraped['description']}")
    if scraped.get("author"):
        scraped_parts.append(f"Author: {scraped['author']}")
    if scraped.get("published"):
        scraped_parts.append(f"Published: {scraped['published']}")
    if scraped.get("subreddit"):
        scraped_parts.append(f"Subreddit: r/{scraped['subreddit']}, Score: {scraped.get('score', 0)}, Comments: {scraped.get('num_comments', 0)}")
    if scraped.get("comments"):
        scraped_parts.append("Top Comments:\n" + "\n".join(f"  - {c[:200]}" for c in scraped["comments"][:3]))
    scraped_section = "SCRAPED CONTENT:\n" + "\n".join(scraped_parts) if scraped_parts else ""

    prompt = ANALYSIS_TEMPLATE.format(
        input_type=research_data["input_type"],
        input_text=input_text[:300],
        image_section=image_section,
        scraped_section=scraped_section,
        web_results=format_web_results(research_data.get("web_results", [])),
        news_results=format_news_results(research_data.get("news_results", [])),
    )

    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1500,
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    raw = resp.choices[0].message.content.strip()
    return json.loads(raw)


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/health")
async def health():
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    return {"status": "ok", "openai_configured": has_openai}


@app.post("/api/analyze")
async def analyze(
    input_text: str = Form(default=""),
    file: Optional[UploadFile] = File(default=None),
):
    # Validate we have something to work with
    if not input_text.strip() and not file:
        raise HTTPException(status_code=400, detail="Provide text input or upload an image.")

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.",
        )

    # Read file if provided
    image_data = None
    mime_type = "image/jpeg"
    if file and file.filename:
        image_data = await file.read()
        mime_type = file.content_type or "image/jpeg"

    start = time.time()

    try:
        research_data = await run_research(input_text, image_data, mime_type)
        result = await synthesize(input_text, research_data)

        return JSONResponse({
            "ok": True,
            "result": result,
            "meta": {
                "input_type": research_data["input_type"],
                "sources_searched": len(research_data.get("web_results", [])),
                "elapsed_seconds": round(time.time() - start, 1),
                "search_queries": research_data.get("search_queries", []),
            },
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
