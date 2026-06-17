/**
 * POST /api/research
 *
 * Accepts { topic: string } and returns a full ResearchReport.
 *
 * Flow:
 * 1. Validate input
 * 2. Search the web for relevant results
 * 3. Extract article content from result URLs
 * 4. Analyze each article with AI
 * 5. Generate the final structured report
 */

import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "@/lib/search";
import { extractMultiple } from "@/lib/extract";
import { analyzeArticles, generateReport, mergeSearchWithExtracted } from "@/lib/ai";
import { ResearchRequest, ResearchError } from "@/lib/types";

// Simple in-memory rate limiting (resets on cold start)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) return false;

  record.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function errorResponse(message: string, code: string, status: number) {
  const body: ResearchError = { error: message, code };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return errorResponse(
      "Too many requests. Please wait a minute before trying again.",
      "RATE_LIMIT",
      429
    );
  }

  // Parse and validate request body
  let body: ResearchRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", "INVALID_JSON", 400);
  }

  const topic = (body.topic || "").trim();

  if (!topic) {
    return errorResponse("Topic is required.", "MISSING_TOPIC", 400);
  }

  if (topic.length < 2) {
    return errorResponse(
      "Topic must be at least 2 characters.",
      "TOPIC_TOO_SHORT",
      400
    );
  }

  if (topic.length > 500) {
    return errorResponse(
      "Topic must be under 500 characters.",
      "TOPIC_TOO_LONG",
      400
    );
  }

  try {
    // Step 1: Web search
    const searchResults = await searchWeb(topic);

    if (searchResults.length === 0) {
      return NextResponse.json({
        topic,
        summary: "No search results found for this topic.",
        keyFindings: ["No results were returned by the search provider."],
        sources: [],
        timeline: [],
        conflicts: [],
        opportunities: [],
        finalVerdict: "No reliable sources found. Try a different search query.",
        confidence: "low",
      });
    }

    // Step 2: Extract article content (parallel, up to 8 URLs)
    const urlsToFetch = searchResults.slice(0, 8).map((r) => r.url);
    const extractedContent = await extractMultiple(urlsToFetch, 4);

    // Step 3: Merge search snippets with extracted text
    const articleInputs = mergeSearchWithExtracted(
      searchResults.slice(0, 8),
      extractedContent
    );

    // Step 4: AI analysis of individual articles
    const analyzedSources = await analyzeArticles(articleInputs);

    // Filter out very low relevance sources (score 1-2) before report generation
    const relevantSources = analyzedSources.filter(
      (s) => s.relevanceScore >= 3
    );

    // Step 5: Generate final report
    const report = await generateReport(topic, relevantSources);

    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/research] Error:", message);

    // Surface meaningful configuration errors to the client
    if (
      message.includes("API_KEY") ||
      message.includes("No search API") ||
      message.includes("not set")
    ) {
      return errorResponse(
        `Configuration error: ${message}`,
        "CONFIG_ERROR",
        500
      );
    }

    return errorResponse(
      "An unexpected error occurred while researching this topic.",
      "INTERNAL_ERROR",
      500
    );
  }
}
