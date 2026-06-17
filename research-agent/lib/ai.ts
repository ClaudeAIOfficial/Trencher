/**
 * AI summarization layer.
 * Uses OpenAI to analyze collected article content and produce a structured research report.
 */

import OpenAI from "openai";
import type { ExtractedContent, ResearchReport } from "@/types/research";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function buildPrompt(topic: string, articles: ExtractedContent[]): string {
  const articlesText = articles
    .map(
      (a, i) => `
--- Article ${i + 1} ---
Title: ${a.title}
Source: ${a.source}
Author: ${a.author ?? "Unknown"}
Published: ${a.publishedDate ?? "Unknown"}
URL: ${a.url}
Content:
${a.text.slice(0, 5000)}
`
    )
    .join("\n");

  return `You are an expert research analyst. Your job is to read the following articles and produce a comprehensive, accurate research report about the topic: "${topic}".

CRITICAL RULES:
1. NEVER invent or hallucinate information. Only use facts from the provided articles.
2. Every claim must be traceable to one of the provided source URLs.
3. If sources are weak or insufficient, say so clearly.
4. If sources contradict each other, highlight the conflict.
5. Do not fabricate article titles, authors, dates, or URLs.
6. Be direct and useful. Skip filler language.

ARTICLES PROVIDED:
${articlesText}

Return a JSON object matching this exact structure (no markdown, just raw JSON):
{
  "topic": "${topic}",
  "summary": "2-4 sentence executive summary of the most important findings",
  "keyFindings": ["finding 1", "finding 2", "finding 3", "...up to 8 key findings"],
  "sources": [
    {
      "title": "exact article title",
      "url": "exact URL from above",
      "source": "domain name",
      "author": "author name or empty string",
      "publishedDate": "date or empty string",
      "summary": "1-3 sentence summary of what this article says",
      "mainClaims": ["claim 1", "claim 2", "claim 3"],
      "relevanceScore": 8
    }
  ],
  "timeline": [
    { "date": "date string", "event": "what happened", "source": "URL" }
  ],
  "conflicts": ["description of conflicting information between sources, or empty array if none"],
  "opportunities": ["insight 1", "insight 2", "...opportunities or angles found in the research"],
  "finalVerdict": "2-3 sentence direct conclusion about what the research shows",
  "confidence": "low | medium | high"
}

Only include sources from the articles provided above. The confidence level should reflect:
- "high": Multiple reliable, consistent sources with clear information
- "medium": Some reliable sources but limited or slightly inconsistent
- "low": Few sources, unclear information, or weak/unreliable sources

Return only valid JSON. No explanation before or after.`;
}

export async function generateReport(
  topic: string,
  articles: ExtractedContent[]
): Promise<ResearchReport> {
  if (articles.length === 0) {
    throw new Error("No articles provided for analysis.");
  }

  const client = getClient();
  const prompt = buildPrompt(topic, articles);

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a rigorous research analyst. You produce accurate, source-backed research reports in valid JSON format. You never hallucinate or invent information.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let parsed: ResearchReport;
  try {
    parsed = JSON.parse(raw) as ResearchReport;
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  // Validate required fields
  if (!parsed.topic || !parsed.summary) {
    throw new Error("AI response is missing required fields.");
  }

  // Ensure arrays exist
  parsed.keyFindings = parsed.keyFindings ?? [];
  parsed.sources = parsed.sources ?? [];
  parsed.timeline = parsed.timeline ?? [];
  parsed.conflicts = parsed.conflicts ?? [];
  parsed.opportunities = parsed.opportunities ?? [];

  return parsed;
}
