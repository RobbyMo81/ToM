export type KnowledgeArea = "Learn" | "Lesson" | "Plan" | "Other";

export interface ApiSearchResult {
  chunkId: string;
  documentId: string;
  score: number;
  content: string;
  area: KnowledgeArea;
  sourceType: "local" | "web";
  path: string;
}

export interface QueryResponse {
  question: string;
  count: number;
  results: ApiSearchResult[];
}

export interface IngestResponse {
  action: "ingest";
  report: {
    documentsIndexed: number;
    chunksIndexed: number;
    discovered: number;
  };
}

export interface CycleResponse {
  action: "cycle";
  report: {
    startedAt: string;
    finishedAt: string;
    documentsDiscovered: number;
    documentsIndexed: number;
    chunksIndexed: number;
    webQueriesRun: number;
    webDocumentsIndexed: number;
  };
}

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface StatsResponse {
  vectors: number;
  timestamp: string;
}

export interface ToMClientOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}
