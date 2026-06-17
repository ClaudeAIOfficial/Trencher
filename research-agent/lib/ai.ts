/**
 * AI summarization layer.
 * Uses OpenAI to analyze extracted article content and produce a structured
 * research report.
 */

import OpenAI from "openai";
import { ResearchReport, Source, ConfidenceLevel } from "./types";
import { ExtractedContent } from "./extract";
import { SearchResult } from "./types";

let _openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

interface ArticleInput {
  url: string;
  title: string;
  source: string;
  author: string;
  publishedDate: string;
  text: string;
  snippet: string;
}

/**
 * Asks the AI to assess each article individually before the final report.
 * Returns structured per-source data.
 */
export async function analyzeArticles(
  articles: ArticleInput[]
): Promise<Source[]> {
  const openai = getClient();

  const prompt = `You are a research analyst. Analyze each article below and return a JSON array.

For each article output an object with these fields:
- title: string (use the article's actual title)
- url: string (exact URL provided)
- source: string (domain/publication name)
- author: string (empty string if unknown)
- publishedDate: string (empty string if unknown)
- summary: string (2-3 sentence factual summary)
- mainClaims: string[] (3-5 key claims made in the article)
- keyQuotes: string[] (1-2 exact notable quotes if present, else empty array)
- relevanceScore: number 1-10 (how relevant to the research topic)

RULES:
- Do NOT invent information. Only use what is in the text.
- If the article is low quality, spam, or irrelevant, set relevanceScore to 1-3.
- Keep summaries factual and neutral.

Articles to analyze:
${articles
  .map(
    (a, i) => `
--- Article ${i + 1} ---
URL: ${a.url}
Title: ${a.title}
Source: ${a.source}
Author: ${a.author}
Published: ${a.publishedDate}
Content:
${a.text.slice(0, 3000)}
`
  )
  .join("\n")}

Return ONLY a valid JSON array, no markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw);
    const arr: Source[] = Array.isArray(parsed)
      ? parsed
      : parsed.articles || parsed.results || [];
    return arr;
  } catch {
    return [];
  }
}

/**
 * Synthesizes all analyzed sources into the final research report.
 */
export async function generateReport(
  topic: string,
  sources: Source[]
): Promise<ResearchReport> {
  const openai = getClient();

  if (sources.length === 0) {
    return emptyReport(topic);
  }

  const sourcesText = sources
    .map(
      (s, i) => `
Source ${i + 1}: ${s.title}
URL: ${s.url}
Published: ${s.publishedDate}
Summary: ${s.summary}
Claims: ${s.mainClaims.join("; ")}
`
    )
    .join("\n");

  const prompt = `You are an expert research analyst. Based on the following sources about "${topic}", generate a comprehensive research report.

SOURCES:
${sourcesText}

Generate a JSON object with these exact fields:
{
  "topic": "${topic}",
  "summary": "Executive summary - 3-4 clear sentences about the most important findings",
  "keyFindings": ["finding 1", "finding 2", ...] (5-8 bullet points),
  "timeline": [{"date": "...", "event": "...", "source": "url"}, ...] (chronological if applicable, else empty array),
  "conflicts": [{"claim": "...", "perspectives": [{"source": "url", "position": "..."}, ...]}] (disagreements between sources, else empty array),
  "opportunities": ["opportunity/insight 1", "opportunity/insight 2", ...] (3-5 takeaways),
  "finalVerdict": "Direct conclusion about what the research shows (2-3 sentences)",
  "confidence": "low" | "medium" | "high" (based on source quality and quantity)
}

RULES:
- Only reference information that appears in the provided sources.
- If sources conflict, note it in the conflicts array.
- If evidence is thin or sources are low quality, set confidence to "low" and say so in the finalVerdict.
- Do NOT invent facts, dates, names, or URLs.
- Keep the tone professional and analytical.

Return ONLY valid JSON, no markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw);
    return {
      topic,
      summary: parsed.summary || "",
      keyFindings: parsed.keyFindings || [],
      sources,
      timeline: parsed.timeline || [],
      conflicts: parsed.conflicts || [],
      opportunities: parsed.opportunities || [],
      finalVerdict: parsed.finalVerdict || "",
      confidence: (parsed.confidence as ConfidenceLevel) || "low",
    };
  } catch {
    return emptyReport(topic);
  }
}

/**
 * Used when no usable sources are found.
 */
function emptyReport(topic: string): ResearchReport {
  return {
    topic,
    summary:
      "No reliable sources were found for this topic. The search returned results but none contained sufficient extractable content.",
    keyFindings: ["Insufficient sources found to draw reliable conclusions."],
    sources: [],
    timeline: [],
    conflicts: [],
    opportunities: [],
    finalVerdict:
      "Not enough reliable sources were found. Try refining your search query or searching for a more specific aspect of this topic.",
    confidence: "low",
  };
}

/**
 * Merges search snippets with extracted content for articles that could not be fetched.
 * This ensures snippets alone are still analyzed when full fetch fails.
 */
export function mergeSearchWithExtracted(
  searchResults: SearchResult[],
  extracted: ExtractedContent[]
): ArticleInput[] {
  const extractedMap = new Map(extracted.map((e) => [e.url, e]));

  return searchResults.map((sr) => {
    const ext = extractedMap.get(sr.url);
    return {
      url: sr.url,
      title: ext?.title || sr.title,
      source: sr.source || "",
      author: ext?.author || "",
      publishedDate: ext?.publishedDate || sr.publishedDate || "",
      text: ext?.text || sr.snippet,
      snippet: sr.snippet,
    };
  });
}
