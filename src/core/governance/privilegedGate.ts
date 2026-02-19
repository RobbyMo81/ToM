import { type RuntimeMemoryStore } from "../../integrations/runtimeMemoryStore";
import { assertOverridePermits } from "./overrideEnforcement";
import { type OverrideToken, verifyOverrideToken } from "./overrideToken";

export class PrivilegeDeniedError extends Error {
  readonly code = "PRIVILEGE_DENIED";

  constructor(
    public readonly action: string,
    public readonly reason: string
  ) {
    super(`Privilege denied for action '${action}': ${reason}`);
    this.name = "PrivilegeDeniedError";
  }
}

export interface PrivilegedGateContext {
  action: string;
  affectedPaths: string[];
  finalGateStatus: "GO" | "NO-GO";
  workspaceRoot: string;
  workflowRunId: string;
  runtimeStore: RuntimeMemoryStore;
  overrideToken?: OverrideToken;
  resolveKey: (keyId: string) => Buffer | undefined;
  isRevoked: (overrideId: string) => boolean;
}

export interface VerifiedPrivilegeContext {
  granted: true;
  reason: string;
  overrideId: string | null;
}

function emitDecision(
  runtimeStore: RuntimeMemoryStore,
  workflowRunId: string,
  granted: boolean,
  action: string,
  reason: string,
  overrideId: string | null
): void {
  runtimeStore.appendTaskEvent({
    workflowRunId,
    eventType: granted ? "approval" : "policy",
    eventLevel: granted ? "low" : "high",
    message: granted ? "PRIVILEGE_GRANTED" : "PRIVILEGE_DENIED",
    payload: {
      action,
      reason,
      overrideId,
    },
  });
}

export function requirePrivilege(context: PrivilegedGateContext): VerifiedPrivilegeContext {
  if (context.finalGateStatus === "GO") {
    emitDecision(context.runtimeStore, context.workflowRunId, true, context.action, "Final gate is GO.", null);
    return {
      granted: true,
      reason: "Final gate is GO.",
      overrideId: null,
    };
  }

  if (!context.overrideToken) {
    const reason = "NO-GO requires valid override token for privileged action.";
    emitDecision(context.runtimeStore, context.workflowRunId, false, context.action, reason, null);
    throw new PrivilegeDeniedError(context.action, reason);
  }

  const verification = verifyOverrideToken(context.overrideToken, {
    resolveKey: context.resolveKey,
    enforceTokenHash: true,
  });

  if (!verification.ok) {
    emitDecision(context.runtimeStore, context.workflowRunId, false, context.action, verification.reason, context.overrideToken.override_id);
    throw new PrivilegeDeniedError(context.action, verification.reason);
  }

  if (context.isRevoked(verification.token.override_id)) {
    const reason = "override token has been revoked";
    emitDecision(context.runtimeStore, context.workflowRunId, false, context.action, reason, verification.token.override_id);
    throw new PrivilegeDeniedError(context.action, reason);
  }

  const enforcement = assertOverridePermits(
    verification.token,
    context.action,
    context.affectedPaths,
    context.workspaceRoot
  );

  if (!enforcement.ok) {
    emitDecision(context.runtimeStore, context.workflowRunId, false, context.action, enforcement.reason, verification.token.override_id);
    throw new PrivilegeDeniedError(context.action, enforcement.reason);
  }

  emitDecision(context.runtimeStore, context.workflowRunId, true, context.action, "Override token validated and permits action.", verification.token.override_id);
  return {
    granted: true,
    reason: "Override token validated and permits action.",
    overrideId: verification.token.override_id,
  };
}
