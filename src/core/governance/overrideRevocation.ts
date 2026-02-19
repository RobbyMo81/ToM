import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface OverrideRevocationRecord {
  override_id: string;
  revoked_at: string;
  revoked_by: string;
  reason: string;
}

function ensureParentDirectory(filePath: string): void {
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

export class OverrideRevocationStore {
  private readonly filePath: string;

  constructor(filePath = path.resolve(process.cwd(), ".tom-workspace", "governance", "override_revocations.jsonl")) {
    this.filePath = filePath;
  }

  isRevoked(overrideId: string): boolean {
    if (!existsSync(this.filePath)) {
      return false;
    }

    const content = readFileSync(this.filePath, "utf8");
    const lines = content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as Partial<OverrideRevocationRecord>;
        if (record.override_id === overrideId) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  revoke(overrideId: string, revokedBy: string, reason: string): OverrideRevocationRecord {
    const now = new Date().toISOString();
    const record: OverrideRevocationRecord = {
      override_id: overrideId,
      revoked_at: now,
      revoked_by: revokedBy,
      reason,
    };

    ensureParentDirectory(this.filePath);
    appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
    return record;
  }
}
