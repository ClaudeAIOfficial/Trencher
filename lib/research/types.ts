export type ConfidenceLevel = "low" | "medium" | "high";

export type SearchProviderName = "tavily" | "serpapi" | "brave" | "exa";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate: string;
}

export interface ExtractedArticle extends WebSearchResult {
  author: string;
  content: string;
  qualityScore: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  source: string;
  author: string;
  publishedDate: string;
  summary: string;
  mainClaims: string[];
  importantFacts: string[];
  keyQuotes: string[];
  relevanceScore: number;
}

export interface ResearchReport {
  topic: string;
  summary: string;
  keyFindings: string[];
  sources: ResearchSource[];
  timeline: string[];
  conflicts: string[];
  opportunities: string[];
  finalVerdict: string;
  confidence: ConfidenceLevel;
}
