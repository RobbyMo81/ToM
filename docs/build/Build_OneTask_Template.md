# Build Plan Template — One-Task Requirements + Recommendations

- Purpose: Ensure a single build task captures all required deliverables, quality gates, recommendations, evidence, and external actions.
- Usage: Copy this file for each new build effort and complete every section before execution.

---

## 0) Metadata

- Build Name:
- Date:
- Owner:
- Related Issue/Request:
- Target Branch:
- Last Updated:

---

## 1) Objective

State the business/technical outcome in 1–3 sentences.

- Objective:
- Non-goals:

---

## 2) Requirements Matrix (Must-Have)

| Req ID | Requirement | Scope (files/systems) | Validation Command | Evidence Artifact | Status      |
| ------ | ----------- | --------------------- | ------------------ | ----------------- | ----------- |
| R-001  |             |                       |                    |                   | Not Started |
| R-002  |             |                       |                    |                   | Not Started |

Status values: Not Started / In Progress / Complete / Blocked

---

## 3) Recommendations Matrix (Should-Have)

| Rec ID  | Recommendation | Why it matters | Priority     | Implemented or Deferred | Owner |
| ------- | -------------- | -------------- | ------------ | ----------------------- | ----- |
| REC-001 |                |                | High/Med/Low |                         |       |
| REC-002 |                |                | High/Med/Low |                         |       |

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

Pass criteria:

- All required gates are green.
- Any failing gate is fixed or formally deferred with risk acceptance.

---

## 5) CI and Policy Requirements

- CI workflow path:
- CI required jobs/check names:
- Branch protection requirements:
  - Require pull request before merge
  - Require status checks before merge
  - Required checks list
  - Strict up-to-date mode (yes/no)

---

## 6) External Actions Register

Track actions that cannot be completed by code edits alone.

| Action ID | Platform/Setting | Required Permission | Verification Method | Owner | Status  |
| --------- | ---------------- | ------------------- | ------------------- | ----- | ------- |
| EA-001    |                  |                     |                     |       | Pending |
| EA-002    |                  |                     |                     |       | Pending |

---

## 7) Risks and Mitigations

| Risk | Impact | Mitigation | Owner | Status |
| ---- | ------ | ---------- | ----- | ------ |
|      |        |            |       | Open   |

---

## 8) Execution Plan

1. Preparation
2. Implementation
3. Validation
4. Documentation updates
5. External action handoff

---

## 9) Verification Log

Record exact commands and outcomes.

- `command` → PASS/FAIL
- `command` → PASS/FAIL

---

## 10) Completion Matrix (Plan → TODO → Evidence)

| Plan Area | TODO/Task Ref | Status | Evidence |
| --------- | ------------- | ------ | -------- |
|           |               |        |          |

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

- Debrief filename:
- Summary of delivered outcomes:
- Follow-up recommendations:
- Deferred items and owners:
