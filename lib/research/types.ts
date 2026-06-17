export type ConfidenceLevel = "low" | "medium" | "high";

export type SearchProviderName = "tavily" | "brave" | "serpapi" | "exa";

export type SearchResult = {
  title: string;
  url: string;
  source?: string;
  snippet?: string;
  author?: string;
  publishedDate?: string;
  score?: number;
};

export type ExtractedArticle = {
  title: string;
  url: string;
  source: string;
  author?: string;
  publishedDate?: string;
  text: string;
  excerpt: string;
  searchSnippet?: string;
  searchScore?: number;
  qualityScore: number;
};

export type ResearchSource = {
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
};

export type ResearchReport = {
  topic: string;
  summary: string;
  keyFindings: string[];
  sources: ResearchSource[];
  timeline: string[];
  conflicts: string[];
  opportunities: string[];
  finalVerdict: string;
  confidence: ConfidenceLevel;
};
