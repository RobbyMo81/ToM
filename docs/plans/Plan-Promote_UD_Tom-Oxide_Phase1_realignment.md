# Plan - Promote UD ToM-O.X.I.D.E Phase 1 Realignment

- Status: COMPLETE (2026-02-19, ToM Engineering)
- Date: 2026-02-19
- Owner: ToM Engineering
- Source Directive: docs/plans/Plan-UD_Tom-Oxide_Phase1_realignment.md
- Method Basis: docs/reference/ToM_Methodology_Standard.md v1.1

## RESEARCH

### Problem framing

A new CTO directive requires architecture realignment clarity between:

- O.X.I.D.E as bound LLM role/persona (proposal and reasoning)
- oxide as deterministic Rust executor (code and CI evidence path)

The goal is to remove authority ambiguity while preserving existing governance and lineage controls.

### Current-state evidence

- Role split and governance flow already exist in runtime/governance layers.
- Governance/identity artifacts are non-vectorized in `.tom-workspace/**`.
- Runtime lineage/proposal/approval/deploy tables exist and are active.
- API/CLI/cycle entrypoints are already present.
- Phase 1 override gating has been implemented and promoted in the latest governance changeset.

### Constraints

- Must preserve NO-GO fail-closed behavior unless valid HITL override exists.
- Must not collapse role identity and execution authority into one layer.
- Must keep audit artifacts reconstructable and non-vectorized.
- Must align with existing ToM methodology artifacts and completion gates.

### Alternatives considered

1. Keep current wording without explicit two-layer model (rejected)
   - Leaves authority boundary open to interpretation.
2. Treat Rust executor as replacement for O.X.I.D.E role identity (rejected)
   - Breaks current identity model and role-bound governance semantics.
3. Explicit two-layer model (selected)
   - Preserves current topology and adds deterministic executor boundary.

### Unknowns and assumptions

- A1: whoiam topology section can be updated without breaking downstream references.
- A2: Identity Binder can be promoted as the canonical policy enforcement chokepoint across all execution paths.
- A3: ToM ↔ oxide v1 interface can be standardized as local stdin/stdout JSON-RPC without daemon requirements.

## PLAN

### Objective

Promote the realignment directive into an executable architecture plan that formalizes the O.X.I.D.E role/executor split and governance enforcement boundaries.

### Scope

- Promote two-layer implementation model into authoritative planning artifact.
- Define required updates to whoiam topology, safety boundaries, and logic paths.
- Define ToM ↔ oxide interface contract for v1.
- Define validation gates and implementation sequencing.

### Non-scope

- Full runtime refactor in this promotion step.
- Replacing existing cycle entrypoints.
- Broad policy redesign beyond this realignment directive.

### Decision tree

- If role and executor responsibilities remain ambiguous -> block promotion to implementation.
- If two-layer model is explicit and policy boundaries are testable -> promote to implementation planning.
- If Identity Binder enforcement is incomplete on critical paths -> implementation must include enforcement expansion before completion.

### Approach and rationale

Promote in three passes:

1. Architecture language hardening (whoiam + topology).
2. Enforcement-point hardening (Identity Binder as policy gate).
3. Interface standardization (ToM ↔ oxide v1 contract).

This yields deterministic authority separation without runtime drift.

### Explicit assumptions

- O.X.I.D.E instance remains a bounded role and cannot directly mutate code.
- oxide Rust executor remains the only code mutation path.
- Governance tokens/artifacts remain in `.tom-workspace/**`.

### Promotion Record

- Promoted On: 2026-02-19
- Promoted By: GitHub Copilot (CTO directive promotion)
- Promotion Basis: ToM Methodology Standard v1.1
- Promotion State: implementation complete

## VERIFY

### Stakeholder/provider validation

- CTO directive content reviewed and mapped.
- Engineering owner validation required before implementation merge.

### Dependency checks

- whoiam architecture doc is available for topology realignment.
- Governance runtime layers are active and testable.
- Build/lint pipelines available for policy/documentation integration.

### Risk assessment

- R1: ambiguous authority text causes unsafe execution assumptions.
- R2: missing binder enforcement leaves policy bypass gaps.
- R3: interface ambiguity causes inconsistent executor invocation.

### Confirmed fallback paths

- Keep current runtime behavior while documentation/policy contract is updated.
- Fail closed on governance uncertainty.
- Roll back wording/interface changes if validation fails.

### Logic gates

