export type ConfidenceLevel = "low" | "medium" | "high";

export type SearchProvider = "tavily" | "serpapi" | "brave" | "exa";

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface ExtractedArticle {
  title: string;
  url: string;
  source: string;
  author: string;
  publishedDate: string;
  text: string;
}

export interface SourceAnalysis {
  url: string;
  summary: string;
  mainClaims: string[];
  importantFacts: string[];
  keyQuotes: string[];
  relevanceScore: number;
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

export interface ResearchResponse {
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
