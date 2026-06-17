// Core data types for the research agent

export interface Source {
  title: string;
  url: string;
  source: string;
  author: string;
  publishedDate: string;
  summary: string;
  mainClaims: string[];
  keyQuotes: string[];
  relevanceScore: number;
  rawContent?: string;
}

export interface TimelineEvent {
  date: string;
  event: string;
  source: string;
}

export interface Conflict {
  claim: string;
  perspectives: Array<{ source: string; position: string }>;
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ResearchReport {
  topic: string;
  summary: string;
  keyFindings: string[];
  sources: Source[];
  timeline: TimelineEvent[];
  conflicts: Conflict[];
  opportunities: string[];
  finalVerdict: string;
  confidence: ConfidenceLevel;
}

export interface ResearchRequest {
  topic: string;
}

export interface ResearchError {
  error: string;
  code: string;
}

// Search provider types — add new providers here to extend
export type SearchProvider = "tavily" | "brave" | "serp" | "exa";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

export interface AgentStatus {
  step: string;
  detail?: string;
}
