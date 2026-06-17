import OpenAI from "openai";
import { z } from "zod";

import type { ExtractedArticle, ConfidenceLevel, SourceAnalysis } from "@/lib/types";

const modelOutputSchema = z.object({
  summary: z.string().min(1),
  keyFindings: z.array(z.string()).default([]),
  timeline: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  finalVerdict: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  sourceAnalyses: z
    .array(
      z.object({
        url: z.string().url(),
        summary: z.string().default(""),
        mainClaims: z.array(z.string()).default([]),
        importantFacts: z.array(z.string()).default([]),
        keyQuotes: z.array(z.string()).default([]),
        relevanceScore: z.number().int().min(1).max(10).default(1)
      })
    )
    .default([])
});

const stripMarkdownCodeFence = (value: string): string =>
  value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

const extractJsonObject = (value: string): string => {
  const cleaned = stripMarkdownCodeFence(value);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
};

const aiClient = (() => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
})();

const defaultModel = "gpt-4.1-mini";

export interface SynthesizedReport {
  summary: string;
  keyFindings: string[];
  timeline: string[];
  conflicts: string[];
  opportunities: string[];
  finalVerdict: string;
  confidence: ConfidenceLevel;
  sourceAnalyses: SourceAnalysis[];
}

export const synthesizeResearchReport = async (
  topic: string,
  articles: ExtractedArticle[]
): Promise<SynthesizedReport> => {
  if (!aiClient) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_MODEL || defaultModel;

  const sourcePayload = articles.map((article, index) => ({
    id: index + 1,
    title: article.title,
    url: article.url,
    source: article.source,
    author: article.author,
    publishedDate: article.publishedDate,
    content: article.text.slice(0, 4000)
  }));

  const completion = await aiClient.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: {
      type: "json_object"
    },
    messages: [
      {
        role: "system",
        content:
          "You are a factual research analyst. Only use information from provided sources. Never invent titles, dates, authors, or URLs. If evidence is weak or conflicting, explicitly mention that and reduce confidence."
      },
      {
        role: "user",
        content: `Topic: ${topic}

You must return JSON with this exact shape:
{
  "summary": "string",
  "keyFindings": ["string"],
  "timeline": ["string"],
  "conflicts": ["string"],
  "opportunities": ["string"],
  "finalVerdict": "string",
  "confidence": "low | medium | high",
  "sourceAnalyses": [
    {
      "url": "must match one provided URL exactly",
      "summary": "short source summary",
      "mainClaims": ["claim tied to this source"],
      "importantFacts": ["fact tied to this source"],
      "keyQuotes": ["direct quote or empty array"],
      "relevanceScore": 1-10
    }
  ]
}

Rules:
- Every claim must be supportable by at least one provided source.
- If no claim can be verified, say so clearly.
- Keep wording concise and useful.
- Include sourceAnalyses only for provided URLs.

Sources:
${JSON.stringify(sourcePayload)}`
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The model returned an empty response.");
  }

  const parsed = JSON.parse(extractJsonObject(content));
  return modelOutputSchema.parse(parsed);
};
