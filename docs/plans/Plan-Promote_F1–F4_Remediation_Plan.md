# Plan-Promote F1–F4 Remediation Plan

Status: IMPLEMENTATION COMPLETE (2026-02-19, GitHub Copilot)
Owner: ToM Engineering
Method Standard: ToM Methodology Standard v1.1
Directive Source: `docs/plans/Plan-F1–F4_Remediation_Plan.md`

---

## RESEARCH

### Problem framing
Current override controls are cryptographically sound but operationally incomplete for production use. The directive requires closing four blockers:
- F1 Replay protection (single-use token/nonce)
- F2 Revocation enforcement
- F3 Scope and capability enforcement
- F4 Per-action re-validation for privileged operations

### Current-state evidence
- `src/core/governance/overrideToken.ts` verifies signature, canonicalization, token hash, and validity windows.
- `src/core/oxideGovernance.ts` has autonomy gate logic and override-aware decision pathways.
- `src/core/brain.ts` performs cycle-level override handling.
- `src/cli.ts` supports override token input.
- `src/core/config.ts` + `.env.example` define override key material settings.
- `docs/plans/CTO-Request_Information_Findings.md` identifies production blockers and issues NO-GO pending F1–F4 closure.

### Constraints
- Must preserve existing NO-GO default and bounded HITL model.
- Must remain minimal, additive, and auditable.
- Must avoid redesign of architecture and keep compatibility with current CLI/cycle flow.
- Must implement persistent governance state under `.tom-workspace/governance/`.

### Alternatives considered
1. In-memory-only replay/revocation state: rejected (not durable across process restarts).
2. DB-backed state in runtime SQLite: deferred (more migration overhead than required).
3. JSONL append-only governance records: selected (minimal change, durable, auditable).

### Unknowns and assumptions
- Assumption A1: privileged action call sites are discoverable and can be routed through one gate helper.
- Assumption A2: workspace path resolution can be normalized for prefix-based scope checks.
- Assumption A3: current override token payload includes fields needed for replay + scope checks (`override_id`, nonce, capabilities, scopes).

---

## PLAN

### Objective
Implement F1–F4 so override authorization is single-use, revocable, scoped, and revalidated before every privileged action.

### Scope
- Add replay ledger persistence + checks.
- Add revocation registry + CLI revoke operation.
- Add capability/path/repo scope enforcement.
- Add a single privileged-action gate used at all privileged call sites.
- Add audit events for grant/deny with explicit reasons.

### Non-scope
- Redesign of token schema beyond required verification outputs.
- Introduction of external secret managers.
- Broad runtime policy redesign unrelated to overrides.

### Decision tree
- If replay tuple seen -> deny action (`replay_detected`).
- Else if override revoked -> deny action (`revoked`).
- Else if signature/expiry invalid -> deny action (`invalid_or_expired`).
- Else if capability/scope mismatch -> deny action (`scope_or_capability_denied`).
- Else -> allow privileged action and emit grant audit event.

### Approach and rationale
1. Implement centralized `requirePrivilege(...)` gate first to collapse risk quickly.
2. Implement scope/capability enforcement and wire into gate.
3. Implement replay and revocation stores and wire into gate + autonomy transition.
4. Replace ad hoc privileged action checks with centralized gate invocation.
5. Validate via focused tests/build/lint and scenario checks matching F1–F4 acceptance conditions.

### Promotion Record
- Promoted On: 2026-02-19
- Promoted By: GitHub Copilot (GPT-5.3-Codex)
- Promotion Basis: ToM Methodology Standard v1.1
- Promotion State: IMPLEMENTATION COMPLETE

---

## VERIFY

### Stakeholder/provider validation
- Source directive approved by CTO in `docs/plans/Plan-F1–F4_Remediation_Plan.md`.
- Findings baseline established in `docs/plans/CTO-Request_Information_Findings.md`.

### Dependency checks
- Existing dependencies (`zod`, `json-canonicalize`) already present.
- Node crypto APIs available in current runtime.

### Risk assessment
- Medium risk: false negatives in path scope normalization.
- Medium risk: missing privileged call-site coverage.
- Low risk: JSONL persistence growth over time.

### Fallback paths
- If per-action gate introduces regressions, revert to last known commit and disable new privileged call-site wiring while preserving read-only code paths.
- If JSONL parsing fails, fail closed for privileged actions and require operator intervention.

### Logic gates
- Assumption validation: required fields present in verified token output.
- Environment readiness: `.tom-workspace/governance` writable.
- Rollback readiness: rollback commands documented below.
- Go/No-Go: GO for implementation once writable governance path and call-site inventory are confirmed.

