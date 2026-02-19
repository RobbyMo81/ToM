# Build Plan Instance — O.X.I.D.E Skill-to-Logic Promotion Pipeline

- Built From Template: `Build_OneTask_Template.md`
- Date: 2026-02-18
- Owner: ToM Engineering
- Related Issue/Request: Design a rough-draft architecture for governed self-improvement CI/CD using helper agent O.X.I.D.E
- Target Branch: `main`
- Last Updated: 2026-02-18
- Source Architecture: `../plans/Plan-O.X.I.D.E_archeticture.md`

---

## 0) Metadata

- Build Name: O.X.I.D.E Skill-to-Logic Promotion v0 Draft
- Date: 2026-02-18
- Owner: ToM Engineering
- Related Issue/Request: Convert learned skills into safely governed code/config proposals
- Target Branch: main
- Last Updated: 2026-02-19

### 0.1) Promotion Record

- Promoted On: 2026-02-19
- Promoted By: ToM Engineering
- Promotion Basis: ToM Methodology Standard v1.1+
- Promotion State: promoted

---

## 1) Objective

Define a governed pipeline where ToM can transform newly learned skills into candidate logic changes through O.X.I.D.E, then promote only validated and policy-approved changes.

- Objective:
  - Implement a dual-brain self-improvement flow: host brain discovers skills, O.X.I.D.E synthesizes deterministic proposals.
  - Enforce CI gates + policy/risk gates before any merge/deploy.
  - Keep autonomous mutation disabled; only governed promotion is allowed.
- Non-goals:
  - No direct self-modification without review gates.
  - No autonomous model upgrades/downloads.
  - No bypass of branch protection / required checks.

---

## 2) Requirements Matrix (Must-Have)

| Req ID | Requirement                                                                                            | Scope (files/systems)                                                      | Validation Command                  | Evidence Artifact                               | Status      |
| ------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------- | ----------- |
| R-001  | Define end-to-end skill-to-logic workflow states (`discover → propose → validate → approve → promote`) | `docs/plans/Plan-O.X.I.D.E_archeticture.md`, `src/core/oxideGovernance.ts` | `npm run lint:md`                   | state diagram + canonical workflow interfaces   | Complete    |
| R-002  | Define O.X.I.D.E helper-agent responsibilities and limits                                              | `docs/plans/Plan-O.X.I.D.E_archeticture.md`, `src/core/oxideGovernance.ts` | `npm run lint:md`                   | dual-brain role contract matrix + authority map | Complete    |
| R-003  | Define deterministic proposal format (structured JSON patch intent)                                    | `src/core/oxideGovernance.ts`, proposal payload lifecycle                  | `npm run oxide:validate-proposal`   | typed payload + schema validator                | Complete    |
| R-004  | Define CI validation contract for proposals                                                            | GitHub workflow + local scripts                                            | `npm run build && npm run lint:all` | required checks list + pass/fail rules          | In Progress |
| R-005  | Define risk/policy gate levels and escalation paths                                                    | `src/core/oxideGovernance.ts`, policy decisions in cycle                   | `npm run oxide:policy-sim`          | deterministic risk/policy simulation output     | In Progress |
| R-006  | Define safe fallback/no-op behavior when Ollama or policy services fail                                | `src/core/brain.ts`, O.X.I.D.E runtime behavior spec                       | `npm run oxide:policy-sim`          | blocked promotion path when policy fails        | In Progress |
| R-007  | Define observability/audit requirements for each stage                                                 | telemetry/audit docs + runtime lineage store                               | `npm run lint:all`                  | workflow/proposal/validation lineage events     | In Progress |
| R-008  | Produce rough-draft implementation backlog by phase                                                    | `docs/plans/Plan-OXIDE_Implementation_Backlog.md`                          | `npm run lint:md`                   | ticketed phase backlog with dependencies        | Complete    |
| R-009  | Define shared runtime SQL memory schema including behavior/personality state                           | `docs/reference/Runtime_Memory_DB_Schema_v1.md`                            | `npm run lint:md`                   | reviewed DDL + entity coverage map              | Not Started |

Status values: Not Started / In Progress / Complete / Blocked

---

## 3) Recommendations Matrix (Should-Have)

