export interface Source {
  title: string;
  url: string;
  source: string;
  author: string;
  publishedDate: string;
  summary: string;
  mainClaims: string[];
  relevanceScore: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  source?: string;
}

export interface ResearchReport {
  topic: string;
  summary: string;
  keyFindings: string[];
  sources: Source[];
  timeline: TimelineEvent[];
  conflicts: string[];
  opportunities: string[];
  finalVerdict: string;
  confidence: "low" | "medium" | "high";
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedDate?: string;
}

export interface ExtractedContent {
  url: string;
  title: string;
  text: string;
  author?: string;
  publishedDate?: string;
  source: string;
}

export interface ResearchRequest {
  topic: string;
  maxSources?: number;
  searchProvider?: "tavily" | "brave" | "serpapi" | "exa";
}

export interface ResearchError {
  error: string;
  message: string;
}
