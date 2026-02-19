import {
  type CycleResponse,
  type GenerateResponse,
  type HealthResponse,
  type IngestResponse,
  type LineageLatestResponse,
  type LineageRunsQueryOptions,
  type LineageRunsResponse,
  type QueryResponse,
  type StatsResponse,
  type ToMClientOptions,
} from "./types";

interface QueryPayload {
  question: string;
  topK?: number;
}

export class ToMBrainClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor(options: ToMClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:8787").replace(/\/$/, "");
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  async stats(): Promise<StatsResponse> {
    return this.get<StatsResponse>("/stats");
  }

  async lineageLatest(): Promise<LineageLatestResponse> {
    return this.get<LineageLatestResponse>("/lineage/latest");
  }

  async lineageRuns(options: number | LineageRunsQueryOptions = 20): Promise<LineageRunsResponse> {
    const normalizedOptions: LineageRunsQueryOptions =
      typeof options === "number"
        ? {
            limit: options,
          }
        : options;

    const queryParams = new URLSearchParams();
    if (typeof normalizedOptions.limit === "number") {
      queryParams.set("limit", String(normalizedOptions.limit));
    } else {
      queryParams.set("limit", "20");
    }

    if (normalizedOptions.order === "asc" || normalizedOptions.order === "desc") {
      queryParams.set("order", normalizedOptions.order);
    }

    if (typeof normalizedOptions.cursor === "string" && normalizedOptions.cursor.trim().length > 0) {
      queryParams.set("cursor", normalizedOptions.cursor.trim());
    }

    if (typeof normalizedOptions.status === "string" && normalizedOptions.status.trim().length > 0) {
      queryParams.set("status", normalizedOptions.status.trim());
    }

    if (typeof normalizedOptions.triggerSource === "string" && normalizedOptions.triggerSource.trim().length > 0) {
      queryParams.set("triggerSource", normalizedOptions.triggerSource.trim());
    }

    if (typeof normalizedOptions.startedAfter === "string" && normalizedOptions.startedAfter.trim().length > 0) {
      queryParams.set("startedAfter", normalizedOptions.startedAfter.trim());
    }

    if (typeof normalizedOptions.startedBefore === "string" && normalizedOptions.startedBefore.trim().length > 0) {
      queryParams.set("startedBefore", normalizedOptions.startedBefore.trim());
    }

    const query = queryParams.toString();
    return this.get<LineageRunsResponse>(`/lineage/runs?${query}`);
  }

  async query(question: string, topK?: number): Promise<QueryResponse> {
    const payload: QueryPayload = { question };
    if (typeof topK === "number") {
      payload.topK = topK;
    }
    return this.post<QueryResponse>("/query", payload);
  }

  async generate(question: string, topK?: number): Promise<GenerateResponse> {
    const payload: QueryPayload = { question };
    if (typeof topK === "number") {
      payload.topK = topK;
    }
    return this.post<GenerateResponse>("/generate", payload);
  }

  async ingest(): Promise<IngestResponse> {
    return this.post<IngestResponse>("/ingest", {});
  }

  async cycle(): Promise<CycleResponse> {
    return this.post<CycleResponse>("/cycle", {});
  }

  private async get<TResponse>(path: string): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: "GET",
    });
  }

  private async post<TResponse>(path: string, body: unknown): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = new Headers(init.headers);
      headers.set("Content-Type", "application/json");
      if (this.token) {
        headers.set("Authorization", `Bearer ${this.token}`);
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      const body = text ? (JSON.parse(text) as unknown) : null;

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "message" in body
            ? String((body as { message?: unknown }).message ?? response.statusText)
            : response.statusText;
        throw new Error(`ToM API request failed (${response.status}): ${message}`);
      }

      return body as TResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}