| Rec ID  | Recommendation                                                | Why it matters                                                 | Priority | Implemented or Deferred            | Owner            |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------- | -------- | ---------------------------------- | ---------------- |
| REC-001 | Add cryptographic signature verification for proposal bundles | Prevents tampering between propose/validate/promote stages     | High     | Deferred (v1 hardening)            | ToM Engineering  |
| REC-002 | Require two-person approval for high-risk promotions          | Reduces single-operator escalation risk                        | High     | Deferred (org policy rollout)      | Repo Admin       |
| REC-003 | Add replayable simulation mode for proposal decisions         | Enables deterministic audits and debugging                     | High     | Planned (v1 scope)                 | ToM Engineering  |
| REC-004 | Add model pinning + checksum enforcement in O.X.I.D.E runtime | Controls LLM drift and supply-chain risk                       | High     | Planned (v1 scope)                 | Runtime Operator |
| REC-005 | Add progressive rollout/canary for accepted logic changes     | Limits blast radius for bad promotions                         | Medium   | Deferred (post-v1 deploy maturity) | ToM Engineering  |
| REC-006 | Add rollback playbook + automatic rollback triggers           | Shortens incident recovery time                                | High     | Planned (v1 scope)                 | ToM Engineering  |
| REC-007 | Add CI parity check for commitlint + policy schema checks     | Keeps local/CI governance behavior aligned                     | Medium   | Deferred (CI increment)            | ToM Engineering  |
| REC-008 | Add red-team skill-injection tests                            | Validates resistance to prompt-injection style skill poisoning | High     | Deferred (security phase)          | Security Owner   |

Rule: Every recommendation must be either implemented or explicitly deferred with rationale.

---

## 4) Quality Gate Contract

Define required checks for this build.

- Build: `npm run build`
- Lint: `npm run lint`
- Markdown Lint: `npm run lint:md`
- Format Check: `npm run format:check`
- Aggregate Gate: `npm run lint:all`
- Additional test/smoke commands:
  - Dry-run proposal schema validation: `npm run oxide:validate-proposal`
  - Dry-run policy decision simulation: `npm run oxide:policy-sim`

Pass criteria:

- All required gates are green.
- Draft architecture defines explicit no-op fallback and governance boundaries.
- Promotion path cannot bypass CI + policy + approval gates.

---

## 5) CI and Policy Requirements

- CI workflow path: `.github/workflows/ci.yml` (+ future `oxide-governance.yml`)
- CI required jobs/check names:
  - `build-and-lint`
  - `oxide-policy-check` (future)
  - `oxide-proposal-validate` (future)
- Branch protection requirements:
  - Require pull request before merge
  - Require status checks before merge
  - Required checks list includes governance checks above
  - Strict up-to-date mode: Yes

---

## 6) External Actions Register

Track actions that cannot be completed by code edits alone.

| Action ID | Platform/Setting                                          | Required Permission     | Verification Method                            | Owner            | Status  |
| --------- | --------------------------------------------------------- | ----------------------- | ---------------------------------------------- | ---------------- | ------- |
| EA-001    | GitHub branch protection update for new governance checks | Repo admin              | protected-branch settings + blocked merge test | Repo Admin       | Pending |
| EA-002    | Ollama model pinning policy + checksum source-of-truth    | Runtime/infra access    | runtime startup log + checksum audit           | Runtime Operator | Pending |
| EA-003    | Secret management for O.X.I.D.E policy keys/signatures    | Security + infra access | secret scan + runtime secret availability test | Security Owner   | Pending |
| EA-004    | Incident runbook approval for rollback authority          | Ops governance approval | signed runbook review                          | Ops Owner        | Pending |

---

## 7) Risks and Mitigations

| Risk                                     | Impact | Mitigation                                              | Owner           | Status |
| ---------------------------------------- | ------ | ------------------------------------------------------- | --------------- | ------ |
| Skill poisoning leads to unsafe proposal | High   | schema isolation + risk gating + human escalation       | Security Owner  | Open   |
| Non-deterministic O.X.I.D.E outputs      | High   | seed control + low temp + deterministic post-validation | ToM Engineering | Open   |
| CI gate bypass through manual merge      | High   | strict branch protection + required checks              | Repo Admin      | Open   |
| Policy drift between local and CI        | Medium | single-source policy config + CI parity checks          | ToM Engineering | Open   |
| Rollback path not rehearsed              | High   | run quarterly rollback drills with audit evidence       | Ops Owner       | Open   |

