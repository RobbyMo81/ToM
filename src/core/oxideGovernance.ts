import { type CycleReport } from "./types";

export type OxideRiskLevel = "low" | "medium" | "high" | "critical";
export type OxideWorkflowStage = "discover" | "propose" | "validate" | "approve" | "promote";

export const OXIDE_WORKFLOW_STAGES: readonly OxideWorkflowStage[] = [
  "discover",
  "propose",
  "validate",
  "approve",
  "promote",
];

export type OxideAuthority = "tom" | "oxide" | "ci" | "oxide-governance" | "runtime-memory";

export class OxideRolePolicyError extends Error {
  readonly code = "OXIDE_ROLE_POLICY_VIOLATION";

  constructor(
    public readonly roleAgent: "tom" | "oxide",
    public readonly requestedStage: OxideWorkflowStage,
    allowedStages: OxideWorkflowStage[]
  ) {
    super(
      `Role routing policy violation: '${roleAgent}' is not allowed to execute '${requestedStage}'. Allowed stages: ${allowedStages.join(", ")}`
    );
    this.name = "OxideRolePolicyError";
  }
}

export interface OxideRoleContract extends Record<string, unknown> {
  role: "ToM" | "O.X.I.D.E";
  responsibilities: string[];
  cannot: string[];
  allowedStages: OxideWorkflowStage[];
}

export const OXIDE_ROLE_CONTRACTS: Record<"tom" | "oxide", OxideRoleContract> = {
  tom: {
    role: "ToM",
    responsibilities: ["skill discovery", "context synthesis", "governed orchestration"],
    cannot: ["direct promote", "policy override", "unreviewed deployment"],
    allowedStages: ["discover"],
  },
  oxide: {
    role: "O.X.I.D.E",
    responsibilities: ["deterministic proposal synthesis", "policy-aware validation support"],
    cannot: ["executive override", "self-approval", "autonomous deployment"],
    allowedStages: ["propose"],
  },
};

export const OXIDE_STAGE_AUTHORITIES: Record<OxideWorkflowStage, OxideAuthority> = {
  discover: "tom",
  propose: "oxide",
  validate: "ci",
  approve: "oxide-governance",
  promote: "runtime-memory",
};

export function assertRoleCanExecuteStage(roleAgent: "tom" | "oxide", requestedStage: OxideWorkflowStage): void {
  const allowedStages = OXIDE_ROLE_CONTRACTS[roleAgent].allowedStages;
  if (!allowedStages.includes(requestedStage)) {
    throw new OxideRolePolicyError(roleAgent, requestedStage, allowedStages);
  }
}

export interface OxideCycleProposalPayload extends Record<string, unknown> {
  schemaVersion: "1.0";
  workflowRunId: string;
  lifecycle: {
    stages: OxideWorkflowStage[];
    currentStage: "propose";
  };
  authority: Record<OxideWorkflowStage, OxideAuthority>;
  report: {
    startedAt: string;
    finishedAt: string;
    documentsIndexed: number;
    webDocumentsIndexed: number;
    webQueriesRun: number;
  };
  recommendedActions: string[];
}

export interface OxideValidationResult {
  valid: boolean;
  errors: string[];
}

export interface OxidePolicyDecision {
  policyPass: boolean;
  riskLevel: OxideRiskLevel;
  determinismScore: number;
  decision: "validated" | "rejected";
  reason: string;
  autonomyGate: {
    finalGate: "GO" | "NO-GO";
    state: "SUPERVISED_NO_GO" | "OVERRIDE_AUTONOMY" | "NORMAL_GO";
    autonomyGranted: boolean;
    overrideActive: boolean;
    overrideId: string | null;
  };
}

export interface HitlOverrideToken extends Record<string, unknown> {
  overrideId: string;
  approver: string;
  projectScope: string;
  riskAcceptance: string;
  issuedAt: string;
  expiresAt: string;
  linkedProposalRef: string;
  authorizationLanguage: string;
}

export interface HitlOverrideValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AutonomyGateDecision {
  finalGate: "GO" | "NO-GO";
  state: "SUPERVISED_NO_GO" | "OVERRIDE_AUTONOMY" | "NORMAL_GO";
  autonomyGranted: boolean;
  reason: string;
  overrideActive: boolean;
  overrideId: string | null;
}

const REQUIRED_AUTHORIZATION_PHRASES = [
  "i acknowledge the system is in no-go",
  "i accept the associated risks",
  "you are granted full control within the approved project scope until completion or expiration",
] as const;