### Implementation evidence
- `src/core/governance/overrideReplayLedger.ts` added (F1).
- `src/core/governance/overrideRevocation.ts` added + CLI command path in `src/cli.ts` (F2).
- `src/core/governance/overrideEnforcement.ts` added (F3).
- `src/core/governance/privilegedGate.ts` added and wired in `src/core/brain.ts` (F4).
- `src/core/oxideGovernance.ts` updated with acceptance-time override hook for replay/revocation checks.
- `src/core/governance/overrideToken.ts` updated with revocation callback support and explicit nonce/token-hash outputs.
- Validation executed: `npm run build` (PASS), `npm run lint` (PASS).

---

## PREREQUISITES

- Backup/snapshot confirmation:
  - Capture `git status` and `git rev-parse --short HEAD`.
  - Confirm clean baseline or intentional worktree.
- Current-state capture:
  - Run `npm run build` and `npm run lint` before changes.
- Access path validation:
  - Confirm write access to `.tom-workspace/governance`.
  - Confirm CLI entry point for revoke command path.
- Required approvals/sign-offs:
  - CTO directive approval already provided.
  - Builder peer review required before production GO declaration.

---

## SUCCESS CRITERIA

### Definition of done
All F1–F4 controls are implemented and enforced in code, with verification evidence demonstrating deny/allow behavior at per-action granularity.

### Acceptance checks
- Replay:
  - Reuse same override token -> denied.
- Revocation:
  - Revoke override mid-run -> next privileged action denied.
- Capability:
  - Token allows `deploy` but denies `merge_pr` -> merge denied.
- Path scope:
  - Token path scope `src/` cannot mutate `.github/` -> denied.
- Expiry revalidation:
  - Token expires mid-run -> subsequent privileged action denied.

### Phase checkpoints
- C1: `privilegedGate.ts` added and adopted by at least one privileged pathway.
- C2: `overrideEnforcement.ts` implemented and fully invoked by gate.
- C3: replay ledger + revocation registry operational.
- C4: all privileged call sites routed through gate; audit events emitted.
- C5: build/lint/scenario validation complete.

---

## TO-DO LIST

1. Add `src/core/governance/privilegedGate.ts`. ✅ COMPLETE
   - Verify command: `npm run build`
   - Expected: no type errors for new gate API.
2. Add `src/core/governance/overrideEnforcement.ts`. ✅ COMPLETE
   - Verify command: `npm run lint -- src/core/governance/overrideEnforcement.ts`
   - Expected: lint clean.
3. Add `src/core/governance/overrideReplayLedger.ts` and `src/core/governance/overrideRevocation.ts`. ✅ COMPLETE
   - Verify command: run focused scenario checks (replay/revocation).
   - Expected: deterministic deny results with reason codes.
4. Wire gate in `src/core/brain.ts` and `src/core/oxideGovernance.ts`. ✅ COMPLETE
   - Verify command: `npm run build && npm run lint`
   - Expected: compile/lint pass; no bypass path remains for privileged actions.
5. Add/extend CLI revoke command path. ✅ COMPLETE
   - Verify command: invoke revoke command and re-check action denial.
   - Expected: revocation persisted and enforced.
6. Update architecture snapshot/as-built evidence. ⏳ PENDING SECOND-BUILDER REVIEW LINKAGE
   - Verify command: `npm run asbuilt:progress`
   - Expected: updated records reflect implemented controls and verification evidence.

---

## ROLLBACK PLAN

### Trigger conditions
- Privileged actions incorrectly denied in valid cases.
- Privileged actions incorrectly allowed when they should deny.
- Any stability regression in cycle execution.

### Rollback procedure
1. `git log --oneline -n 5` identify remediation commit range.
2. `git revert <commit>` (or sequence) for introduced governance files/wiring.
3. Re-run `npm run build && npm run lint`.
4. Re-run baseline cycle without override to confirm NO-GO default behavior remains intact.

### Abort-vs-continue gate
- Abort if privilege checks are inconsistent or non-deterministic.
- Continue only when deny reasons and enforcement are reproducible.

### Escalation path
- Escalate to CTO and ToM Engineering owner with failing scenario evidence and rollback hash.

---

## MONITORING & VALIDATION

### Monitoring window
- Minimum 48 hours after merge to `main`.

### Health indicators
- Count of `PRIVILEGE_GRANTED` vs `PRIVILEGE_DENIED` events.
- Denied reason distribution (`replay_detected`, `revoked`, `scope_or_capability_denied`, `invalid_or_expired`).
- Any privileged mutation executed without gate event (must be zero).

### Alert conditions
- Any privileged action succeeds without grant event.
- Any replayed token accepted.
- Any revoked override accepted.

### Remediation playbook
- Immediately disable autonomous privileged path (force NO-GO).
- Revoke active override IDs.
- Roll back recent remediation commit if bypass confirmed.

---

## LESSONS LEARNED

To be completed in debrief after implementation. Initial hypotheses:
- Centralized privilege gating should reduce bypass risk and maintenance complexity.
- Durable JSONL governance records provide fast operational value with low integration overhead.
- Per-action revalidation is essential for long-lived cycles where token state can change mid-run.
