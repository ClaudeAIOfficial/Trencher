import OpenAI from "openai";
import { z } from "zod";

import type { ExtractedArticle, ResearchReport, ResearchSource } from "./types";

const MAX_SOURCES_FOR_MODEL = 7;

const ResearchSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  author: z.string(),
  publishedDate: z.string(),
  summary: z.string(),
  mainClaims: z.array(z.string()),
  importantFacts: z.array(z.string()),
  keyQuotes: z.array(z.string()),
  relevanceScore: z.number().min(1).max(10)
});

const ResearchReportSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  keyFindings: z.array(z.string()),
  sources: z.array(ResearchSourceSchema),
  timeline: z.array(z.string()),
  conflicts: z.array(z.string()),
  opportunities: z.array(z.string()),
  finalVerdict: z.string(),
  confidence: z.enum(["low", "medium", "high"])
});

const reportJsonSchema = {
  name: "research_report",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "topic",
      "summary",
      "keyFindings",
      "sources",
      "timeline",
      "conflicts",
      "opportunities",
      "finalVerdict",
      "confidence"
    ],
    properties: {
      topic: { type: "string" },
      summary: { type: "string" },
      keyFindings: { type: "array", items: { type: "string" } },
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "url",
            "source",
            "author",
            "publishedDate",
            "summary",
            "mainClaims",
            "importantFacts",
            "keyQuotes",
            "relevanceScore"
          ],
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            source: { type: "string" },
            author: { type: "string" },
            publishedDate: { type: "string" },
            summary: { type: "string" },
            mainClaims: { type: "array", items: { type: "string" } },
            importantFacts: { type: "array", items: { type: "string" } },
            keyQuotes: { type: "array", items: { type: "string" } },
            relevanceScore: { type: "number", minimum: 1, maximum: 10 }
          }
        }
      },
      timeline: { type: "array", items: { type: "string" } },
      conflicts: { type: "array", items: { type: "string" } },
      opportunities: { type: "array", items: { type: "string" } },
      finalVerdict: { type: "string" },
      confidence: { type: "string", enum: ["low", "medium", "high"] }
    }
  }
} as const;

function asSourceFallback(article: ExtractedArticle): ResearchSource {
  return {
    title: article.title,
    url: article.url,
    source: article.source,
    author: article.author ?? "",
    publishedDate: article.publishedDate ?? "",
    summary: article.searchSnippet || article.excerpt.slice(0, 280),
    mainClaims: [],
    importantFacts: [],
    keyQuotes: [],
    relevanceScore: article.qualityScore
  };
}

function reconcileSources(report: ResearchReport, articles: ExtractedArticle[]): ResearchReport {
  const byUrl = new Map(articles.map((article) => [article.url, article]));
  const aiByUrl = new Map(report.sources.map((source) => [source.url, source]));

  const sources = articles.map((article) => {
    const generated = aiByUrl.get(article.url);
    const fallback = asSourceFallback(article);

    if (!generated) return fallback;

    return {
      ...generated,
      title: article.title,
      url: article.url,
      source: article.source,
      author: article.author ?? "",
      publishedDate: article.publishedDate ?? "",
      relevanceScore: Math.max(1, Math.min(10, Math.round(generated.relevanceScore || article.qualityScore)))
    };
  });

  return {
    ...report,
    sources: sources.filter((source) => byUrl.has(source.url))
  };
}

function sourcePayload(articles: ExtractedArticle[]) {
  return articles.slice(0, MAX_SOURCES_FOR_MODEL).map((article, index) => ({
    id: `S${index + 1}`,
    title: article.title,
    source: article.source,
    author: article.author ?? "",
    publishedDate: article.publishedDate ?? "",
    url: article.url,
    searchSnippet: article.searchSnippet ?? "",
    qualityScore: article.qualityScore,
    excerpt: article.excerpt
  }));
}

export function notEnoughSourcesReport(topic: string, reason: string, articles: ExtractedArticle[] = []): ResearchReport {
  return {
    topic,
    summary: "Not enough reliable sources found to produce a well-supported research report.",
    keyFindings: [
      reason,
      "The report is intentionally limited because the agent could not verify the topic across enough useful public sources."
    ],
    sources: articles.map(asSourceFallback),
    timeline: [],
    conflicts: [],
    opportunities: [],
    finalVerdict:
      "Not enough reliable sources found. Try a more specific query, a different search provider, or verify that the configured search API can access current web results.",
    confidence: "low"
  };
}

export async function createResearchReport(topic: string, articles: ExtractedArticle[]): Promise<ResearchReport> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (articles.length === 0) {
    return notEnoughSourcesReport(topic, "No pages with extractable article text were found.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const sources = sourcePayload(articles);

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: reportJsonSchema
    },
    messages: [
      {
        role: "system",
        content:
          "You are a careful research analyst. Use only the supplied sources. Do not invent titles, dates, authors, URLs, claims, quotes, or facts. If a fact is weakly supported or cannot be verified, say so. Connect claims to sources with bracketed source IDs like [S1] inside the text fields. Mention conflicts explicitly when sources disagree. If the sources are sparse or low quality, set confidence to low."
      },
      {
        role: "user",
        content: JSON.stringify({
          task:
            "Create a concise but useful research report for this topic. Extract main claims, important facts, useful exact quotes only when present in the excerpt, summaries, source relevance scores, key findings, timeline if relevant, conflicts, opportunities, and a final verdict.",
          topic,
          sources
        })
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty research report.");
  }

  const parsed = ResearchReportSchema.parse(JSON.parse(content));
  const reconciled = reconcileSources(parsed, articles.slice(0, MAX_SOURCES_FOR_MODEL));

  if (articles.length < 2) {
    return {
      ...reconciled,
      confidence: "low",
      keyFindings: [
        "Only one useful source was found, so conclusions should be treated as tentative.",
        ...reconciled.keyFindings
      ]
    };
  }

  return reconciled;
}
