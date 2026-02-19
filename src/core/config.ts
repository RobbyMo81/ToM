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
  runtimeDbPath: string;
  webCacheDir: string;
  whoiamSync: {
    enabled: boolean;
    schedule: string;
    docPath: string;
    statePath: string;
    watchFiles: string[];
  };
  githubSync: {
    enabled: boolean;
    schedule: string;
    owner: string;
    repo: string;
    apiBaseUrl: string;
    token?: string;
    outputFile: string;
    reindexAfterSync: boolean;
  };
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
  generation: {
    maxContextChars: number;
    maxResponseTokens: number;
    temperature: number;
    systemPrompt: string;
  };
  chunking: {
    maxChars: number;
    overlapChars: number;
  };
  overrideAuth: {
    keyId: string;
    hmacKey?: Buffer;
  };
}

function decodeBase64Key(value: string | undefined): Buffer | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  try {
    const normalized = value.trim();
    const decoded = Buffer.from(normalized, "base64");
    if (decoded.length === 0) {
      return undefined;
    }
    return decoded;
  } catch {
    return undefined;
  }
}

export function getConfig(): AppConfig {
  const cwd = process.cwd();
  const knowledgeDir = path.resolve(cwd, process.env.TOM_KNOWLEDGE_DIR ?? ".");
  const dbPath = path.resolve(cwd, process.env.VECTOR_DB_PATH ?? "memory/tom_brain.sqlite");
  const runtimeDbPath = path.resolve(cwd, process.env.RUNTIME_DB_PATH ?? "memory/tom_runtime.sqlite");
  const webCacheDir = path.resolve(cwd, process.env.WEB_CACHE_DIR ?? "memory/web");
  const githubOutputFile = path.resolve(cwd, process.env.GITHUB_SYNC_OUTPUT_FILE ?? "automation/github-report.md");
  const whoiamDocPath = path.resolve(cwd, process.env.WHOIAM_DOC_PATH ?? ".tom-workspace/whoiam.md");
  const whoiamStatePath = path.resolve(cwd, process.env.WHOIAM_SYNC_STATE_PATH ?? "memory/whoiam-sync-state.json");

  const queryEnv = process.env.WEB_ENRICHMENT_QUERIES ?? "";
  const queries = queryEnv
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const watchFilesEnv =
    process.env.WHOIAM_SYNC_WATCH_FILES ??
    [
      "src/index.ts",
      "src/core/config.ts",
      "src/core/brain.ts",
      "src/integrations/knowledgeLoader.ts",
      "src/integrations/vectorStore.ts",
      "src/api/httpServer.ts",
      "src/jobs/cycleJob.ts",
      "src/jobs/githubSyncJob.ts",
      "src/integrations/githubReportSync.ts",
      "package.json",
      "README.md",
    ].join("|");

  const watchFiles = watchFilesEnv
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    knowledgeDir,
    dbPath,
    runtimeDbPath,
    webCacheDir,
    whoiamSync: {
      enabled: readBoolean(process.env.WHOIAM_SYNC_ENABLED, true),
      schedule: process.env.WHOIAM_SYNC_SCHEDULE ?? "15 */6 * * *",
      docPath: whoiamDocPath,
      statePath: whoiamStatePath,
      watchFiles,
    },
    githubSync: {
      enabled: readBoolean(process.env.GITHUB_SYNC_ENABLED, true),
      schedule: process.env.GITHUB_SYNC_SCHEDULE ?? "0 */4 * * *",
      owner: process.env.GITHUB_SYNC_OWNER ?? "RobbyMo81",
      repo: process.env.GITHUB_SYNC_REPO ?? "ToM",
      apiBaseUrl: process.env.GITHUB_API_BASE_URL ?? "https://api.github.com",
      token: process.env.GITHUB_TOKEN,
      outputFile: githubOutputFile,
      reindexAfterSync: readBoolean(process.env.GITHUB_SYNC_REINDEX, true),
    },
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
    generation: {
      maxContextChars: readNumber(process.env.GENERATE_MAX_CONTEXT_CHARS, 8_000),
      maxResponseTokens: readNumber(process.env.GENERATE_MAX_RESPONSE_TOKENS, 600),
      temperature: readNumber(process.env.GENERATE_TEMPERATURE, 0.2),
      systemPrompt:
        process.env.GENERATE_SYSTEM_PROMPT ??
        "You are ToM Brain. Ground your answer in retrieved context and acknowledge uncertainty when context is missing.",
    },
    chunking: {
      maxChars: readNumber(process.env.CHUNK_MAX_CHARS, 1200),
      overlapChars: readNumber(process.env.CHUNK_OVERLAP_CHARS, 200),
    },
    overrideAuth: {
      keyId: process.env.TOM_OVERRIDE_HMAC_KEY_ID ?? "oxide-local-override-key",
      hmacKey: decodeBase64Key(process.env.TOM_OVERRIDE_HMAC_KEY_B64),
    },
  };
}
