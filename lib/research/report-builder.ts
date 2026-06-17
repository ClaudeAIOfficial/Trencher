import OpenAI from "openai";
import { z } from "zod";
import { ExtractedArticle, ResearchReport } from "@/lib/research/types";

const sourceSchema = z.object({
  title: z.string().default(""),
  url: z.string().url(),
  source: z.string().default(""),
  author: z.string().default(""),
  publishedDate: z.string().default(""),
  summary: z.string().default(""),
  mainClaims: z.array(z.string()).default([]),
  importantFacts: z.array(z.string()).default([]),
  keyQuotes: z.array(z.string()).default([]),
  relevanceScore: z.number().min(1).max(10).default(5),
});

const reportSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  keyFindings: z.array(z.string()),
  sources: z.array(sourceSchema),
  timeline: z.array(z.string()),
  conflicts: z.array(z.string()),
  opportunities: z.array(z.string()),
  finalVerdict: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

function truncate(value: string, maxLength = 3_500): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function getNotEnoughSourcesReport(topic: string): ResearchReport {
  return {
    topic,
    summary:
      "Not enough reliable sources were found to produce a confident research report for this topic.",
    keyFindings: [
      "The agent could not validate enough high-quality sources.",
      "Try broadening or rephrasing the query for better search coverage.",
    ],
    sources: [],
    timeline: [],
    conflicts: [],
    opportunities: [],
    finalVerdict:
      "Not enough reliable sources found. Any conclusion at this point would be speculative.",
    confidence: "low",
  };
}

function normalizeReportSources(
  report: z.infer<typeof reportSchema>,
  referenceSources: ExtractedArticle[]
): ResearchReport {
  const byUrl = new Map(referenceSources.map((source) => [source.url, source]));

  const normalizedSources = report.sources
    .map((candidate) => {
      const known = byUrl.get(candidate.url);
      if (!known) {
        return null;
      }
      return {
        title: known.title || candidate.title || "",
        url: known.url,
        source: known.source || candidate.source || "",
        author: known.author || "",
        publishedDate: known.publishedDate || "",
        summary: candidate.summary || "",
        mainClaims: candidate.mainClaims ?? [],
        importantFacts: candidate.importantFacts ?? [],
        keyQuotes: candidate.keyQuotes ?? [],
        relevanceScore: Math.max(1, Math.min(10, Math.round(candidate.relevanceScore ?? 5))),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    topic: report.topic,
    summary: report.summary,
    keyFindings: report.keyFindings,
    sources: normalizedSources,
    timeline: report.timeline,
    conflicts: report.conflicts,
    opportunities: report.opportunities,
    finalVerdict: report.finalVerdict,
    confidence: report.confidence,
  };
}

export async function buildResearchReport(
  topic: string,
  extractedArticles: ExtractedArticle[]
): Promise<ResearchReport> {
  if (extractedArticles.length === 0) {
    return getNotEnoughSourcesReport(topic);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const sourcePayload = extractedArticles.map((article, index) => ({
    id: index + 1,
    title: article.title,
    url: article.url,
    source: article.source,
    author: article.author,
    publishedDate: article.publishedDate,
    snippet: truncate(article.snippet, 800),
    contentExcerpt: truncate(article.content, 3500),
    qualityScore: article.qualityScore,
  }));

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are a rigorous research analyst.",
          "Rules:",
          "1) Only use facts from provided sources.",
          "2) Do not invent titles, authors, dates, URLs, or websites.",
          "3) If evidence is weak, say confidence is low.",
          "4) Mention conflicts clearly when sources disagree.",
          "5) Keep output concise and useful.",
          "6) Return valid JSON only.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Create a structured research report. Use only the supplied source list. If no strong evidence exists, explicitly say so. Every claim should be supported by at least one source.",
          outputShape: {
            topic: "string",
            summary: "string",
            keyFindings: ["string"],
            sources: [
              {
                title: "string",
                url: "string",
                source: "string",
                author: "string",
                publishedDate: "string",
                summary: "string",
                mainClaims: ["string"],
                importantFacts: ["string"],
                keyQuotes: ["string"],
                relevanceScore: "number 1-10",
              },
            ],
            timeline: ["string"],
            conflicts: ["string"],
            opportunities: ["string"],
            finalVerdict: "string",
            confidence: "low|medium|high",
          },
          topic,
          sources: sourcePayload,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("LLM returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("Failed to parse model response as JSON.");
  }

  const validated = reportSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error("Model output did not match expected report schema.");
  }

  return normalizeReportSources(validated.data, extractedArticles);
}

export { getNotEnoughSourcesReport };
