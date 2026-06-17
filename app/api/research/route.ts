import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractArticles } from "@/lib/research/article-extractor";
import { buildResearchReport, getNotEnoughSourcesReport } from "@/lib/research/report-builder";
import { searchWeb } from "@/lib/research/search-providers";

export const runtime = "nodejs";

const requestSchema = z.object({
  topic: z.string().transform((value) => value.trim()).pipe(
    z.string().min(2, "Topic is too short.").max(240, "Topic is too long.")
  ),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const requestBuckets = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = requestBuckets.get(clientId) ?? [];
  const recentTimestamps = timestamps.filter((value) => value > windowStart);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestBuckets.set(clientId, recentTimestamps);
    return true;
  }

  recentTimestamps.push(now);
  requestBuckets.set(clientId, recentTimestamps);
  return false;
}

function asPublicError(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message.includes("API_KEY")) {
      return "Server is missing required API key configuration.";
    }
    return error.message;
  }
  return "Unexpected server error.";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again in a minute." },
      { status: 429 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.topic?.[0] ?? "Invalid topic input." },
      { status: 400 }
    );
  }

  const topic = parsed.data.topic;

  try {
    const searchResults = await searchWeb(topic, 14);

    if (searchResults.length === 0) {
      return NextResponse.json(getNotEnoughSourcesReport(topic));
    }

    const extracted = await extractArticles(searchResults, 8);
    const qualitySources = extracted.filter((item) => item.qualityScore >= 3);

    if (qualitySources.length < 2) {
      return NextResponse.json(getNotEnoughSourcesReport(topic));
    }

    const report = await buildResearchReport(topic, qualitySources);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: asPublicError(error) }, { status: 500 });
  }
}
