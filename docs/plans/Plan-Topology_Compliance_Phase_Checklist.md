# Plan — Runtime Topology Compliance Checklist (Phase 1/2/3)

- Date: 2026-02-18
- Status: IN PROGRESS (Promoted to implementation planning)
- Mode: Implementation planning (methodology-compliant)
- Methodology Standard: `docs/reference/ToM_Methodology_Standard.md` (gold standard for plan → implementation promotion)
- Objective: Bring runtime behavior into full compliance with Core Runtime Topology in `.tom-workspace/whoiam.md`
- Constraint: Preserve and complete the O.X.I.D.E enhancement path defined in `Plan-O.X.I.D.E_archeticture.md`

## Promotion Record

- Promoted On: 2026-02-18
- Promoted By: GitHub Copilot
- Promotion Basis: `docs/reference/ToM_Methodology_Standard.md` v1.1
- Promotion State: Plan promoted to implementation-planning format; execution remains IN PROGRESS

---

## 1) Research

Current-state evidence indicates partial topology alignment with known implementation gaps in identity binding, role-specific prompt hardening, and full O.X.I.D.E runtime enforcement.

Research-backed findings used in this plan:

- Entrypoint/service wiring exists.
- Runtime lineage persistence exists.
- Identity-bound prompt flow and metadata coverage remain incomplete.
- O.X.I.D.E Rust scaffold exists, but full deterministic/safety controls remain incomplete.

---

## 2) Plan

Approach:

- Execute topology compliance in phased gates (Phase 1/2/3).
- Keep policy and auditability constraints explicit and testable.
- Promote completion only via validation evidence and closeout artifacts.

Non-goals:

- Policy bypass for schedule acceleration.
- Unbounded autonomous behavior.

---

## 3) Verify

Required go/no-go checks before phase execution:

- [ ] assumptions validated against current runtime behavior
- [ ] dependency readiness confirmed
- [ ] fallback and rollback readiness confirmed
- [ ] go/no-go decision recorded for each phase

---

## 4) Prerequisites

- [ ] current-state snapshot documented
- [ ] rollback savepoint confirmed
- [ ] primary/fallback execution paths confirmed
- [ ] required approvals/sign-offs captured

---

## Current Gap Summary

Runtime is currently **partially aligned**:

- Aligned:
  - Entrypoint starts cycle, GitHub sync, WhoAmI sync, and API services.
  - Runtime lineage persistence exists for sessions/workflow/proposals.
  - `/query`, `/generate`, `/cycle`, and lineage read endpoints are active.
- Missing for full topology compliance:
  - No formal Identity Binder middleware in request/cycle execution path.
  - No role-specific prompt hardening (ToM vs O.X.I.D.E) before all LLM calls.
  - WhoAmI sync does not yet extract and persist structured identity traits.
  - Runtime lineage does not consistently log active identity context for each LLM action.
  - O.X.I.D.E Rust cognitive subsystem not yet implemented.

---

## 5) Success Criteria

This plan is complete only when all are true:

- [ ] all phase checklists and exit criteria are satisfied
- [ ] cross-phase non-functional requirements are satisfied
- [ ] final validation commands pass
- [ ] audit/debrief/handoff artifacts are updated

---

## 6) To-Do List (Execution Plan)

The execution plan is organized into three implementation phases.

---

## Phase 1 — Identity Binder Foundation (TypeScript Runtime)

### Goal

Create deterministic identity binding primitives and insert them into current runtime entry paths without changing O.X.I.D.E Rust scope yet.

### Implementation Checklist

- [ ] Define `IdentityContext` contract (`agent`, `traits`, `directives`, `sourceVersion`, `boundAt`).
- [ ] Implement `IdentityBinder` service in TypeScript:
  - [ ] parse `.tom-workspace/whoiam.md` into structured trait blocks.
  - [ ] expose `bind("ToM" | "O.X.I.D.E")` returning hardened system prompt + metadata.
- [ ] Add parser validation/fallback behavior:
  - [ ] missing sections → safe failure (no autonomous behavior).
  - [ ] malformed traits → deterministic fallback prompt.
- [ ] Add config flags:
  - [ ] `IDENTITY_BINDER_ENABLED`.
  - [ ] `IDENTITY_BINDER_STRICT_MODE`.
- [ ] Wire binder into:
  - [ ] `POST /query` path.
  - [ ] `POST /generate` path.
  - [ ] `runCycle()`.
- [ ] Persist identity metadata to runtime lineage:
  - [ ] session metadata for query/generate.
  - [ ] workflow context for cycle.

### Validation Checklist

- [ ] Unit tests for parser extraction and fallback behavior.
- [ ] Smoke tests: query/generate include identity metadata in runtime DB.
- [ ] Lint/build gates pass.
- [ ] Feature flag off = current behavior preserved.

### Exit Criteria

- Identity Binder exists and can deterministically bind ToM/O.X.I.D.E contexts.
- Every LLM entry path can include identity-bound system prompt under feature flag.

---

## Phase 2 — Enforcement + Governance Logging

### Goal

Enforce identity separation in runtime and audit all identity-bound execution in lineage.

### Implementation Checklist

- [ ] Enforce role routing policy:
  - [ ] ToM routes only to executive/strategic action classes.
  - [ ] O.X.I.D.E routes only to subsystem/operational classes.
- [ ] Add identity guard middleware in API:
  - [ ] reject execution when identity binding is unavailable in strict mode.
