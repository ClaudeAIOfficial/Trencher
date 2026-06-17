import { ResearchReport } from "@/lib/research/types";

function listOrFallback(items: string[], fallback = "Not enough data."): string {
  if (items.length === 0) {
    return `- ${fallback}`;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

export function toMarkdownReport(report: ResearchReport): string {
  const sourceLines =
    report.sources.length === 0
      ? "- No reliable sources extracted."
      : report.sources
          .map(
            (source, index) =>
              `### ${index + 1}. ${source.title}\n` +
              `- URL: ${source.url}\n` +
              `- Source: ${source.source || "Unknown"}\n` +
              `- Author: ${source.author || "Unknown"}\n` +
              `- Date: ${source.publishedDate || "Unknown"}\n` +
              `- Relevance: ${source.relevanceScore}/10\n` +
              `- Summary: ${source.summary}\n` +
              `- Main Claims:\n${listOrFallback(source.mainClaims, "No claims extracted.")}\n`
              + `- Important Facts:\n${listOrFallback(source.importantFacts, "No important facts extracted.")}\n`
              + `- Key Quotes:\n${listOrFallback(source.keyQuotes, "No key quotes extracted.")}\n`
          )
          .join("\n");

  return [
    `# Research Report: ${report.topic}`,
    "",
    "## Executive Summary",
    report.summary,
    "",
    "## Key Findings",
    listOrFallback(report.keyFindings),
    "",
    "## Source Breakdown",
    sourceLines,
    "",
    "## Timeline",
    listOrFallback(report.timeline, "No timeline signal found."),
    "",
    "## Conflicting Information",
    listOrFallback(report.conflicts, "No direct conflicts detected."),
    "",
    "## Opportunities / Insights",
    listOrFallback(report.opportunities, "No clear opportunity signal."),
    "",
    "## Final Verdict",
    report.finalVerdict,
    "",
    `**Confidence:** ${report.confidence}`,
  ].join("\n");
}
