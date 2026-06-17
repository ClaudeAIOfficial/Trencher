/**
 * POST /api/research
 *
 * Body: { topic: string, maxSources?: number }
 *
 * Returns a structured ResearchReport JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "@/lib/search";
import { extractContent } from "@/lib/extract";
import { generateReport } from "@/lib/ai";
import type { ResearchRequest, ResearchReport, ExtractedContent } from "@/types/research";

// Simple in-memory rate limiter (per-process, resets on cold start)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per IP per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: ResearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const topic = body.topic?.trim() ?? "";
  if (!topic) {
    return NextResponse.json(
      { error: "MISSING_TOPIC", message: "A research topic is required." },
      { status: 400 }
    );
  }
  if (topic.length > 500) {
    return NextResponse.json(
      { error: "TOPIC_TOO_LONG", message: "Topic must be 500 characters or fewer." },
      { status: 400 }
    );
  }

  const maxSources = Math.min(Math.max(body.maxSources ?? 8, 3), 15);

  // 1. Web search
  let searchResults;
  try {
    searchResults = await searchWeb(topic, maxSources + 3); // fetch a few extras to allow filtering
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: "SEARCH_FAILED", message }, { status: 502 });
  }

  if (!searchResults || searchResults.length === 0) {
    const noSourcesReport: ResearchReport = {
      topic,
      summary: "No reliable sources were found for this topic.",
      keyFindings: [],
      sources: [],
      timeline: [],
      conflicts: [],
      opportunities: [],
      finalVerdict: "Not enough reliable sources found to produce a research report.",
      confidence: "low",
    };
    return NextResponse.json(noSourcesReport);
  }

  // 2. Extract article content in parallel (with concurrency limit of 5)
  const extractionJobs = searchResults.slice(0, maxSources + 3);
  const batchSize = 5;
  const extracted: ExtractedContent[] = [];

  for (let i = 0; i < extractionJobs.length; i += batchSize) {
    const batch = extractionJobs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((r) => extractContent(r.url, r.title, r.snippet))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value && result.value.text.length > 80) {
        extracted.push(result.value);
      }
    }
  }

  if (extracted.length === 0) {
    const noContentReport: ResearchReport = {
      topic,
      summary: "Sources were found but content could not be extracted from them.",
      keyFindings: [],
      sources: [],
      timeline: [],
      conflicts: [],
      opportunities: [],
      finalVerdict: "Unable to extract content from available sources. Try a more specific topic.",
      confidence: "low",
    };
    return NextResponse.json(noContentReport);
  }

  // 3. AI report generation
  try {
    const report = await generateReport(topic, extracted.slice(0, maxSources));
    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI processing failed.";
    return NextResponse.json({ error: "AI_FAILED", message }, { status: 502 });
  }
}
