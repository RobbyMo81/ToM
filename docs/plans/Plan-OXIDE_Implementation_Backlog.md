# Plan — O.X.I.D.E Implementation Backlog (R-008)

- Date: 2026-02-19
- Status: IN PROGRESS
- Parent Plan: `docs/plans/Plan-O.X.I.D.E_archeticture.md`
- Build Instance: `docs/build/Build_Instance_OXIDE_Skill_to_Logic.md`
- Methodology Standard: `docs/reference/ToM_Methodology_Standard.md`

## Promotion Record

- Promoted On: 2026-02-19
- Promoted By: ToM Engineering
- Promotion Basis: `docs/reference/ToM_Methodology_Standard.md` v1.1
- Promotion State: Plan promoted to implementation-planning format; execution remains IN PROGRESS

---

## 1) Objective

Define a prioritized, dependency-aware implementation backlog that converts the O.X.I.D.E architecture into executable work with measurable acceptance criteria.

---

## 2) Backlog Rules

- Ticket IDs are immutable and ordered by dependency.
- Every ticket has owner, dependency, and acceptance criteria.
- Completion requires evidence in code, docs, and validation logs.
- Promotion gates remain `discover → propose → validate → approve → promote`.

---

## 3) Phase Backlog (Ticketed)

### Phase 1 — Identity Binder Foundation

| Ticket ID    | Task                                                                                             | Owner           | Depends On   | Acceptance Criteria                                                       |
| ------------ | ------------------------------------------------------------------------------------------------ | --------------- | ------------ | ------------------------------------------------------------------------- |
| OXIDE-P1-001 | Implement `IdentityContext` contract and binder service in TypeScript runtime                    | ToM Engineering | None         | Binder interface and concrete loader exist; compile + lint pass           |
| OXIDE-P1-002 | Wire binder into `query`, `generate`, and `runCycle` entry paths                                 | ToM Engineering | OXIDE-P1-001 | Bound identity context is present before LLM reasoning in all three paths |
| OXIDE-P1-003 | Persist identity metadata (`identityAgent`, `identityVersion`, `promptClass`) in lineage context | ToM Engineering | OXIDE-P1-002 | Metadata visible in lineage summary/runs payloads                         |

### Phase 2 — Enforcement + Governance Logging

| Ticket ID    | Task                                                                         | Owner           | Depends On   | Acceptance Criteria                                                 |
| ------------ | ---------------------------------------------------------------------------- | --------------- | ------------ | ------------------------------------------------------------------- |
| OXIDE-P2-001 | Enforce role routing policy boundaries for ToM vs O.X.I.D.E actions          | ToM Engineering | OXIDE-P1-002 | Disallowed role actions are blocked with deterministic errors       |
| OXIDE-P2-002 | Add strict-mode guard behavior when identity binding is unavailable          | ToM Engineering | OXIDE-P1-002 | Runtime fails closed for guarded operations; no silent fallback     |
| OXIDE-P2-003 | Extend lineage/task events with role, stage, and policy decision annotations | ToM Engineering | OXIDE-P2-001 | Lineage events include `stage`, `authority`, and decision rationale |

### Phase 3 — O.X.I.D.E Rust Runtime Completion

| Ticket ID    | Task                                                                              | Owner            | Depends On   | Acceptance Criteria                                                     |
| ------------ | --------------------------------------------------------------------------------- | ---------------- | ------------ | ----------------------------------------------------------------------- |
| OXIDE-P3-001 | Add Rust-side Ollama adapter with deterministic limits (temp/token/retry/timeout) | Runtime Operator | None         | `cargo check` and `cargo clippy` pass; adapter config validated         |
| OXIDE-P3-002 | Implement safe-mode no-op fallback on inference failure                           | Runtime Operator | OXIDE-P3-001 | Inference failure cannot trigger autonomous change path                 |
| OXIDE-P3-003 | Add telemetry fields (`determinism`, `retryCount`, `latencyMs`, `correlationId`)  | Runtime Operator | OXIDE-P3-001 | Telemetry payload includes all required fields in success/failure paths |

