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
- Last Updated: 2026-02-18

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

| Req ID | Requirement | Scope (files/systems) | Validation Command | Evidence Artifact | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Define end-to-end skill-to-logic workflow states (`discover → propose → validate → approve → promote`) | O.X.I.D.E architecture docs | `npm run lint:md` | workflow state diagram + sequence section | Not Started |
| R-002 | Define O.X.I.D.E helper-agent responsibilities and limits | `docs/plans/Plan-O.X.I.D.E_archeticture.md`, this build plan | `npm run lint:md` | role contract matrix (host brain vs O.X.I.D.E) | Not Started |
| R-003 | Define deterministic proposal format (structured JSON patch intent) | proposed schema docs + policy docs | schema validation dry-run command | sample proposal payloads | Not Started |
| R-004 | Define CI validation contract for proposals | GitHub workflow + local scripts | `npm run build && npm run lint:all` | required checks list + pass/fail rules | Not Started |
| R-005 | Define risk/policy gate levels and escalation paths | policy module design docs | policy simulation script (future) | risk classification matrix + approvals table | Not Started |
| R-006 | Define safe fallback/no-op behavior when Ollama or policy services fail | O.X.I.D.E runtime behavior spec | failure-mode tabletop tests (future) | fail-safe decision table | Not Started |
| R-007 | Define observability/audit requirements for each stage | telemetry/audit docs | lint/docs checks | audit event schema + examples | Not Started |
| R-008 | Produce rough-draft implementation backlog by phase | planning/TODO artifacts | lint/docs checks | prioritized phase backlog | Not Started |
| R-009 | Define shared runtime SQL memory schema including behavior/personality state | `docs/reference/Runtime_Memory_DB_Schema_v1.md` | `npm run lint:md` | reviewed DDL + entity coverage map | Not Started |

Status values: Not Started / In Progress / Complete / Blocked

---

## 3) Recommendations Matrix (Should-Have)

| Rec ID | Recommendation | Why it matters | Priority | Implemented or Deferred | Owner |
| --- | --- | --- | --- | --- | --- |
| REC-001 | Add cryptographic signature verification for proposal bundles | Prevents tampering between propose/validate/promote stages | High | Deferred (v1 hardening) | ToM Engineering |
| REC-002 | Require two-person approval for high-risk promotions | Reduces single-operator escalation risk | High | Deferred (org policy rollout) | Repo Admin |
| REC-003 | Add replayable simulation mode for proposal decisions | Enables deterministic audits and debugging | High | Planned (v1 scope) | ToM Engineering |
| REC-004 | Add model pinning + checksum enforcement in O.X.I.D.E runtime | Controls LLM drift and supply-chain risk | High | Planned (v1 scope) | Runtime Operator |
| REC-005 | Add progressive rollout/canary for accepted logic changes | Limits blast radius for bad promotions | Medium | Deferred (post-v1 deploy maturity) | ToM Engineering |
| REC-006 | Add rollback playbook + automatic rollback triggers | Shortens incident recovery time | High | Planned (v1 scope) | ToM Engineering |
| REC-007 | Add CI parity check for commitlint + policy schema checks | Keeps local/CI governance behavior aligned | Medium | Deferred (CI increment) | ToM Engineering |
| REC-008 | Add red-team skill-injection tests | Validates resistance to prompt-injection style skill poisoning | High | Deferred (security phase) | Security Owner |

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
  - Dry-run proposal schema validation (future command: `npm run oxide:validate-proposal -- --dry-run`)
  - Dry-run policy decision simulation (future command: `npm run oxide:policy-sim`)

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

| Action ID | Platform/Setting | Required Permission | Verification Method | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| EA-001 | GitHub branch protection update for new governance checks | Repo admin | protected-branch settings + blocked merge test | Repo Admin | Pending |
| EA-002 | Ollama model pinning policy + checksum source-of-truth | Runtime/infra access | runtime startup log + checksum audit | Runtime Operator | Pending |
| EA-003 | Secret management for O.X.I.D.E policy keys/signatures | Security + infra access | secret scan + runtime secret availability test | Security Owner | Pending |
| EA-004 | Incident runbook approval for rollback authority | Ops governance approval | signed runbook review | Ops Owner | Pending |

---

## 7) Risks and Mitigations

| Risk | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- |
| Skill poisoning leads to unsafe proposal | High | schema isolation + risk gating + human escalation | Security Owner | Open |
| Non-deterministic O.X.I.D.E outputs | High | seed control + low temp + deterministic post-validation | ToM Engineering | Open |
| CI gate bypass through manual merge | High | strict branch protection + required checks | Repo Admin | Open |
| Policy drift between local and CI | Medium | single-source policy config + CI parity checks | ToM Engineering | Open |
| Rollback path not rehearsed | High | run quarterly rollback drills with audit evidence | Ops Owner | Open |

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

- `npm run build` → PENDING
- `npm run lint:all` → PENDING
- `npm run lint:md` → PENDING
- `npm run format:check` → PENDING

---

## 10) Completion Matrix (Plan → TODO → Evidence)

| Plan Area | TODO/Task Ref | Status | Evidence |
| --- | --- | --- | --- |
| Workflow state machine | R-001 | Not Started | architecture flow diagram |
| Dual-brain role contract | R-002 | Not Started | authority matrix |
| Proposal schema and examples | R-003 | Not Started | schema + sample proposals |
| CI policy gate definition | R-004 | Not Started | workflow yaml + check names |
| Risk escalation design | R-005 | Not Started | risk table + approvals |
| Fallback/no-op logic | R-006 | Not Started | failure-mode matrix |
| Audit/telemetry plan | R-007 | Not Started | event schema |
| Phase backlog | R-008 | Not Started | implementation milestone list |
| Runtime SQL memory schema | R-009 | Not Started | v1 DDL with behavior/personality tables |

---

## 11) Definition of Done (Build-Level)

- [ ] All Must-Have requirements complete
- [ ] All required quality gates pass
- [ ] Recommendations implemented or explicitly deferred
- [ ] CI reflects required checks
- [ ] External actions listed with owners
- [ ] Verification log completed
- [ ] Debrief produced

---

## 12) Debrief Output

- Debrief filename: `../debriefs/OXIDE_Skill_to_Logic_Debrief.md`
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
