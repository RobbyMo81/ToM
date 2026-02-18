import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { type AppConfig } from "../core/config";
import { sha256 } from "../core/hash";

const AUTO_START = "<!-- WHOIAM_AUTO_SYNC:START -->";
const AUTO_END = "<!-- WHOIAM_AUTO_SYNC:END -->";

interface WhoiamSyncState {
  lastSyncedAt?: string;
  fileHashes: Record<string, string>;
}

export interface WhoiamSyncResult {
  syncedAt: string;
  updated: boolean;
  changedFiles: string[];
  watchedFiles: number;
  docPath: string;
}

function upsertAutoSection(existing: string, autoSection: string): string {
  const startIndex = existing.indexOf(AUTO_START);
  const endIndex = existing.indexOf(AUTO_END);

  const nextBlock = `${AUTO_START}\n${autoSection}\n${AUTO_END}`;

  if (startIndex >= 0 && endIndex > startIndex) {
    const before = existing.slice(0, startIndex).trimEnd();
    const after = existing.slice(endIndex + AUTO_END.length).trimStart();
    return `${before}\n\n${nextBlock}\n\n${after}`.trimEnd() + "\n";
  }

  return `${existing.trimEnd()}\n\n---\n\n${nextBlock}\n`;
}

async function readState(statePath: string): Promise<WhoiamSyncState> {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as WhoiamSyncState;
    return {
      lastSyncedAt: parsed.lastSyncedAt,
      fileHashes: parsed.fileHashes ?? {},
    };
  } catch {
    return {
      fileHashes: {},
    };
  }
}

function extractRegexMatches(content: string, regex: RegExp): string[] {
  const matches: string[] = [];
  for (const match of content.matchAll(regex)) {
    const value = match[1]?.trim();
    if (value) {
      matches.push(value);
    }
  }
  return Array.from(new Set(matches));
}

export async function syncWhoiamDocument(config: AppConfig): Promise<WhoiamSyncResult> {
  const syncedAt = new Date().toISOString();
  const statePath = config.whoiamSync.statePath;
  const docPath = config.whoiamSync.docPath;
  const workspaceRoot = config.knowledgeDir;

  await mkdir(path.dirname(statePath), { recursive: true });
  await mkdir(path.dirname(docPath), { recursive: true });

  const priorState = await readState(statePath);
  const watchedSnapshots: Array<{ file: string; hash: string; exists: boolean; content: string }> = [];

  for (const relativeFile of config.whoiamSync.watchFiles) {
    const absolutePath = path.resolve(workspaceRoot, relativeFile);
    try {
      const content = await readFile(absolutePath, "utf8");
      watchedSnapshots.push({
        file: relativeFile,
        hash: sha256(content),
        exists: true,
        content,
      });
    } catch {
      watchedSnapshots.push({
        file: relativeFile,
        hash: "missing",
        exists: false,
        content: "",
      });
    }
  }

  const currentHashes = Object.fromEntries(watchedSnapshots.map((snapshot) => [snapshot.file, snapshot.hash]));

  const changedFiles = watchedSnapshots
    .filter((snapshot) => priorState.fileHashes[snapshot.file] !== snapshot.hash)
    .map((snapshot) => snapshot.file);

  const startupContent = watchedSnapshots.find((snapshot) => snapshot.file === "src/index.ts")?.content ?? "";
  const apiContent = watchedSnapshots.find((snapshot) => snapshot.file === "src/api/httpServer.ts")?.content ?? "";

  const startupJobs = extractRegexMatches(startupContent, /start([A-Za-z0-9_]+)\(\);/g).map((name) => `start${name}()`);
  const apiEndpoints = extractRegexMatches(apiContent, /pathname === "([^"]+)"/g);

  const autoSection = [
    "## 10) Auto-Sync Architecture Snapshot (Generated)",
    "",
    "This section is auto-maintained by the WhoAmI sync cron.",
    "",
    `- synced_at: ${syncedAt}`,
    `- watched_files: ${watchedSnapshots.length}`,
    `- changed_files: ${changedFiles.length}`,
    "",
    "### Detected Runtime Wiring",
    "",
    `- startup_jobs: ${startupJobs.length > 0 ? startupJobs.join(", ") : "(none detected)"}`,
    `- api_endpoints: ${apiEndpoints.length > 0 ? apiEndpoints.join(", ") : "(none detected)"}`,
    "",
    "### Changed Files Since Last Sync",
    "",
    ...(changedFiles.length > 0 ? changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "### Watched File Hashes",
    "",
    ...watchedSnapshots.map((snapshot) => `- ${snapshot.file}: ${snapshot.hash}`),
    "",
  ].join("\n");

  const existingDoc = await readFile(docPath, "utf8").catch(() => "# whoiam.md\n");
  const nextDoc = upsertAutoSection(existingDoc, autoSection);

  const shouldUpdate = changedFiles.length > 0 || !existingDoc.includes(AUTO_START);
  if (shouldUpdate) {
    await writeFile(docPath, nextDoc, "utf8");
  }

  const nextState: WhoiamSyncState = {
    lastSyncedAt: syncedAt,
    fileHashes: currentHashes,
  };
  await writeFile(statePath, JSON.stringify(nextState, null, 2), "utf8");

  return {
    syncedAt,
    updated: shouldUpdate,
    changedFiles,
    watchedFiles: watchedSnapshots.length,
    docPath,
  };
}
