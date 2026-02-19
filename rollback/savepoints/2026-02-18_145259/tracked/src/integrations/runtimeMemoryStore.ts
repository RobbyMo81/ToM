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

export interface WorkflowRunInput {
  workflowName: string;
  triggerSource: "cron" | "manual" | "api" | "agent";
  initiatedBy: string;
  context?: Record<string, unknown>;
}

export interface WorkflowStepInput {
  workflowRunId: string;
  stepName: string;
  details?: Record<string, unknown>;
}

export interface TaskEventInput {
  workflowRunId?: string;
  stepId?: string;
  eventType: "info" | "warn" | "error" | "policy" | "approval";
  eventLevel: "low" | "medium" | "high" | "critical";
  message: string;
  payload?: Record<string, unknown>;
}

export interface LearnedSkillInput {
  skillKey: string;
  description: string;
  sourceType: "conversation" | "doc" | "external";
  sourceRef?: string;
  confidence: number;
  learnedAt?: string;
  state?: "active" | "deprecated";
  metadata?: Record<string, unknown>;
}

export interface SkillToLogicProposalInput {
  skillId: string;
  proposedBy: string;
  proposalType: "code_patch" | "config_change" | "policy_change";
  proposal: Record<string, unknown>;
  determinismScore?: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "drafted" | "validated" | "rejected" | "approved" | "promoted";
}

export interface ValidationResultInput {
  proposalId: string;
  validator: string;
  buildPass: boolean;
  lintPass: boolean;
  testPass: boolean;
  policyPass: boolean;
  details?: Record<string, unknown>;
}

export interface ApprovalInput {
  proposalId: string;
  approver: string;
  approvalType: "policy" | "human" | "security" | "ops";
  decision: "approved" | "rejected";
  notes?: string;
}

export interface DeployOutcomeInput {
  proposalId: string;
  deploymentTarget: string;
  deploymentId?: string;
  status: "succeeded" | "failed" | "rolled_back";
  summary?: string;
  metrics?: Record<string, unknown>;
}

