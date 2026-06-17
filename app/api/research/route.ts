import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { extractArticles } from "@/lib/research/extract";
import { createResearchReport, notEnoughSourcesReport } from "@/lib/research/openai-report";
import { checkRateLimit } from "@/lib/research/rate-limit";
import { getSearchProvider } from "@/lib/research/search-providers";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(2, "Enter a topic with at least 2 characters.")
    .max(220, "Keep the research topic under 220 characters.")
});

function clientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  return forwardedFor || realIp || "anonymous";
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(clientKey(request));

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many research requests. Please wait before starting another report.",
        resetAt: new Date(rateLimit.resetAt).toISOString()
      },
      { status: 429 }
    );
  }

  let payload: z.infer<typeof requestSchema>;

  try {
    payload = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message ?? "Invalid research topic.", 400);
    }

    return errorResponse("Request body must be valid JSON.", 400);
  }

  try {
    const provider = getSearchProvider();
    const searchResults = await provider.search(payload.topic, 10);

    if (searchResults.length === 0) {
      return NextResponse.json(
        notEnoughSourcesReport(payload.topic, "The search provider returned no relevant web results.")
      );
    }

    const articles = await extractArticles(searchResults, 10);

    if (articles.length === 0) {
      return NextResponse.json(
        notEnoughSourcesReport(
          payload.topic,
          "Search results were found, but none produced enough readable article text to verify the topic."
        )
      );
    }

    const report = await createResearchReport(payload.topic, articles);

    return NextResponse.json(report, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-Search-Provider": provider.name
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected research failure.";
    const isConfigurationError =
      message.includes("API_KEY") || message.includes("SEARCH_PROVIDER") || message.includes("configured");

    return errorResponse(
      isConfigurationError
        ? message
        : "The research agent could not complete this request. Please try a narrower topic or different source provider.",
      isConfigurationError ? 500 : 502
    );
  }
}