### Phase 4 — Promotion Evidence + Operational Readiness

| Ticket ID    | Task                                                                        | Owner           | Depends On   | Acceptance Criteria                                       |
| ------------ | --------------------------------------------------------------------------- | --------------- | ------------ | --------------------------------------------------------- |
| OXIDE-P4-001 | Capture build/lint/policy simulation evidence and attach to build instance  | ToM Engineering | OXIDE-P2-003 | Verification log updated with dated PASS outputs          |
| OXIDE-P4-002 | Produce debrief + handoff package for governance ownership                  | ToM Engineering | OXIDE-P4-001 | Debrief and handoff docs created and linked               |
| OXIDE-P4-003 | Execute final Go/No-Go gate and mark plan status COMPLETE when criteria met | Repo Admin      | OXIDE-P4-002 | Success criteria checklist fully satisfied and signed off |

---

## 4) Current Priority Queue

1. OXIDE-P1-001
2. OXIDE-P1-002
3. OXIDE-P1-003
4. OXIDE-P2-001
5. OXIDE-P2-002

---

## 5) Validation Commands

- `npm run build`
- `npm run lint:all`
- `npm run oxide:validate-proposal`
- `npm run oxide:policy-sim`
- `npm run lint:md -- docs/plans/Plan-OXIDE_Implementation_Backlog.md docs/build/Build_Instance_OXIDE_Skill_to_Logic.md docs/plans/Plan-O.X.I.D.E_archeticture.md`

---

## 6) Completion Definition (R-008)

R-008 is complete when:

- A phase backlog exists with ticket IDs, dependencies, and acceptance criteria.
- Backlog is linked from the parent architecture plan and build instance.
- Validation commands pass and evidence is recorded in the build verification log.

---

## 7) Ticket Execution Status

| Ticket ID    | Status   | Completed On | Evidence                                                                 |
| ------------ | -------- | ------------ | ------------------------------------------------------------------------ |
| OXIDE-P1-001 | Complete | 2026-02-19   | `src/core/identityBinder.ts`                                             |
| OXIDE-P1-002 | Complete | 2026-02-19   | `src/core/brain.ts`                                                      |
| OXIDE-P1-003 | Complete | 2026-02-19   | `src/integrations/runtimeMemoryStore.ts`, `src/sdk/types.ts`             |
| OXIDE-P2-001 | Complete | 2026-02-19   | `src/core/oxideGovernance.ts`, `src/core/brain.ts`                       |
| OXIDE-P2-002 | Complete | 2026-02-19   | `src/core/identityBinder.ts`, `src/core/brain.ts`                        |
| OXIDE-P2-003 | Complete | 2026-02-19   | `src/core/brain.ts`, `src/integrations/runtimeMemoryStore.ts`, SDK types |
| OXIDE-P3-001 | Complete | 2026-02-19   | `oxide-brain/src/ollama/mod.rs`, `oxide-brain/src/lib.rs`                |
| OXIDE-P3-002 | Complete | 2026-02-19   | `oxide-brain/src/ollama/mod.rs` (safe-mode no-op fallback)               |
| OXIDE-P3-003 | Complete | 2026-02-19   | `oxide-brain/src/telemetry/mod.rs`, `oxide-brain/src/ollama/mod.rs`      |
| OXIDE-P4-001 | Complete | 2026-02-19   | Consolidated evidence run captured in build verification log               |
| OXIDE-P4-002 | Complete | 2026-02-19   | `docs/debriefs/OXIDE_Skill_to_Logic_Debrief.md`, `docs/handoffs/OXIDE_Skill_to_Logic_Handoff.md` |
| OXIDE-P4-003 | Complete (NO-GO) | 2026-02-19   | Final gate decision recorded in `docs/build/Build_Instance_OXIDE_Skill_to_Logic.md` section 9.1 |
