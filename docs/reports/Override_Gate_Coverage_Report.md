# Override Gate Coverage Report

**Objective**
- Verify that all privileged execution paths are routed through the override enforcement layer (F1–F4) and identify any bypasses.

**Scope**
- Code inspected: governance modules and privileged call sites across `src/` and relevant CLI/Electron entrypoints.

**Governance modules (new/modified)**
- `src/core/governance/privilegedGate.ts`
- `src/core/governance/overrideToken.ts`
- `src/core/governance/overrideEnforcement.ts`
- `src/core/governance/overrideReplayLedger.ts`
- `src/core/governance/overrideRevocation.ts`

**Updated high-level sections**
- Oxide governance (override validation & autonomy gate): [src/core/oxideGovernance.ts](src/core/oxideGovernance.ts#L318-L414)
- Brain (runCycle: override verification, replay/revocation, requireCyclePrivilege wrapper and gated call sites): [src/core/brain.ts](src/core/brain.ts#L224-L312)
- Privilege gate (verification + enforcement entrypoint): [src/core/governance/privilegedGate.ts](src/core/governance/privilegedGate.ts#L56-L104)
- Override enforcement (scope/capability checks): [src/core/governance/overrideEnforcement.ts](src/core/governance/overrideEnforcement.ts#L1-L120)
- Replay ledger (replay prevention): [src/core/governance/overrideReplayLedger.ts](src/core/governance/overrideReplayLedger.ts#L1-L120)
- Revocation store (revocation registry + write): [src/core/governance/overrideRevocation.ts](src/core/governance/overrideRevocation.ts#L1-L120)
- Override token verification: [src/core/governance/overrideToken.ts](src/core/governance/overrideToken.ts#L1-L220)

**Coverage Checklist**
- Action: create proposal (`policy.create_proposal`)
  - Call site: [src/core/brain.ts](src/core/brain.ts#L304)
  - Enforcement: `requireCyclePrivilege("policy.create_proposal", ["memory/"])` invoked immediately before creation when `policyDecision.decision === "validated"`.
  - Result: PASS with Notes — draft proposal creation (when not validated) does not call the gate (intentional), but promotions/validated proposals are gated.

- Action: approve proposal (`policy.approve_proposal`)
  - Call site: [src/core/brain.ts](src/core/brain.ts#L336-L352)
  - Enforcement: `requireCyclePrivilege("policy.approve_proposal", ["memory/"])` invoked when `proposalValidated` is true.
  - Result: PASS

- Action: record deploy outcome / promote
  - Call site: [src/core/brain.ts](src/core/brain.ts#L376-L400)
  - Enforcement: `requireCyclePrivilege("policy.record_deploy_outcome", ["memory/"])` invoked when `proposalValidated` is true.
  - Result: PASS

- Action: HITL override acceptance (replay/revocation checks)
  - Call site: [src/core/brain.ts](src/core/brain.ts#L256-L274) (onAcceptOverride callback)
  - Enforcement: `revocationStore.isRevoked()` and `replayLedger.hasSeen()` are checked, and `replayLedger.markSeen()` is called only after acceptance.
  - Result: PASS

- Action: Electron renderer privileged requests (IPC)
  - Call site: [electron/main/index.ts](electron/main/index.ts#L1-L80)
  - Enforcement: `ipcMain.handle('privileged:request', ...)` calls `requirePrivilege(request.context ?? request)`.
  - Result: PASS with Notes — gate is invoked, but the main process currently forwards renderer-supplied `request.context`; ensure the main process validates/owns `runtimeStore` and `workflowRunId` rather than trusting renderer-provided objects (trust boundary note).

- Action: Override revocation (CLI `revoke`)
  - Call site: [src/cli.ts](src/cli.ts#L246-L268)
  - Enforcement: NONE — `new OverrideRevocationStore().revoke(...)` is invoked directly by the CLI without `requirePrivilege` or equivalent.
  - Result: FAIL — this is a privileged governance mutation performed outside the override-enforcement layer. It should be audited/gated.

- Action: Governance file writes (replay ledger markSeen)
  - Call site: [src/core/governance/overrideReplayLedger.ts](src/core/governance/overrideReplayLedger.ts#L36-L52)
  - Enforcement: `markSeen()` is only called from the `onAcceptOverride` acceptance flow inside `brain.runCycle` after validation checks.
  - Result: PASS

**Summary verdict**
- PASS (with notes): The key runtime privileged flows executed during `runCycle` (proposal validation, approval, deploy outcome and HITL acceptance) are routed through `requirePrivilege`, which enforces token verification, revocation checks, scope/capability enforcement, and emits decision events — satisfying F1–F4 for those paths.
- FAIL: The CLI `revoke` command bypasses `requirePrivilege` and writes revocation records directly to disk. This is a bypass of the enforcement layer and must be addressed if the strict requirement is "every privileged execution path must route through the override enforcement layer." The bypass is limited to operator-initiated revocations via the CLI.

**Additional notes**
- Per-action re-validation (F4) is implemented: `requirePrivilege` calls `verifyOverrideToken` and checks revocation on each invocation, so tokens are re-verified per gated action.
- Scope/capability enforcement (F3) is implemented in `assertOverridePermits()` and applied via `requirePrivilege`.
- Replay prevention (F1) and revocation registry (F2) are implemented and used in the acceptance flow.
- Trust boundary: the Electron IPC path correctly invokes `requirePrivilege`, but it relies on renderer-provided `context` object—ensure the main process resolves/validates runtime references (e.g., `runtimeStore`, `workflowRunId`) rather than accepting them from the renderer.

**Recommended next steps (optional)**
- Route CLI `revoke` through `requirePrivilege` (or at minimum log an audited runtime-store event and require operator authorization) — I can implement a minimal safe patch that: reads the override id, creates a `RuntimeMemoryStore` workflow event, and either calls `requirePrivilege` (if operator-provided override token exists) or requires a different operator auth path.
- Add an automated assertion test that scans the codebase for direct calls to `OverrideRevocationStore.revoke` (or other direct governance writes) and fails the test if any such calls exist outside `governance/*` acceptance paths.

---
Report generated from repository `ToM` (branch: `main`).
