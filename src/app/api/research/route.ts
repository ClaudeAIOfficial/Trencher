import { NextResponse } from "next/server";
import { z } from "zod";

import { extractArticles } from "@/lib/extract/article";
import { synthesizeResearchReport } from "@/lib/llm/research";
import { assertWithinRateLimit, getClientId, RateLimitError } from "@/lib/rate-limit";
import { searchWeb } from "@/lib/search";
import type { ResearchResponse, SourceAnalysis } from "@/lib/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, "Topic must be at least 3 characters.")
    .max(240, "Topic must be less than 240 characters.")
});

const trustedDomains = [
  "reuters.com",
  "apnews.com",
  "bloomberg.com",
  "bbc.com",
  "nytimes.com",
  "theverge.com",
  "techcrunch.com"
];

const confidenceFromSources = (
  sourceCount: number,
  sources: Array<{ source: string }>,
  modelConfidence: "low" | "medium" | "high"
): "low" | "medium" | "high" => {
  if (sourceCount < 2) return "low";

  const trustedCount = sources.filter((item) =>
    trustedDomains.some((trusted) => item.source.endsWith(trusted))
  ).length;

  if (sourceCount >= 6 && trustedCount >= 2 && modelConfidence !== "low") {
    return "high";
  }

  if (sourceCount >= 3 && modelConfidence === "high") {
    return "medium";
  }

  return modelConfidence;
};

const fallbackResponse = (topic: string): ResearchResponse => ({
  topic,
  summary: "Not enough reliable sources found to produce a confident report.",
  keyFindings: [],
  sources: [],
  timeline: [],
  conflicts: [
    "No reliable source set was available, so conflicts could not be assessed."
  ],
  opportunities: [],
  finalVerdict:
    "There are not enough reliable sources available for a trustworthy conclusion at this time.",
  confidence: "low"
});

const normalizeAnalysisMap = (sourceAnalyses: SourceAnalysis[]) => {
  const map = new Map<string, SourceAnalysis>();

  for (const item of sourceAnalyses) {
    map.set(item.url, {
      ...item,
      relevanceScore: Math.max(1, Math.min(10, Math.round(item.relevanceScore || 1)))
    });
  }

  return map;
};

export async function POST(request: Request) {
  try {
    const clientId = getClientId(request.headers);
    assertWithinRateLimit(clientId);

    const body = await request.json();
    const { topic } = requestSchema.parse(body);

    const searchResults = await searchWeb(topic);
    if (!searchResults.length) {
      return NextResponse.json(fallbackResponse(topic));
    }

    const extracted = await extractArticles(searchResults, 8);
    if (!extracted.length) {
      return NextResponse.json(fallbackResponse(topic));
    }

    const synthesis = await synthesizeResearchReport(topic, extracted);
    const analysisMap = normalizeAnalysisMap(synthesis.sourceAnalyses);

    const mergedSources = extracted.map((article) => {
      const analysis = analysisMap.get(article.url);

      return {
        title: article.title,
        url: article.url,
        source: article.source,
        author: article.author || "Unknown",
        publishedDate: article.publishedDate || "Unknown",
        summary: analysis?.summary || "No summary generated.",
        mainClaims: analysis?.mainClaims ?? [],
        importantFacts: analysis?.importantFacts ?? [],
        keyQuotes: analysis?.keyQuotes ?? [],
        relevanceScore: analysis?.relevanceScore ?? 1
      };
    });

    const response: ResearchResponse = {
      topic,
      summary: synthesis.summary,
      keyFindings: synthesis.keyFindings,
      sources: mergedSources,
      timeline: synthesis.timeline,
      conflicts: synthesis.conflicts,
      opportunities: synthesis.opportunities,
      finalVerdict: synthesis.finalVerdict,
      confidence: confidenceFromSources(
        mergedSources.length,
        mergedSources,
        synthesis.confidence
      )
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds)
          }
        }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while running research."
      },
      { status: 500 }
    );
  }
}