---

## 8) Execution Plan

1. Preparation
   - Normalize architecture terms from `Plan-O.X.I.D.E_archeticture.md` into a single pipeline vocabulary.
   - Define proposal schema + risk-level taxonomy.

2. Implementation (design artifacts first)
   - Draft O.X.I.D.E role contract and dual-brain authority matrix.
   - Draft proposal JSON schema and policy decision contract.
   - Draft CI gate additions and promotion workflow.

3. Validation
   - Validate docs against lint/format gates.
   - Run tabletop simulations for success/failure paths.

4. Documentation updates
   - Add operator guide for promotion + rollback.
   - Add audit logging examples and governance checklists.

5. External action handoff
   - Hand branch-protection and runtime policy actions to owners in section 6.

---

## 9) Verification Log

Record exact commands and outcomes.

- `npm run build` → PASS (2026-02-19)
- `npm run lint:all` → PASS (2026-02-19)
- `npm run lint:md` → PASS (2026-02-19)
- `npm run format:check` → PASS (via `lint:all`, 2026-02-19)
- `npm run oxide:validate-proposal` → PASS (2026-02-19)
- `npm run oxide:policy-sim` → PASS (nominal pass + zero-index block, 2026-02-19)
- `npm run lint:md -- docs/plans/Plan-O.X.I.D.E_archeticture.md docs/build/Build_Instance_OXIDE_Skill_to_Logic.md` → PASS (2026-02-19)
- `npm run lint:md -- docs/plans/Plan-OXIDE_Implementation_Backlog.md docs/plans/Plan-O.X.I.D.E_archeticture.md docs/build/Build_Instance_OXIDE_Skill_to_Logic.md` → PASS (2026-02-19)
- `npm run build && npm run lint:all` → PASS after `src/core/identityBinder.ts` add (2026-02-19)
- `npm run build && npm run lint:all` → PASS after `src/core/brain.ts` identity binding in `runCycle/query/generate` (2026-02-19)
- `npm run build && npm run lint:all` → PASS after lineage identity surfacing (`src/integrations/runtimeMemoryStore.ts`, SDK types) (2026-02-19)
- `npm run build && npm run lint:all` → PASS after role-routing policy enforcement (`src/core/oxideGovernance.ts`, `src/core/brain.ts`) (2026-02-19)
- `npm run build && npm run lint:all` → PASS after strict identity fail-closed guard (`src/core/identityBinder.ts`, `src/core/brain.ts`) (2026-02-19)
- `npm run build && npm run lint:all` → PASS after lineage/task event annotations (`role`, `stage`, `authority`, `decisionRationale`) (2026-02-19)
- `npm run rust:check && npm run rust:lint` → PASS after Rust Ollama adapter config caps (`oxide-brain/src/ollama/mod.rs`) (2026-02-19)
- `cargo test --manifest-path oxide-brain/Cargo.toml` → PASS (2 adapter unit tests) (2026-02-19)
- `cargo test --manifest-path oxide-brain/Cargo.toml` → PASS (safe-mode fallback tests included) (2026-02-19)
- `cargo test --manifest-path oxide-brain/Cargo.toml` → PASS (telemetry fields validated for success/failure outcomes) (2026-02-19)
- `npm run build && npm run lint:all && npm run oxide:validate-proposal && npm run oxide:policy-sim && npm run rust:check && npm run rust:lint && cargo test --manifest-path oxide-brain/Cargo.toml && npm run lint:md -- docs/plans/Plan-OXIDE_Implementation_Backlog.md docs/build/Build_Instance_OXIDE_Skill_to_Logic.md` → PASS (consolidated P4-001 evidence capture, 2026-02-19)

## 9.1) Final Go/No-Go Decision (P4-003)

- Decision: **NO-GO** (2026-02-19)
- Decision Owner: Repo Admin (recorded by ToM Engineering)
- Rationale:
  - Must-have requirements are not fully complete (`R-004`, `R-005`, `R-006`, `R-007`, `R-009`).
  - External governance actions remain pending (`EA-001` through `EA-004`).
  - Definition-of-Done checklist is not yet fully satisfied.
