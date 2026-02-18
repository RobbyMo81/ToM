import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface RuntimeSessionInput {
  actor: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeTurnInput {
  sessionId: string;
  role: "system" | "user" | "assistant" | "tool" | "agent";
  content: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ProfileInput {
  profileName: string;
  version: number;
  state: Record<string, unknown>;
  createdBy: string;
  rationale?: string;
  sourceRef?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export class RuntimeMemoryStore {
  private readonly db: Database.Database;

  constructor(
    private readonly dbPath: string,
    private readonly migrationPath = path.resolve(process.cwd(), "sql/001_runtime_memory_v1.sql")
  ) {
    mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
  }

  bootstrap(): void {
    const schemaSql = this.loadMigrationSql();
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec(schemaSql);
  }

  startSession(input: RuntimeSessionInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, actor, channel, started_at, status, metadata_json)
      VALUES (@id, @actor, @channel, @startedAt, 'active', @metadataJson)
    `);

    stmt.run({
      id,
      actor: input.actor,
      channel: input.channel ?? null,
      startedAt: now,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    });

    return id;
  }

  appendConversationTurn(input: RuntimeTurnInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const turnIndex = this.getNextTurnIndex(input.sessionId);

    const stmt = this.db.prepare(`
      INSERT INTO conversation_turns (id, session_id, turn_index, role, content, token_count, created_at, metadata_json)
      VALUES (@id, @sessionId, @turnIndex, @role, @content, @tokenCount, @createdAt, @metadataJson)
    `);

    stmt.run({
      id,
      sessionId: input.sessionId,
      turnIndex,
      role: input.role,
      content: input.content,
      tokenCount: input.tokenCount ?? null,
      createdAt: now,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    });

    return id;
  }

  endSession(sessionId: string, status: "completed" | "aborted" | "failed" = "completed"): void {
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET ended_at = @endedAt, status = @status
      WHERE id = @sessionId
    `);

    stmt.run({
      endedAt: new Date().toISOString(),
      status,
      sessionId,
    });
  }

  upsertBehaviorProfile(input: ProfileInput): string {
    return this.upsertProfile("behavior_profiles", "behavior_json", input);
  }

  upsertPersonalityProfile(input: ProfileInput): string {
    return this.upsertProfile("personality_profiles", "personality_json", input);
  }

  close(): void {
    this.db.close();
  }

  private loadMigrationSql(): string {
    if (!existsSync(this.migrationPath)) {
      throw new Error(`Runtime memory migration not found at ${this.migrationPath}`);
    }
    return readFileSync(this.migrationPath, "utf8");
  }

  private getNextTurnIndex(sessionId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(turn_index), -1) AS max_turn FROM conversation_turns WHERE session_id = ?")
      .get(sessionId) as { max_turn: number };
    return row.max_turn + 1;
  }

  private upsertProfile(
    tableName: "behavior_profiles" | "personality_profiles",
    columnName: string,
    input: ProfileInput
  ): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO ${tableName}
        (id, profile_name, version, ${columnName}, rationale, source_ref, effective_from, effective_to, created_at, created_by)
      VALUES
        (@id, @profileName, @version, @stateJson, @rationale, @sourceRef, @effectiveFrom, @effectiveTo, @createdAt, @createdBy)
      ON CONFLICT(profile_name, version) DO UPDATE SET
        ${columnName} = excluded.${columnName},
        rationale = excluded.rationale,
        source_ref = excluded.source_ref,
        effective_from = excluded.effective_from,
        effective_to = excluded.effective_to,
        created_at = excluded.created_at,
        created_by = excluded.created_by
    `);

    stmt.run({
      id,
      profileName: input.profileName,
      version: input.version,
      stateJson: JSON.stringify(input.state),
      rationale: input.rationale ?? null,
      sourceRef: input.sourceRef ?? null,
      effectiveFrom: input.effectiveFrom ?? now,
      effectiveTo: input.effectiveTo ?? null,
      createdAt: now,
      createdBy: input.createdBy,
    });

    return id;
  }
}
