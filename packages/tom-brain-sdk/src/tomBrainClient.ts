import {
  type CycleResponse,
  type GenerateResponse,
  type HealthResponse,
  type IngestResponse,
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
