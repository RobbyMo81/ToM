# Red Team IPC — Second Pass Report

- Date: 2026-02-19
- Scope: post-remediation adversarial review of renderer→main privileged IPC path
- Target: `electron/main/index.ts` (`ipcMain.handle('privileged:request', ...)`)
- Method: static control-flow + implementation verification of current code state

## Threat Model

- Attacker controls renderer-side payloads delivered through `window.api.requestPrivileged(...)`.
- Attacker cannot execute arbitrary code in Electron main process.
- Defender goal: renderer input remains intent-only while all authority/context is owned by main.

## Vectors Reviewed

1. Path traversal attempt via `affectedPaths` (`..\\..\\.github\\workflows\\...`).
2. Identity confusion attempt via forged renderer context fields (`workflowRunId`, gate state, key resolver, revocation function).
3. Override token tampering (invalid structure/signature/hash).
4. Replay reuse of same `override_id + nonce`.
5. Error-oracle probing for internal TypeError leakage.

## Current-State Verification

- Old vulnerable forwarding removed:
  - `requirePrivilege(request.context ?? request)` is not present.
- Intent-only parsing present:
  - `parseRendererIntent(...)` extracts only `action`, `affectedPaths`, `overrideToken`.
- Main-owned authority/context present:
  - `runtimeStore`, `workflowRunId`, `workspaceRoot`, `resolveKey`, `isRevoked` are created in main.
- Replay controls present:
  - pre-check: `replayLedger.hasSeen(...)`
  - consume-after-success: `replayLedger.markSeen(...)`
- Error normalization present:
  - `normalizeIpcError(...)` returns generic denial for non-`PRIVILEGE_DENIED` paths.

## Expected Denial Responses (Post-Remediation)

- Invalid/malformed request:
  - `{ ok: false, error: { message: "Privileged request denied.", name: "Error" } }`
- Policy rejection (missing/invalid token, scope/capability mismatch, revoked token, replay):
  - `{ ok: false, error: { message: "<privilege denied reason>", name: "PrivilegeDeniedError" } }`
- Main emits policy audit events:
  - `task_events.message = "PRIVILEGE_DENIED"`

## Escalation Criteria

Escalate to CRITICAL if any of the following are observed:

1. Renderer can directly influence any of:
   - `finalGateStatus`, `workflowRunId`, `runtimeStore`, `resolveKey`, `isRevoked`, `workspaceRoot`.
2. Replay succeeds with same `override_id + nonce` after successful first use.
3. Unexpected exceptions (TypeError/internal stack details) are returned to renderer.
4. Policy denials occur without corresponding runtime audit events.

## Residual Risk / Notes

- `finalGateStatus` is currently hard-coded to `NO-GO` in IPC handler for minimal hardening. This is secure-conservative but should eventually be derived from authoritative governance state.
- Full live adversarial execution in Electron DevTools remains recommended as a follow-up operational validation step.

## Conclusion

Second-pass review indicates the critical trust-boundary flaw is remediated in the current code path and replay/error-handling controls are in place. IPC posture is **HARDENED (v1)** for the assessed vectors.