export function createCycleProposalPayload(
  workflowRunId: string,
  report: CycleReport,
  recommendedActions: string[]
): OxideCycleProposalPayload {
  return {
    schemaVersion: "1.0",
    workflowRunId,
    lifecycle: {
      stages: [...OXIDE_WORKFLOW_STAGES],
      currentStage: "propose",
    },
    authority: { ...OXIDE_STAGE_AUTHORITIES },
    report: {
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      documentsIndexed: report.documentsIndexed,
      webDocumentsIndexed: report.webDocumentsIndexed,
      webQueriesRun: report.webQueriesRun,
    },
    recommendedActions,
  };
}

export function validateCycleProposalPayload(payload: unknown): OxideValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return {
      valid: false,
      errors: ["payload must be an object"],
    };
  }

  const value = payload as Partial<OxideCycleProposalPayload>;

  if (value.schemaVersion !== "1.0") {
    errors.push("schemaVersion must be '1.0'");
  }

  if (!value.workflowRunId || typeof value.workflowRunId !== "string") {
    errors.push("workflowRunId must be a non-empty string");
  }

  if (!value.lifecycle || typeof value.lifecycle !== "object") {
    errors.push("lifecycle must be an object");
  } else {
    const lifecycle = value.lifecycle as Partial<OxideCycleProposalPayload["lifecycle"]>;
    if (!Array.isArray(lifecycle.stages)) {
      errors.push("lifecycle.stages must be an array");
    } else {
      const stageMismatch =
        lifecycle.stages.length !== OXIDE_WORKFLOW_STAGES.length ||
        lifecycle.stages.some((stage, index) => stage !== OXIDE_WORKFLOW_STAGES[index]);
      if (stageMismatch) {
        errors.push("lifecycle.stages must match canonical stage order");
      }
    }

    if (lifecycle.currentStage !== "propose") {
      errors.push("lifecycle.currentStage must be 'propose'");
    }
  }

  if (!value.authority || typeof value.authority !== "object") {
    errors.push("authority must be an object");
  } else {
    const authority = value.authority as Partial<OxideCycleProposalPayload["authority"]>;
    for (const stage of OXIDE_WORKFLOW_STAGES) {
      if (authority[stage] !== OXIDE_STAGE_AUTHORITIES[stage]) {
        errors.push(`authority.${stage} must be '${OXIDE_STAGE_AUTHORITIES[stage]}'`);
      }
    }
  }

  if (!value.report || typeof value.report !== "object") {
    errors.push("report must be an object");
  } else {
    const report = value.report as Partial<OxideCycleProposalPayload["report"]>;
    if (!report.startedAt || typeof report.startedAt !== "string") {
      errors.push("report.startedAt must be a non-empty string");
    }
    if (!report.finishedAt || typeof report.finishedAt !== "string") {
      errors.push("report.finishedAt must be a non-empty string");
    }
    if (typeof report.documentsIndexed !== "number") {
      errors.push("report.documentsIndexed must be a number");
    }
    if (typeof report.webDocumentsIndexed !== "number") {
      errors.push("report.webDocumentsIndexed must be a number");
    }
    if (typeof report.webQueriesRun !== "number") {
      errors.push("report.webQueriesRun must be a number");
    }
  }

  if (!Array.isArray(value.recommendedActions)) {
    errors.push("recommendedActions must be an array");
  } else if (value.recommendedActions.length === 0) {
    errors.push("recommendedActions must include at least one action");
  } else if (value.recommendedActions.some((action) => typeof action !== "string" || action.trim().length === 0)) {
    errors.push("recommendedActions must contain non-empty strings");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function decideCycleProposalPolicy(
  payload: OxideCycleProposalPayload,
  validation: OxideValidationResult,
  options?: {
    hitlOverrideToken?: HitlOverrideToken;
    nowIso?: string;
  }
): OxidePolicyDecision {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const overrideValidation = validateHitlOverrideToken(options?.hitlOverrideToken, nowIso);

  if (!validation.valid) {
    const autonomyGate = evaluateAutonomyGate("NO-GO", {
      token: options?.hitlOverrideToken,
      tokenValidation: overrideValidation,
      nowIso,
    });

    return {
      policyPass: false,
      riskLevel: "critical",
      determinismScore: 0,
      decision: "rejected",
      reason: `Proposal payload schema validation failed: ${validation.errors.join("; ")}`,
      autonomyGate,
    };
  }

  if (payload.report.documentsIndexed <= 0) {
    const autonomyGate = evaluateAutonomyGate("NO-GO", {
      token: options?.hitlOverrideToken,
      tokenValidation: overrideValidation,
      nowIso,
    });

    if (autonomyGate.autonomyGranted) {
      return {
        policyPass: true,
        riskLevel: "high",
        determinismScore: 0.65,
        decision: "validated",
        reason: `NO-GO overridden by valid HITL authorization (${autonomyGate.overrideId}); bounded autonomy granted.`,
        autonomyGate,
      };
    }

    return {
      policyPass: false,
      riskLevel: "medium",
      determinismScore: 0.8,
      decision: "rejected",
      reason: "Cycle indexed zero documents; proposal blocked by deterministic policy gate.",
      autonomyGate,
    };
  }

  const autonomyGate = evaluateAutonomyGate("GO", {
    token: options?.hitlOverrideToken,
    tokenValidation: overrideValidation,
    nowIso,
  });

  return {
    policyPass: true,
    riskLevel: "low",
    determinismScore: 1,
    decision: "validated",
    reason: "Cycle payload passed schema and deterministic policy gates.",
    autonomyGate,
  };
}

export function validateHitlOverrideToken(token: HitlOverrideToken | undefined, nowIso: string): HitlOverrideValidationResult {
  if (!token) {
    return {
      valid: false,
      errors: ["override token missing"],
    };
  }

  const errors: string[] = [];

  if (typeof token.overrideId !== "string" || token.overrideId.trim().length === 0) {
    errors.push("overrideId must be a non-empty string");
  }
  if (typeof token.approver !== "string" || token.approver.trim().length === 0) {
    errors.push("approver must be a non-empty string");
  }
  if (typeof token.projectScope !== "string" || token.projectScope.trim().length === 0) {
    errors.push("projectScope must be a non-empty string");
  }
  if (typeof token.riskAcceptance !== "string" || token.riskAcceptance.trim().length === 0) {
    errors.push("riskAcceptance must be a non-empty string");
  }
  if (typeof token.linkedProposalRef !== "string" || token.linkedProposalRef.trim().length === 0) {
    errors.push("linkedProposalRef must be a non-empty string");
  }

  const issuedAtDate = new Date(token.issuedAt);
  const expiresAtDate = new Date(token.expiresAt);
  const nowDate = new Date(nowIso);

  if (Number.isNaN(issuedAtDate.getTime())) {
    errors.push("issuedAt must be an ISO timestamp");
  }
  if (Number.isNaN(expiresAtDate.getTime())) {
    errors.push("expiresAt must be an ISO timestamp");
  }
  if (!Number.isNaN(issuedAtDate.getTime()) && !Number.isNaN(expiresAtDate.getTime()) && expiresAtDate <= issuedAtDate) {
    errors.push("expiresAt must be later than issuedAt");
  }
  if (!Number.isNaN(expiresAtDate.getTime()) && !Number.isNaN(nowDate.getTime()) && expiresAtDate <= nowDate) {
    errors.push("override token is expired");
  }

  if (typeof token.authorizationLanguage !== "string" || token.authorizationLanguage.trim().length === 0) {
    errors.push("authorizationLanguage must be a non-empty string");
  } else {
    const normalized = token.authorizationLanguage.trim().toLowerCase();
    for (const phrase of REQUIRED_AUTHORIZATION_PHRASES) {
      if (!normalized.includes(phrase)) {
        errors.push(`authorizationLanguage missing required phrase: ${phrase}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function evaluateAutonomyGate(
  finalGate: "GO" | "NO-GO",
  options?: {
    token?: HitlOverrideToken;
    tokenValidation?: HitlOverrideValidationResult;
    nowIso?: string;
  }
): AutonomyGateDecision {
  if (finalGate === "GO") {
    return {
      finalGate,
      state: "NORMAL_GO",
      autonomyGranted: true,
      reason: "Final gate is GO; normal autonomy policy applies.",
      overrideActive: false,
      overrideId: null,
    };
  }

  const validation = options?.tokenValidation ?? validateHitlOverrideToken(options?.token, options?.nowIso ?? new Date().toISOString());
  if (validation.valid && options?.token) {
    return {
      finalGate,
      state: "OVERRIDE_AUTONOMY",
      autonomyGranted: true,
      reason: "NO-GO overridden by valid HITL token; bounded temporary autonomy granted.",
      overrideActive: true,
      overrideId: options.token.overrideId,
    };
  }

  return {
    finalGate,
    state: "SUPERVISED_NO_GO",
    autonomyGranted: false,
    reason: `NO-GO blocks autonomy; no valid HITL override token (${validation.errors.join("; ")}).`,
    overrideActive: false,
    overrideId: null,
  };
}
