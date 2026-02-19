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

export class OverrideReplayLedger {
  private readonly filePath: string;
  private readonly seen = new Set<string>();
  private loaded = false;

  constructor(filePath = path.resolve(process.cwd(), ".tom-workspace", "governance", "override_replay.jsonl")) {
    this.filePath = filePath;
  }

  hasSeen(overrideId: string, nonce: string): boolean {
    this.loadIfNeeded();
    return this.seen.has(buildReplayKey(overrideId, nonce));
  }

  markSeen(overrideId: string, nonce: string, tokenHash: string, acceptedAt: string): void {
    this.loadIfNeeded();
    const key = buildReplayKey(overrideId, nonce);
    if (this.seen.has(key)) {
      return;
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