- Next actions before GO:
  - Close remaining requirements and update their evidence artifacts.
  - Complete external action verification with owners.
  - Re-run consolidated evidence command and reassess gate.

---

## 10) Completion Matrix (Plan → TODO → Evidence)

| Plan Area                    | TODO/Task Ref | Status      | Evidence                                          |
| ---------------------------- | ------------- | ----------- | ------------------------------------------------- |
| Workflow state machine       | R-001         | Complete    | section 13.5.1 + `OXIDE_WORKFLOW_STAGES`          |
| Dual-brain role contract     | R-002         | Complete    | section 13.5.2 + `OXIDE_ROLE_CONTRACTS`           |
| Proposal schema and examples | R-003         | Complete    | `src/core/oxideGovernance.ts`                     |
| CI policy gate definition    | R-004         | In Progress | build + lint gate evidence                        |
| Risk escalation design       | R-005         | In Progress | `npm run oxide:policy-sim` output                 |
| Fallback/no-op logic         | R-006         | In Progress | policy-block behavior in cycle flow               |
| Audit/telemetry plan         | R-007         | In Progress | runtime lineage tables and task events            |
| Phase backlog                | R-008         | Complete    | `docs/plans/Plan-OXIDE_Implementation_Backlog.md` |
| Runtime SQL memory schema    | R-009         | Not Started | v1 DDL with behavior/personality tables           |

Backlog execution progress:

- OXIDE-P1-001 complete (`src/core/identityBinder.ts`)
- OXIDE-P1-002 complete (`src/core/brain.ts`)
- OXIDE-P1-003 complete (`src/integrations/runtimeMemoryStore.ts`, `src/sdk/types.ts`)
- OXIDE-P2-001 complete (`src/core/oxideGovernance.ts`, `src/core/brain.ts`)
- OXIDE-P2-002 complete (`src/core/identityBinder.ts`, `src/core/brain.ts`)
- OXIDE-P2-003 complete (`src/core/brain.ts`, `src/integrations/runtimeMemoryStore.ts`, SDK types)
- OXIDE-P3-001 complete (`oxide-brain/src/ollama/mod.rs`, `oxide-brain/src/lib.rs`)
- OXIDE-P3-002 complete (`oxide-brain/src/ollama/mod.rs` safe-mode no-op fallback)
- OXIDE-P3-003 complete (`oxide-brain/src/telemetry/mod.rs`, `oxide-brain/src/ollama/mod.rs`)
- OXIDE-P4-001 complete (consolidated evidence run captured in section 9)
- OXIDE-P4-002 complete (`docs/debriefs/OXIDE_Skill_to_Logic_Debrief.md`, `docs/handoffs/OXIDE_Skill_to_Logic_Handoff.md`)
- OXIDE-P4-003 complete (NO-GO decision recorded in section 9.1; closeout remains pending)

---

## 11) Definition of Done (Build-Level)

- [ ] All Must-Have requirements complete
- [ ] All required quality gates pass
- [ ] Recommendations implemented or explicitly deferred
- [ ] CI reflects required checks
- [ ] External actions listed with owners
- [x] Verification log completed
- [x] Debrief produced
- [ ] Methodology standard compliance confirmed (`docs/reference/ToM_Methodology_Standard.md`)
- [ ] Promotion Record completed and accurate

---

## 12) Debrief Output

- Debrief filename: `../debriefs/OXIDE_Skill_to_Logic_Debrief.md` (produced)
- Handoff filename: `../handoffs/OXIDE_Skill_to_Logic_Handoff.md` (produced)
- Summary of delivered outcomes:
  - O.X.I.D.E-governed skill-to-logic promotion workflow defined
  - dual-brain authority boundaries formalized
  - CI + policy + approval gates specified
- Follow-up recommendations:
  - add red-team simulation harness
  - add signature verification path
  - add canary/rollback automation
- Deferred items and owners:
  - branch-protection updates (`Repo Admin`)
  - runtime model pinning operations (`Runtime Operator`)
  - secret/key governance (`Security Owner`)
