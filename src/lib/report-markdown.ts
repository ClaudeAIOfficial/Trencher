import type { ResearchResponse } from "@/lib/types";

export const toResearchMarkdown = (report: ResearchResponse): string => {
  const sourcesMd = report.sources
    .map((source, index) =>
      [
        `### ${index + 1}. ${source.title}`,
        `- URL: ${source.url}`,
        `- Source: ${source.source}`,
        `- Author: ${source.author || "Unknown"}`,
        `- Published: ${source.publishedDate || "Unknown"}`,
        `- Relevance: ${source.relevanceScore}/10`,
        `- Summary: ${source.summary}`,
        source.mainClaims.length
          ? `- Main Claims: ${source.mainClaims.map((claim) => `"${claim}"`).join("; ")}`
          : "- Main Claims: None extracted"
      ].join("\n")
    )
    .join("\n\n");

  return [
    `# Research Report: ${report.topic}`,
    "",
    "## Executive Summary",
    report.summary || "Not enough reliable sources found.",
    "",
    "## Key Findings",
    ...(report.keyFindings.length ? report.keyFindings.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Source Breakdown",
    sourcesMd || "No reliable sources were extracted.",
    "",
    "## Timeline",
    ...(report.timeline.length ? report.timeline.map((item) => `- ${item}`) : ["- Not enough data."]),
    "",
    "## Conflicting Information",
    ...(report.conflicts.length
      ? report.conflicts.map((item) => `- ${item}`)
      : ["- No major conflicts detected or evidence was limited."]),
    "",
    "## Opportunities / Insights",
    ...(report.opportunities.length
      ? report.opportunities.map((item) => `- ${item}`)
      : ["- Not enough evidence to suggest strong opportunities."]),
    "",
    "## Final Verdict",
    report.finalVerdict || "Not enough reliable sources found.",
    "",
    `Confidence: **${report.confidence}**`
  ].join("\n");
};
