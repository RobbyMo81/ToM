import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

interface ReplayRecord {
  override_id: string;
  nonce: string;
  token_hash: string;
  accepted_at: string;
}

function buildReplayKey(overrideId: string, nonce: string): string {
  return `${overrideId}::${nonce}`;
}

function ensureParentDirectory(filePath: string): void {
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

// Process-level hot cache shared across all OverrideReplayLedger instances.
// Closes the TOCTOU window between hasSeen (read) and markSeen (write) when
// two concurrent IPC requests arrive with the same token before either has
// persisted to the JSONL ledger.
const HOT_REPLAY_CACHE = new Set<string>();

export class OverrideReplayLedger {
  private readonly filePath: string;
  private readonly seen = new Set<string>();
  private loaded = false;

  constructor(filePath = path.resolve(process.cwd(), ".tom-workspace", "governance", "override_replay.jsonl")) {
    this.filePath = filePath;
  }

  hasSeen(overrideId: string, nonce: string): boolean {
    const key = buildReplayKey(overrideId, nonce);
    if (HOT_REPLAY_CACHE.has(key)) {
      return true;
    }
    this.loadIfNeeded();
    return this.seen.has(key);
  }

  // Returns true if the key was newly recorded, false if it was already seen
  // (either via the hot cache from a concurrent request, or from the JSONL ledger).
  markSeen(overrideId: string, nonce: string, tokenHash: string, acceptedAt: string): boolean {
    const key = buildReplayKey(overrideId, nonce);

    // Synchronous hot-cache claim — no await between has() and add(), so this
    // is atomic within Node.js's single-threaded event loop.
    if (HOT_REPLAY_CACHE.has(key)) {
      return false;
    }
    HOT_REPLAY_CACHE.add(key);

    this.loadIfNeeded();
    if (this.seen.has(key)) {
      return false;
    }

    const record: ReplayRecord = {
      override_id: overrideId,
      nonce,
      token_hash: tokenHash,
      accepted_at: acceptedAt,
    };

    ensureParentDirectory(this.filePath);
    appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
    this.seen.add(key);
    return true;
  }

  private loadIfNeeded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;

    if (!existsSync(this.filePath)) {
      return;
    }

    const content = readFileSync(this.filePath, "utf8");
    const lines = content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Partial<ReplayRecord>;
        if (
          typeof parsed.override_id === "string" &&
          parsed.override_id.length > 0 &&
          typeof parsed.nonce === "string" &&
          parsed.nonce.length > 0
        ) {
          this.seen.add(buildReplayKey(parsed.override_id, parsed.nonce));
        }
      } catch {
        continue;
      }
    }
  }
}