- [ ] Extend runtime memory schema usage (no destructive migration required):
  - [ ] include `identityAgent`, `identityVersion`, `identitySourceHash` in metadata.
  - [ ] log prompt-class identifiers (not raw prompt content).
- [ ] Add policy checks in cycle execution:
  - [ ] prevent O.X.I.D.E from executive override operations.
  - [ ] explicit event log when blocked by policy.
- [ ] Update WhoAmI sync outputs:
  - [ ] include identity trait extraction version/hash.
  - [ ] include binder status summary.

### Validation Checklist

- [ ] Integration tests prove blocked cross-role operations.
- [ ] Lineage API (`/lineage/latest`, `/lineage/runs`) shows identity metadata.
- [ ] Policy rejection events visible in `task_events`.
- [ ] Lint/build/smoke gates pass.

### Exit Criteria

- Identity separation is enforced, not just documented.
- Audit trail proves which identity executed each LLM-bound action.

---

## Phase 3 — O.X.I.D.E Enhancement Completion (Rust Brain + Dual-Brain Model)

### Goal

Implement and integrate O.X.I.D.E Rust cognitive subsystem while preserving dual-brain governance and deterministic control.

### Implementation Checklist

- [ ] Scaffold `oxide-brain/` Rust crate modules:
  - [ ] `reasoning/`
  - [ ] `policy/`
  - [ ] `risk/`
  - [ ] `patch_synthesis/`
  - [ ] `validation/`
  - [ ] `telemetry/`
- [ ] Add Ollama local inference adapter for Rust brain:
  - [ ] model whitelist
  - [ ] deterministic config caps (temperature/token limits)
  - [ ] timeout/circuit breaker
  - [ ] safe-mode no-op fallback
- [ ] Define cross-brain contract:
  - [ ] Host brain discovers skills.
  - [ ] O.X.I.D.E proposes deterministic patch intent.
  - [ ] CI/policy gates validate and approve.
- [ ] Integrate with runtime memory lineage:
  - [ ] proposal origin (`host` vs `oxide`).
  - [ ] determinism score + risk outcome.
  - [ ] deployment decision trail.
- [ ] Add security controls:
  - [ ] signed model manifest/checksum verification.
  - [ ] sandbox/resource quotas.
  - [ ] explicit prohibition checks (self-upgrade/self-policy mutation).

### Validation Checklist

- [ ] Offline local inference validated.
- [ ] Deterministic JSON output validated.
- [ ] Safe-mode fallback demonstrated.
- [ ] Cross-brain separation and approval workflow tested.
- [ ] End-to-end audit events captured.

### Exit Criteria

- O.X.I.D.E enhancement is operational as a bounded subsystem.
- Dual-brain governance is enforced with full auditability.

---

## Cross-Phase Non-Functional Requirements

- [ ] No autonomous mutation without explicit policy/approval path.
- [ ] No raw chain-of-thought persistence in logs.
- [ ] Backward compatibility with existing API contracts unless versioned.
- [ ] All new behavior behind controlled rollout flags where feasible.

---

## Suggested Delivery Sequence (Practical)

1. Complete Phase 1 binder primitives + feature flag wiring.
2. Implement Phase 2 enforcement and lineage visibility.
3. Start Phase 3 Rust subsystem behind adapter boundary.
4. Promote from planning to MVP implementation once Phase 1 exit criteria are met.

---

## Completion Marking Instructions (When Enhancement Is Done)

Use this exact closeout flow to mark the enhancement complete.

### Step A — Mark Phase Checklists

- [ ] In this file, set all completed Phase 1/2/3 checklist items to `[x]`.
- [ ] Confirm all three phase Exit Criteria are satisfied and true in runtime.
- [ ] Mark all Cross-Phase Non-Functional Requirements as `[x]`.

### Step B — Update whoiam.md Status

- [ ] In `.tom-workspace/whoiam.md`, update `2.2 Implementation Status (Planning vs Runtime)`:
  - move Identity Binder items from Planned/Partial → Implemented.
  - move O.X.I.D.E enhancement from Planned → Implemented.
- [ ] Update `9) Current Build Snapshot` with final compliance state.

### Step C — Record Audit Trail

- [ ] Add a completion entry to:
  - `docs/debriefs/Lineage_Workflow_Closeout_Debrief_2026-02-18.md`
  - `docs/handoffs/Handoff Report.md`
- [ ] Include final validation evidence and policy impacts.

### Step D — Final Validation Commands

- [ ] `npm run lint:all`
- [ ] `npm run build`
- [ ] runtime smoke tests for binder + lineage + O.X.I.D.E path

### Step E — Completion Flag (Single Source of Truth)

When all steps above are complete, add this line to the top metadata block of this plan file:

- `- Status: COMPLETE (date + owner)`

Example:

- `- Status: COMPLETE (2026-02-18, ToM Engineering)`

---

## 7) Rollback Plan

If a phase fails validation or policy gates:

- revert to the last known-good savepoint,
- disable or bypass incomplete paths behind controls/flags,
- record failure cause and mitigation before retry.

Abort conditions:

- identity separation cannot be enforced,
- governance/audit requirements regress,
- deterministic safeguards cannot be guaranteed.

---

## 8) Monitoring & Validation

Post-change monitoring window: minimum 48 hours.

Required monitoring checks:

- lineage outputs continue to include required identity/governance context,
- no policy bypass events observed,
- critical runtime paths remain stable under normal and fallback operation.

---

## 9) Lessons Learned

- [ ] record debrief updates in `docs/debriefs/`,
- [ ] update handoff artifacts as needed,
- [ ] update methodology/process notes if new constraints are discovered.
