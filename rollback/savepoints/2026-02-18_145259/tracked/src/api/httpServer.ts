import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { getConfig } from "../core/config";
import { logger } from "../core/logger";
import { ToMBrain } from "../core/brain";
import { RuntimeMemoryStore } from "../integrations/runtimeMemoryStore";

interface QueryBody {
  question?: string;
  topK?: number;
}

interface GenerateBody {
  question?: string;
  topK?: number;
}

function setJsonHeaders(response: ServerResponse): void {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  setJsonHeaders(response);
  response.end(JSON.stringify(payload));
}

async function parseJsonBody<T>(request: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) => {
      const value = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      chunks.push(value);
      const totalSize = chunks.reduce((sum, part) => sum + part.byteLength, 0);
      if (totalSize > 1_000_000) {
        reject(new Error("Payload too large."));
      }
    });
    request.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8").trim();
        if (!text) {
          resolve({} as T);
          return;
        }
        resolve(JSON.parse(text) as T);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function isAuthorized(request: IncomingMessage, expectedToken?: string): boolean {
  if (!expectedToken) {
    return true;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token === expectedToken;
}

export function startHttpApi(): void {
  const config = getConfig();

  if (!config.api.enabled) {
    logger.info("HTTP API is disabled via TOM_API_ENABLED=false.");
    return;
  }

  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", `http://${config.api.host}:${config.api.port}`);

    if (method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (!isAuthorized(request, config.api.token)) {
      sendJson(response, 401, {
        error: "Unauthorized",
        message: "Missing or invalid bearer token.",
      });
      return;
    }

    try {
      if (method === "GET" && requestUrl.pathname === "/health") {
        sendJson(response, 200, {
          status: "ok",
          service: "tom-brain-api",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (method === "GET" && requestUrl.pathname === "/stats") {
        const brain = new ToMBrain();
        try {
          sendJson(response, 200, {
            vectors: brain.getVectorCount(),
            timestamp: new Date().toISOString(),
          });
        } finally {
          brain.shutdown();
        }
        return;
      }

      if (method === "GET" && requestUrl.pathname === "/lineage/latest") {
        const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath);
        runtimeStore.bootstrap();
        try {
          const summary = runtimeStore.getLatestLineageSummary();
          sendJson(response, 200, summary);
        } finally {
          runtimeStore.close();
        }
        return;
      }

      if (method === "GET" && requestUrl.pathname === "/lineage/runs") {
        const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? "20");
        const order = requestUrl.searchParams.get("order") ?? undefined;
        const cursor = requestUrl.searchParams.get("cursor") ?? undefined;
        const status = requestUrl.searchParams.get("status") ?? undefined;
        const triggerSource = requestUrl.searchParams.get("triggerSource") ?? undefined;
        const startedAfter = requestUrl.searchParams.get("startedAfter") ?? undefined;
        const startedBefore = requestUrl.searchParams.get("startedBefore") ?? undefined;

        const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath);
        runtimeStore.bootstrap();
        try {
          const summary = runtimeStore.getLineageRuns(requestedLimit, {
            order,
            cursor,
            status,
            triggerSource,
            startedAfter,
            startedBefore,
          });
          sendJson(response, 200, summary);
        } finally {
          runtimeStore.close();
        }
        return;
      }

      if (method === "POST" && requestUrl.pathname === "/query") {
        const body = await parseJsonBody<QueryBody>(request);
        const question = body.question?.trim();

        if (!question) {
          sendJson(response, 400, {
            error: "Invalid request",
            message: "Body must include 'question'.",
          });
          return;
        }

        const brain = new ToMBrain();
        const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath);
        runtimeStore.bootstrap();
        const topK = typeof body.topK === "number" ? body.topK : undefined;
        const sessionId = runtimeStore.startSession({
          actor: "api",
          channel: "query",
          metadata: {
            route: requestUrl.pathname,
            method,
            remoteAddress: request.socket.remoteAddress ?? null,
            topK: topK ?? config.retrieval.defaultTopK,
          },
        });

        try {
          runtimeStore.appendConversationTurn({
            sessionId,
            role: "user",
            content: question,
          });

          const results = await brain.query(question, topK);

          const summary = [
            `Query returned ${results.length} result(s).`,
            ...results
              .slice(0, 5)
              .map((result, index) => `${index + 1}. ${result.path} (score=${result.score.toFixed(4)})`),
          ].join("\n");

          runtimeStore.appendConversationTurn({
            sessionId,
            role: "assistant",
            content: summary,
            metadata: {
              resultCount: results.length,
              topPaths: results.slice(0, 10).map((result) => result.path),
            },
          });
          runtimeStore.endSession(sessionId, "completed");

          sendJson(response, 200, {
            question,
            count: results.length,
            results,
          });
        } catch (error) {
          runtimeStore.appendConversationTurn({
            sessionId,
            role: "assistant",
            content: error instanceof Error ? error.message : "Unknown query error",
            metadata: { error: true },
          });
          runtimeStore.endSession(sessionId, "failed");
          throw error;
        } finally {
          runtimeStore.close();
          brain.shutdown();
        }
        return;
      }

      if (method === "POST" && requestUrl.pathname === "/generate") {
        const body = await parseJsonBody<GenerateBody>(request);
        const question = body.question?.trim();

        if (!question) {
          sendJson(response, 400, {
            error: "Invalid request",
            message: "Body must include 'question'.",
          });
          return;
        }

        const brain = new ToMBrain();
        const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath);
        runtimeStore.bootstrap();
        const topK = typeof body.topK === "number" ? body.topK : undefined;
        const sessionId = runtimeStore.startSession({
          actor: "api",
          channel: "generate",
          metadata: {
            route: requestUrl.pathname,
            method,
            remoteAddress: request.socket.remoteAddress ?? null,
            topK: topK ?? config.retrieval.defaultTopK,
            model: config.ollama.chatModel,
          },
        });

        try {
          runtimeStore.appendConversationTurn({
            sessionId,
            role: "user",
            content: question,
          });

          const result = await brain.generate(question, topK);

          runtimeStore.appendConversationTurn({
            sessionId,
            role: "assistant",
            content: result.answer,
            metadata: {
              model: result.model,
              contextCount: result.contextCount,
              topPaths: result.contexts.map((context) => context.path),
            },
          });
          runtimeStore.endSession(sessionId, "completed");

          sendJson(response, 200, result);
        } catch (error) {
          runtimeStore.appendConversationTurn({
            sessionId,
            role: "assistant",
            content: error instanceof Error ? error.message : "Unknown generation error",
            metadata: { error: true },
          });
          runtimeStore.endSession(sessionId, "failed");
          throw error;
        } finally {
          runtimeStore.close();
          brain.shutdown();
        }
        return;
      }

      if (method === "POST" && requestUrl.pathname === "/ingest") {
        const brain = new ToMBrain();
        try {
          const report = await brain.ingestLocalKnowledge();
          sendJson(response, 200, {
            action: "ingest",
            report,
          });
        } finally {
          brain.shutdown();
        }
        return;
      }

      if (method === "POST" && requestUrl.pathname === "/cycle") {
        const brain = new ToMBrain();
        try {
          const report = await brain.runCycle({
            triggerSource: "api",
            initiatedBy: "api",
          });
          sendJson(response, 200, {
            action: "cycle",
            report,
          });
        } finally {
          brain.shutdown();
        }
        return;
      }

      sendJson(response, 404, {
        error: "Not found",
        message: `${method} ${requestUrl.pathname} is not defined.`,
      });
    } catch (error) {
      logger.error("API request failed", error);
      sendJson(response, 500, {
        error: "Internal error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  server.listen(config.api.port, config.api.host, () => {
    logger.info(`ToM API listening on http://${config.api.host}:${config.api.port}`);
  });
}
