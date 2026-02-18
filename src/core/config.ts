import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv();

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface AppConfig {
  knowledgeDir: string;
  dbPath: string;
  webCacheDir: string;
  api: {
    enabled: boolean;
    host: string;
    port: number;
    token?: string;
  };
  ollama: {
    baseUrl: string;
    embedModel: string;
    chatModel: string;
  };
  braveApiKey?: string;
  cronSchedule: string;
  webEnrichment: {
    enabled: boolean;
    queries: string[];
    topK: number;
  };
  retrieval: {
    defaultTopK: number;
  };
  chunking: {
    maxChars: number;
    overlapChars: number;
  };
}

export function getConfig(): AppConfig {
  const cwd = process.cwd();
  const knowledgeDir = path.resolve(cwd, process.env.TOM_KNOWLEDGE_DIR ?? ".");
  const dbPath = path.resolve(cwd, process.env.VECTOR_DB_PATH ?? "memory/tom_brain.sqlite");
  const webCacheDir = path.resolve(cwd, process.env.WEB_CACHE_DIR ?? "memory/web");

  const queryEnv = process.env.WEB_ENRICHMENT_QUERIES ?? "";
  const queries = queryEnv
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    knowledgeDir,
    dbPath,
    webCacheDir,
    api: {
      enabled: readBoolean(process.env.TOM_API_ENABLED, true),
      host: process.env.TOM_API_HOST ?? "127.0.0.1",
      port: readNumber(process.env.TOM_API_PORT, 8787),
      token: process.env.TOM_API_TOKEN,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
      embedModel: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
      chatModel: process.env.OLLAMA_CHAT_MODEL ?? "llama3.1:8b",
    },
    braveApiKey: process.env.BRAVE_API_KEY,
    cronSchedule: process.env.TOM_CRON_SCHEDULE ?? "0 */6 * * *",
    webEnrichment: {
      enabled: readBoolean(process.env.WEB_ENRICHMENT_ENABLED, true),
      queries,
      topK: readNumber(process.env.WEB_ENRICHMENT_TOP_K, 5),
    },
    retrieval: {
      defaultTopK: readNumber(process.env.SEARCH_DEFAULT_TOP_K, 8),
    },
    chunking: {
      maxChars: readNumber(process.env.CHUNK_MAX_CHARS, 1200),
      overlapChars: readNumber(process.env.CHUNK_OVERLAP_CHARS, 200),
    },
  };
}