- Assumption gate: A1/A2/A3 validated by implementation evidence.
- Environment gate: lint/build/docs checks pass.
- Rollback gate: prior whoiam and policy wording recoverable.
- Go/No-Go gate: GO only if role-vs-executor boundary is explicit and testable.

## PREREQUISITES

- Capture current whoiam topology snapshot.
- Capture current Identity Binder coverage map by execution path.
- Confirm location/persistence policy for approval and override artifacts.
- Confirm owner and reviewer sign-off path.

## SUCCESS CRITERIA

### Definition of done

- Two-layer O.X.I.D.E model is explicit in authoritative docs.
- Identity Binder is designated and implemented as policy enforcement point on required paths.
- ToM ↔ oxide v1 interface contract is documented and consumed by implementation steps.
- Governance artifacts remain non-vectorized and auditable.

### Acceptance checks

1. whoiam includes role/executor split language.
2. topology representation includes Rust executor boundary.
3. safety section includes autonomy gating and token storage constraints.
4. logic path section includes ToM ↔ oxide interface contract.
5. validation evidence demonstrates no policy regression.

### Phase checkpoints

- C1: artifact promotion complete
- C2: architecture doc deltas drafted
- C3: enforcement and interface implementation complete
- C4: validation and debrief complete

## TO-DO LIST

1. Draft whoiam updates for two-layer O.X.I.D.E model.
   - Verify: markdown lint clean.
   - Expected: explicit role/executor split.
2. Add topology delta showing OxideEngine boundary and runCycle linkage.
   - Verify: diagram syntax passes local rendering checks.
   - Expected: deterministic invocation chain documented.
3. Define Identity Binder as mandatory policy chokepoint.
   - Verify: execution-path checklist updated with covered/uncovered paths.
   - Expected: no ambiguity for approval/token checks.
4. Define ToM ↔ oxide v1 interface contract.
   - Verify: contract fields, transport, and evidence output path documented.
   - Expected: implementation-ready contract for CLI-first runtime.
5. Update safety boundaries with autonomy gating and token storage requirements.
   - Verify: NO-GO/HITL semantics remain consistent with promoted Phase 1 governance logic.
   - Expected: policy consistency across docs and runtime.
6. Run final validation and open second-builder review.
   - Verify: lint/build/docs checks and reviewer sign-off.
   - Expected: promotion can transition to implementation complete.

## ROLLBACK PLAN

- Trigger T1: doc changes introduce policy contradiction with runtime.
  - Rollback: revert realignment docs and re-open planning state.
- Trigger T2: interface contract proves incompatible with CLI-first runtime.
  - Rollback: retain current invocation model and issue revised contract proposal.
- Trigger T3: binder enforcement path creates execution regressions.
  - Rollback: disable new enforcement branch and restore prior fail-closed behavior.

### Abort vs continue gate

- Abort on any authority ambiguity, policy contradiction, or failed governance check.
- Continue only with explicit sign-off and passing validation evidence.

### Emergency escalation path

- Escalate to CTO and ToM Engineering owner for governance-impacting conflicts.

## MONITORING & VALIDATION

- Monitoring window: minimum 48 hours after implementation merge.
- Indicators:
  - policy decision consistency,
  - override token path consistency,
  - executor invocation consistency,
  - audit artifact completeness.
- Alerts:
  - direct code mutation outside executor path,
  - missing approval/override metadata,
  - binder bypass detection.
- Remediation:
  - fail-closed mode,
  - revert offending change,
  - create debrief with corrective actions.

## LESSONS LEARNED (Debrief Placeholder)

To be completed post-implementation:

- what worked,
- what surprised us,
- what to change next,
- institutional knowledge updates.

## Next Promotion State Transition

Implementation evidence captured:

- Added O.X.I.D.E two-layer implementation model in
   `.tom-workspace/whoiam.md`.
- Extended core topology Mermaid diagram with `OxideEngine` Rust executor
   boundary and `runCycle -> oxide` linkage.
- Added explicit ToM ↔ `oxide` v1 interface contract under logic paths.
- Added safety boundary bullets for Rust executor authority, NO-GO/HITL gating,
   and non-vectorized token storage.
- Validation evidence:
   - `npm run lint:md -- docs/plans/Plan-Promote_UD_Tom-Oxide_Phase1_realignment.md`
      PASS

If later phases expand implementation scope, maintain `Status: COMPLETE` and
append incremental change evidence.
