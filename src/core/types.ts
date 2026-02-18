export type KnowledgeArea = "Learn" | "Lesson" | "Plan" | "Other";

export interface KnowledgeDocument {
  id: string;
  area: KnowledgeArea;
  title: string;
  path: string;
  sourceType: "local" | "web";
  content: string;
  checksum: string;
  updatedAt: string;
  tags: string[];
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  area: KnowledgeArea;
  sourceType: "local" | "web";
  path: string;
  chunkIndex: number;
  content: string;
  checksum: string;
  updatedAt: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  score: number;
  content: string;
  area: KnowledgeArea;
  sourceType: "local" | "web";
  path: string;
}

export interface CycleReport {
  startedAt: string;
  finishedAt: string;
  documentsDiscovered: number;
  documentsIndexed: number;
  chunksIndexed: number;
  webQueriesRun: number;
  webDocumentsIndexed: number;
}
