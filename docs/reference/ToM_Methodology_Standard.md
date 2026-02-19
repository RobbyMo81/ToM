# ToM Methodology Standard

## Preamble (Living Standard)

This is a living document. It must be continuously tested, reviewed, and updated as new information is discovered.

All teams and agents using this standard are responsible for:

- validating that workflow logic still reflects current runtime behavior,
- updating requirements and gates when new constraints or evidence appear,
- recording revisions so plan-to-implementation quality remains accurate and auditable.

- Status: STANDARD
- Version: 1.1
- Effective Date: 2026-02-18
- Owner: ToM Engineering
- Supersedes: conversational draft guidance in this file

---

## 1) Purpose

This standard defines the required execution lifecycle for ToM project work so that delivery is:

- planned and deterministic,
- auditable and reversible,
- validated before and after implementation,
- continuously improved through debrief capture.

This standard applies to infrastructure, runtime, data, policy, and architecture initiatives.

---

## 2) Required Lifecycle

Every implementation effort must follow all sections below in order.

1. Research
2. Plan
3. Verify
4. Prerequisites
5. Success Criteria
6. To-Do List (Execution Plan)
7. Rollback Plan
8. Monitoring & Validation
9. Lessons Learned (Debrief)

No phase may be skipped.

---

## 3) Section Requirements

### 3.1 Research

Must include:

- problem framing (what is changing and why),
- current-state evidence (code/docs/runtime behavior),
- constraints (policy, tooling, environment, timeline),
- alternatives considered and decision rationale,
- unknowns and assumptions requiring verification.

Research output must be traceable to concrete evidence (files, commands, observed behavior).

### 3.2 Plan

Must include:

- Objective (one sentence)
- Scope and non-scope
- Decision tree (if/then branches)
- Approach and rationale
- Explicit assumptions
- Promotion Record block with:
  - Promoted On
  - Promoted By
  - Promotion Basis (methodology version)
  - Promotion State (format promoted vs implementation complete)

### 3.3 Verify

Must include:

- Stakeholder/provider validation
- Dependency checks
- Risk assessment
- Confirmed fallback paths

Verify must also include explicit logic gates:

- assumption validation (proven true/false),
- environment readiness (tools/services/access),
- rollback readiness (tested or procedurally confirmed),
- go/no-go decision with rationale.

### 3.4 Prerequisites

Must include:

- Backup/snapshot confirmation
- Current-state capture (before-state)
- Access path validation (primary + fallback)
- Required approvals/sign-offs

### 3.5 Success Criteria

Must include:

- Definition of done (explicit, testable)
- Acceptance checks with pass/fail conditions
- Phase checkpoints

### 3.6 To-Do List

Must include:

- ordered execution steps,
- verification command(s) per step,
- expected output per step,
- checkpoint status markers.

### 3.7 Rollback Plan

Must include:

- trigger condition per rollback path,
- exact rollback commands/procedure,
- abort-vs-continue decision gate,
- emergency escalation contact path.

### 3.8 Monitoring & Validation

Must include:

- post-change monitoring window (minimum 48 hours unless otherwise justified),
- health indicators and thresholds,
- alert conditions,
- remediation playbook.

### 3.9 Lessons Learned

Must include:

- what worked,
- what failed/surprised,
- what to change next iteration,
- updates to institutional knowledge artifacts.

---

## 4) Required Artifacts

For each initiative, maintain:

- Plan document (under `docs/plans/`)
- Debrief document (under `docs/debriefs/`)
- Handoff record if ownership transfers (under `docs/handoffs/`)
- Validation evidence (commands + outcomes)
- Promotion Record metadata in each promoted plan

Artifacts must be internally consistent and traceable.

---

## 5) Completion Gates

An initiative may be marked complete only when all are true:

- all checklist items are complete,
- success criteria are demonstrated,
- rollback procedures are documented and validated,
- monitoring window is defined and started,
- debrief is recorded.

Recommended completion marker format:

- `Status: COMPLETE (YYYY-MM-DD, Owner)`

---

## 6) Compliance Rules

- No autonomous mutation without policy/approval pathway.
- No undocumented production-impacting changes.
- No claim of completion without validation evidence.
- No closure without debrief update.

Non-compliant work must be returned to planning/execution state.

---

## 7) Operating Template (Canonical)

```text
PROJECT TEMPLATE (ALL SYSTEMS WORK)

RESEARCH
PLAN
VERIFY
PREREQUISITES
SUCCESS CRITERIA
TO-DO LIST
ROLLBACK PLAN
MONITORING & VALIDATION
LESSONS LEARNED
```

---

## 8) Adoption Note

This document is now the standard methodology baseline for ToM planning and delivery workflows.
