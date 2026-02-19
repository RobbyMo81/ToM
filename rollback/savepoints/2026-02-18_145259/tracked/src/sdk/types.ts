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

export interface GenerateResponse {
  question: string;
  answer: string;
  model: string;
  contextCount: number;
  contexts: ApiSearchResult[];
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

export interface LineageRunSummary {
  id: string;
  workflowName: string;
  triggerSource: string;
  initiatedBy: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface LineageSkillSummary {
  id: string;
  skillKey: string;
  description: string;
  confidence: number;
  learnedAt: string;
}

export interface LineageProposalSummary {
  id: string;
  skillId: string;
  proposedBy: string;
  proposalType: string;
  riskLevel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineageValidationSummary {
  id: string;
  proposalId: string;
  validator: string;
  buildPass: boolean;
  lintPass: boolean;
  testPass: boolean;
  policyPass: boolean;
  validatedAt: string;
}

export interface LineageApprovalSummary {
  id: string;
  proposalId: string;
  approver: string;
  approvalType: string;
  decision: string;
  decidedAt: string;
}

export interface LineageDeploySummary {
  id: string;
  proposalId: string;
  deploymentTarget: string;
  deploymentId: string | null;
  status: string;
  deployedAt: string;
}

export interface LineageEventSummary {
  id: string;
  eventType: string;
  eventLevel: string;
  message: string;
  createdAt: string;
}

export interface LineageLatestResponse {
  timestamp: string;
  run: LineageRunSummary | null;
  skill: LineageSkillSummary | null;
  proposal: LineageProposalSummary | null;
  validation: LineageValidationSummary | null;
  approval: LineageApprovalSummary | null;
  deploy: LineageDeploySummary | null;
  event: LineageEventSummary | null;
}

export interface LineageRunHistoryItem {
  id: string;
  workflowName: string;
  triggerSource: string;
  initiatedBy: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  documentsIndexed: number | null;
  webDocumentsIndexed: number | null;
  proposalId: string | null;
  proposalStatus: string | null;
  deployStatus: string | null;
}

export interface LineageRunsResponse {
  timestamp: string;
  limit: number;
  count: number;
  page: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  filters: {
    order: "asc" | "desc";
    cursor: string | null;
    status: string | null;
    triggerSource: string | null;
    startedAfter: string | null;
    startedBefore: string | null;
  };
  runs: LineageRunHistoryItem[];
}

export interface LineageRunsQueryOptions {
  limit?: number;
  order?: "asc" | "desc";
  cursor?: string;
  status?: string;
  triggerSource?: string;
  startedAfter?: string;
  startedBefore?: string;
}

export interface ToMClientOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}
