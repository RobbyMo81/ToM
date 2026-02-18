import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { getConfig } from "../core/config";
import { logger } from "../core/logger";
import { ToMBrain } from "../core/brain";

interface QueryBody {
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
        try {
          const topK = typeof body.topK === "number" ? body.topK : undefined;
          const results = await brain.query(question, topK);
          sendJson(response, 200, {
            question,
            count: results.length,
            results,
          });
        } finally {
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
          const report = await brain.runCycle();
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