export interface LineageSummaryResponse {
  timestamp: string;
  run: {
    id: string;
    workflowName: string;
    triggerSource: string;
    initiatedBy: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  skill: {
    id: string;
    skillKey: string;
    description: string;
    confidence: number;
    learnedAt: string;
  } | null;
  proposal: {
    id: string;
    skillId: string;
    proposedBy: string;
    proposalType: string;
    riskLevel: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  validation: {
    id: string;
    proposalId: string;
    validator: string;
    buildPass: boolean;
    lintPass: boolean;
    testPass: boolean;
    policyPass: boolean;
    validatedAt: string;
  } | null;
  approval: {
    id: string;
    proposalId: string;
    approver: string;
    approvalType: string;
    decision: string;
    decidedAt: string;
  } | null;
  deploy: {
    id: string;
    proposalId: string;
    deploymentTarget: string;
    deploymentId: string | null;
    status: string;
    deployedAt: string;
  } | null;
  event: {
    id: string;
    eventType: string;
    eventLevel: string;
    message: string;
    createdAt: string;
  } | null;
}

export interface LineageRunHistoryItem {
  id: string;
  workflowName: string;
  triggerSource: string;
  initiatedBy: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  documentsIndexed: number | null;
  webDocumentsIndexed: number | null;
  proposalId: string | null;
  proposalStatus: string | null;
  deployStatus: string | null;
}

export interface LineageRunsResponse {
  timestamp: string;
  limit: number;
  count: number;
  page: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  filters: {
    order: "asc" | "desc";
    cursor: string | null;
    status: string | null;
    triggerSource: string | null;
    startedAfter: string | null;
    startedBefore: string | null;
  };
  runs: LineageRunHistoryItem[];
}

export interface LineageRunsFilter {
  order?: string;
  cursor?: string;
  status?: string;
  triggerSource?: string;
  startedAfter?: string;
  startedBefore?: string;
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

  startWorkflowRun(input: WorkflowRunInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO workflow_runs (id, workflow_name, trigger_source, initiated_by, status, started_at, context_json)
      VALUES (@id, @workflowName, @triggerSource, @initiatedBy, 'running', @startedAt, @contextJson)
    `);

    stmt.run({
      id,
      workflowName: input.workflowName,
      triggerSource: input.triggerSource,
      initiatedBy: input.initiatedBy,
      startedAt: now,
      contextJson: JSON.stringify(input.context ?? {}),
    });

    return id;
  }

  endWorkflowRun(
    workflowRunId: string,
    status: "succeeded" | "failed" | "aborted",
    context?: Record<string, unknown>
  ): void {
    const stmt = this.db.prepare(`
      UPDATE workflow_runs
      SET finished_at = @finishedAt, status = @status, context_json = @contextJson
      WHERE id = @workflowRunId
    `);

    stmt.run({
      finishedAt: new Date().toISOString(),
      status,
      contextJson: JSON.stringify(context ?? {}),
      workflowRunId,
    });
  }

  startWorkflowStep(input: WorkflowStepInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stepIndex = this.getNextWorkflowStepIndex(input.workflowRunId);
    const stmt = this.db.prepare(`
      INSERT INTO workflow_steps (id, workflow_run_id, step_index, step_name, status, started_at, details_json)
      VALUES (@id, @workflowRunId, @stepIndex, @stepName, 'running', @startedAt, @detailsJson)
    `);

    stmt.run({
      id,
      workflowRunId: input.workflowRunId,
      stepIndex,
      stepName: input.stepName,
      startedAt: now,
      detailsJson: JSON.stringify(input.details ?? {}),
    });

    return id;
  }

  endWorkflowStep(stepId: string, status: "succeeded" | "failed" | "aborted", details?: Record<string, unknown>): void {
    const stmt = this.db.prepare(`
      UPDATE workflow_steps
      SET finished_at = @finishedAt, status = @status, details_json = @detailsJson
      WHERE id = @stepId
    `);

    stmt.run({
      finishedAt: new Date().toISOString(),
      status,
      detailsJson: JSON.stringify(details ?? {}),
      stepId,
    });
  }

  appendTaskEvent(input: TaskEventInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO task_events (id, workflow_run_id, step_id, event_type, event_level, message, payload_json, created_at)
      VALUES (@id, @workflowRunId, @stepId, @eventType, @eventLevel, @message, @payloadJson, @createdAt)
    `);

    stmt.run({
      id,
      workflowRunId: input.workflowRunId ?? null,
      stepId: input.stepId ?? null,
      eventType: input.eventType,
      eventLevel: input.eventLevel,
      message: input.message,
      payloadJson: JSON.stringify(input.payload ?? {}),
      createdAt: now,
    });

    return id;
  }

  recordLearnedSkill(input: LearnedSkillInput): string {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO skills_learned
        (id, skill_key, description, source_type, source_ref, confidence, learned_at, state, metadata_json)
      VALUES
        (@id, @skillKey, @description, @sourceType, @sourceRef, @confidence, @learnedAt, @state, @metadataJson)
    `);

    stmt.run({
      id,
      skillKey: input.skillKey,
      description: input.description,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef ?? null,
      confidence: input.confidence,
      learnedAt: input.learnedAt ?? new Date().toISOString(),
      state: input.state ?? "active",
      metadataJson: JSON.stringify(input.metadata ?? {}),
    });

    return id;
  }

  createSkillToLogicProposal(input: SkillToLogicProposalInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO skill_to_logic_proposals
        (id, skill_id, proposed_by, proposal_type, proposal_json, determinism_score, risk_level, status, created_at, updated_at)
      VALUES
        (@id, @skillId, @proposedBy, @proposalType, @proposalJson, @determinismScore, @riskLevel, @status, @createdAt, @updatedAt)
    `);

    stmt.run({
      id,
      skillId: input.skillId,
      proposedBy: input.proposedBy,
      proposalType: input.proposalType,
      proposalJson: JSON.stringify(input.proposal),
      determinismScore: input.determinismScore ?? null,
      riskLevel: input.riskLevel,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }

  updateSkillToLogicProposalStatus(
    proposalId: string,
    status: "drafted" | "validated" | "rejected" | "approved" | "promoted"
  ): void {
    const stmt = this.db.prepare(`
      UPDATE skill_to_logic_proposals
      SET status = @status, updated_at = @updatedAt
      WHERE id = @proposalId
    `);

    stmt.run({
      status,
      updatedAt: new Date().toISOString(),
      proposalId,
    });
  }

  recordValidationResult(input: ValidationResultInput): string {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO validation_results
        (id, proposal_id, validator, build_pass, lint_pass, test_pass, policy_pass, details_json, validated_at)
      VALUES
        (@id, @proposalId, @validator, @buildPass, @lintPass, @testPass, @policyPass, @detailsJson, @validatedAt)
    `);

    stmt.run({
      id,
      proposalId: input.proposalId,
      validator: input.validator,
      buildPass: input.buildPass ? 1 : 0,
      lintPass: input.lintPass ? 1 : 0,
      testPass: input.testPass ? 1 : 0,
      policyPass: input.policyPass ? 1 : 0,
      detailsJson: JSON.stringify(input.details ?? {}),
      validatedAt: new Date().toISOString(),
    });

    return id;
  }

  recordApproval(input: ApprovalInput): string {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO approvals (id, proposal_id, approver, approval_type, decision, notes, decided_at)
      VALUES (@id, @proposalId, @approver, @approvalType, @decision, @notes, @decidedAt)
    `);

    stmt.run({
      id,
      proposalId: input.proposalId,
      approver: input.approver,
      approvalType: input.approvalType,
      decision: input.decision,
      notes: input.notes ?? null,
      decidedAt: new Date().toISOString(),
    });

    return id;
  }

  recordDeployOutcome(input: DeployOutcomeInput): string {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO deploy_outcomes
        (id, proposal_id, deployment_target, deployment_id, status, summary, metrics_json, deployed_at)
      VALUES
        (@id, @proposalId, @deploymentTarget, @deploymentId, @status, @summary, @metricsJson, @deployedAt)
    `);

    stmt.run({
      id,
      proposalId: input.proposalId,
      deploymentTarget: input.deploymentTarget,
      deploymentId: input.deploymentId ?? null,
      status: input.status,
      summary: input.summary ?? null,
      metricsJson: JSON.stringify(input.metrics ?? {}),
      deployedAt: new Date().toISOString(),
    });

    return id;
  }

  getLatestLineageSummary(): LineageSummaryResponse {
    const runRow = this.db
      .prepare(
        `
      SELECT id, workflow_name, trigger_source, initiated_by, status, started_at, finished_at, context_json
      FROM workflow_runs
      ORDER BY started_at DESC
      LIMIT 1
    `
      )
      .get() as
      | {
          id: string;
          workflow_name: string;
          trigger_source: string;
          initiated_by: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          context_json: string;
        }
      | undefined;

    if (!runRow) {
      return {
        timestamp: new Date().toISOString(),
        run: null,
        skill: null,
        proposal: null,
        validation: null,
        approval: null,
        deploy: null,
        event: null,
      };
    }

    const context = this.safeParseJson(runRow.context_json);
    const contextProposalId = typeof context.proposalId === "string" ? context.proposalId : undefined;
    const contextSkillId = typeof context.skillId === "string" ? context.skillId : undefined;

    const proposalRow = (
      contextProposalId
        ? this.db
            .prepare(
              `
      SELECT id, skill_id, proposed_by, proposal_type, risk_level, status, created_at, updated_at
      FROM skill_to_logic_proposals
      WHERE id = ?
      LIMIT 1
    `
            )
            .get(contextProposalId)
        : this.db
            .prepare(
              `
      SELECT id, skill_id, proposed_by, proposal_type, risk_level, status, created_at, updated_at
      FROM skill_to_logic_proposals
      ORDER BY created_at DESC
      LIMIT 1
    `
            )
            .get()
    ) as
      | {
          id: string;
          skill_id: string;
          proposed_by: string;
          proposal_type: string;
          risk_level: string;
          status: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    const skillId = contextSkillId ?? proposalRow?.skill_id;
    const skillRow = (
      skillId
        ? this.db
            .prepare(
              `
      SELECT id, skill_key, description, confidence, learned_at
      FROM skills_learned
      WHERE id = ?
      LIMIT 1
    `
            )
            .get(skillId)
        : undefined
    ) as
      | {
          id: string;
          skill_key: string;
          description: string;
          confidence: number;
          learned_at: string;
        }
      | undefined;

    const validationRow = (
      proposalRow
        ? this.db
            .prepare(
              `
      SELECT id, proposal_id, validator, build_pass, lint_pass, test_pass, policy_pass, validated_at
      FROM validation_results
      WHERE proposal_id = ?
      ORDER BY validated_at DESC
      LIMIT 1
    `
            )
            .get(proposalRow.id)
        : undefined
    ) as
      | {
          id: string;
          proposal_id: string;
          validator: string;
          build_pass: number;
          lint_pass: number;
          test_pass: number;
          policy_pass: number;
          validated_at: string;
        }
      | undefined;

    const approvalRow = (
      proposalRow
        ? this.db
            .prepare(
              `
      SELECT id, proposal_id, approver, approval_type, decision, decided_at
      FROM approvals
      WHERE proposal_id = ?
      ORDER BY decided_at DESC
      LIMIT 1
    `
            )
            .get(proposalRow.id)
        : undefined
    ) as
      | {
          id: string;
          proposal_id: string;
          approver: string;
          approval_type: string;
          decision: string;
          decided_at: string;
        }
      | undefined;

    const deployRow = (
      proposalRow
        ? this.db
            .prepare(
              `
      SELECT id, proposal_id, deployment_target, deployment_id, status, deployed_at
      FROM deploy_outcomes
      WHERE proposal_id = ?
      ORDER BY deployed_at DESC
      LIMIT 1
    `
            )
            .get(proposalRow.id)
        : undefined
    ) as
      | {
          id: string;
          proposal_id: string;
          deployment_target: string;
          deployment_id: string | null;
          status: string;
          deployed_at: string;
        }
      | undefined;

    const eventRow = this.db
      .prepare(
        `
      SELECT id, event_type, event_level, message, created_at
      FROM task_events
      WHERE workflow_run_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `
      )
      .get(runRow.id) as
      | {
          id: string;
          event_type: string;
          event_level: string;
          message: string;
          created_at: string;
        }
      | undefined;

    return {
      timestamp: new Date().toISOString(),
      run: {
        id: runRow.id,
        workflowName: runRow.workflow_name,
        triggerSource: runRow.trigger_source,
        initiatedBy: runRow.initiated_by,
        status: runRow.status,
        startedAt: runRow.started_at,
        finishedAt: runRow.finished_at,
      },
      skill: skillRow
        ? {
            id: skillRow.id,
            skillKey: skillRow.skill_key,
            description: skillRow.description,
            confidence: skillRow.confidence,
            learnedAt: skillRow.learned_at,
          }
        : null,
      proposal: proposalRow
        ? {
            id: proposalRow.id,
            skillId: proposalRow.skill_id,
            proposedBy: proposalRow.proposed_by,
            proposalType: proposalRow.proposal_type,
            riskLevel: proposalRow.risk_level,
            status: proposalRow.status,
            createdAt: proposalRow.created_at,
            updatedAt: proposalRow.updated_at,
          }
        : null,
      validation: validationRow
        ? {
            id: validationRow.id,
            proposalId: validationRow.proposal_id,
            validator: validationRow.validator,
            buildPass: validationRow.build_pass === 1,
            lintPass: validationRow.lint_pass === 1,
            testPass: validationRow.test_pass === 1,
            policyPass: validationRow.policy_pass === 1,
            validatedAt: validationRow.validated_at,
          }
        : null,
      approval: approvalRow
        ? {
            id: approvalRow.id,
            proposalId: approvalRow.proposal_id,
            approver: approvalRow.approver,
            approvalType: approvalRow.approval_type,
            decision: approvalRow.decision,
            decidedAt: approvalRow.decided_at,
          }
        : null,
      deploy: deployRow
        ? {
            id: deployRow.id,
            proposalId: deployRow.proposal_id,
            deploymentTarget: deployRow.deployment_target,
            deploymentId: deployRow.deployment_id,
            status: deployRow.status,
            deployedAt: deployRow.deployed_at,
          }
        : null,
      event: eventRow
        ? {
            id: eventRow.id,
            eventType: eventRow.event_type,
            eventLevel: eventRow.event_level,
            message: eventRow.message,
            createdAt: eventRow.created_at,
          }
        : null,
    };
  }

  getLineageRuns(limit = 20, filters: LineageRunsFilter = {}): LineageRunsResponse {
    const normalizedLimit = this.normalizeLimit(limit);
    const normalizedOrder = this.normalizeOrder(filters.order);
    const cursor = this.decodeCursor(filters.cursor);
    const normalizedStatus = this.normalizeFilterString(filters.status);
    const normalizedTriggerSource = this.normalizeFilterString(filters.triggerSource);
    const normalizedStartedAfter = this.normalizeIsoDateFilter(filters.startedAfter);
    const normalizedStartedBefore = this.normalizeIsoDateFilter(filters.startedBefore);
    const whereClauses: string[] = [];
    const queryParams: Array<number | string> = [];

    if (normalizedStatus) {
      whereClauses.push("lower(status) = ?");
      queryParams.push(normalizedStatus);
    }

    if (normalizedTriggerSource) {
      whereClauses.push("lower(trigger_source) = ?");
      queryParams.push(normalizedTriggerSource);
    }

    if (normalizedStartedAfter) {
      whereClauses.push("started_at >= ?");
      queryParams.push(normalizedStartedAfter);
    }

    if (normalizedStartedBefore) {
      whereClauses.push("started_at <= ?");
      queryParams.push(normalizedStartedBefore);
    }

    if (cursor) {
      if (normalizedOrder === "asc") {
        whereClauses.push("(started_at > ? OR (started_at = ? AND id > ?))");
      } else {
        whereClauses.push("(started_at < ? OR (started_at = ? AND id < ?))");
      }
      queryParams.push(cursor.startedAt, cursor.startedAt, cursor.id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const requestedLimit = normalizedLimit + 1;
    const runRows = this.db
      .prepare(
        `
      SELECT id, workflow_name, trigger_source, initiated_by, status, started_at, finished_at, context_json
      FROM workflow_runs
      ${whereSql}
      ORDER BY started_at ${normalizedOrder.toUpperCase()}
      , id ${normalizedOrder.toUpperCase()}
      LIMIT ?
    `
      )
      .all(...queryParams, requestedLimit) as Array<{
      id: string;
      workflow_name: string;
      trigger_source: string;
      initiated_by: string;
      status: string;
      started_at: string;
      finished_at: string | null;
      context_json: string;
    }>;

    const hasMore = runRows.length > normalizedLimit;
    const pageRows = hasMore ? runRows.slice(0, normalizedLimit) : runRows;
    const nextCursor = hasMore
      ? this.encodeCursor(pageRows[pageRows.length - 1].started_at, pageRows[pageRows.length - 1].id)
      : null;

    const proposalStatusStmt = this.db.prepare("SELECT status FROM skill_to_logic_proposals WHERE id = ? LIMIT 1");
    const deployStatusStmt = this.db.prepare(
      "SELECT status FROM deploy_outcomes WHERE proposal_id = ? ORDER BY deployed_at DESC LIMIT 1"
    );

    const runs: LineageRunHistoryItem[] = pageRows.map((row) => {
      const context = this.safeParseJson(row.context_json);
      const report = this.safeReadRecord(context.report);

      const proposalId = typeof context.proposalId === "string" ? context.proposalId : null;
      const proposalStatus = proposalId
        ? ((proposalStatusStmt.get(proposalId) as { status: string } | undefined)?.status ?? null)
        : null;
      const deployStatus = proposalId
        ? ((deployStatusStmt.get(proposalId) as { status: string } | undefined)?.status ?? null)
        : null;

      return {
        id: row.id,
        workflowName: row.workflow_name,
        triggerSource: row.trigger_source,
        initiatedBy: row.initiated_by,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        documentsIndexed:
          typeof report.documentsIndexed === "number" && Number.isFinite(report.documentsIndexed)
            ? report.documentsIndexed
            : null,
        webDocumentsIndexed:
          typeof report.webDocumentsIndexed === "number" && Number.isFinite(report.webDocumentsIndexed)
            ? report.webDocumentsIndexed
            : null,
        proposalId,
        proposalStatus,
        deployStatus,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      limit: normalizedLimit,
      count: runs.length,
      page: {
        hasMore,
        nextCursor,
      },
      filters: {
        order: normalizedOrder,
        cursor: filters.cursor ?? null,
        status: normalizedStatus,
        triggerSource: normalizedTriggerSource,
        startedAfter: normalizedStartedAfter,
        startedBefore: normalizedStartedBefore,
      },
      runs,
    };
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

  private getNextWorkflowStepIndex(workflowRunId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(step_index), -1) AS max_step FROM workflow_steps WHERE workflow_run_id = ?")
      .get(workflowRunId) as { max_step: number };
    return row.max_step + 1;
  }

  private safeParseJson(value: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private safeReadRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return 20;
    }
    const normalized = Math.floor(limit);
    if (normalized < 1) {
      return 1;
    }
    if (normalized > 200) {
      return 200;
    }
    return normalized;
  }

  private normalizeFilterString(value?: string): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeOrder(value?: string): "asc" | "desc" {
    return typeof value === "string" && value.trim().toLowerCase() === "asc" ? "asc" : "desc";
  }

  private decodeCursor(value?: string): { startedAt: string; id: string } | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const [startedAtRaw, idRaw] = trimmed.split("|", 2);
    if (!startedAtRaw || !idRaw) {
      return null;
    }

    const startedAt = this.normalizeIsoDateFilter(startedAtRaw);
    if (!startedAt) {
      return null;
    }

    const id = idRaw.trim();
    if (id.length === 0) {
      return null;
    }

    return { startedAt, id };
  }

  private encodeCursor(startedAt: string, id: string): string {
    return `${startedAt}|${id}`;
  }

  private normalizeIsoDateFilter(value?: string): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
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
