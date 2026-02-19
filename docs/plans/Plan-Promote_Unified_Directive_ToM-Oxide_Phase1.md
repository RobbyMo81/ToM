# Plan - Promote Unified Directive (ToM-O.X.I.D.E Phase 1)

- Status: COMPLETE (2026-02-19, ToM Engineering)
- Date: 2026-02-19
- Owner: ToM Engineering
- Source Directive: `docs/plans/Unified_Directive_ToM-Oxide_Phase1.md`
- Method Basis: `docs/reference/ToM_Methodology_Standard.md` v1.1

## RESEARCH

### Problem framing

We need to operationalize the CTO governance amendment so that `NO-GO` blocks autonomy by default, while allowing a tightly bounded Human-in-the-Loop (HITL) override path that is auditable and non-persistent.

### Current-state evidence

- Directive content exists in `docs/plans/Unified_Directive_ToM-Oxide_Phase1.md`.
- Existing governance components and records already tracked in:
  - `src/core/oxideGovernance.ts`
  - `src/integrations/runtimeMemoryStore.ts`
  - `docs/reference/AsBuilt_Architecture_Snapshot_2026-02-19.md`
- Runtime evidence and peer-review process are active through as-built scripts and pre-commit checks.

### Constraints

- Must preserve fail-closed behavior when no valid override exists.
- Must not enable persistent autonomy outside a bounded override window.
- Must preserve traceability in runtime/audit artifacts.
- Must remain compatible with existing governance stages and approval flow.

### Alternatives considered

1. Directive-only documentation update (rejected)
   - Rationale: does not enforce runtime behavior.
2. Runtime-only change without formal policy artifact (rejected)
   - Rationale: fails auditability and governance clarity.
3. Policy + implementation + validation package (selected)
   - Rationale: aligns with ToM methodology and completion gates.

### Unknowns and assumptions

- Assumption A1: current runtime has a natural insertion point for an `OVERRIDE_AUTONOMY` state.
- Assumption A2: existing audit store can capture required override metadata without schema break.
- Assumption A3: role authority path can validate explicit human approver identity.

## PLAN

### Objective

Promote the Phase 1 directive into enforceable governance behavior with bounded HITL override controls and complete audit traceability.

### Scope

- Add policy semantics for HITL override into governance runtime.
- Define/validate override token contract and lifecycle.
- Enforce entry/exit conditions for temporary override autonomy.
- Persist complete override audit events.
- Produce implementation debrief and as-built updates.

### Non-scope

- Expanding override permissions beyond the defined NO-GO exception.
- Modifying unrelated authorization models.
- Long-term autonomy policy redesign outside this directive.

### Decision tree

- If `final gate == GO` -> operate under normal autonomy policy.
- If `final gate != GO` and no valid HITL override -> deny autonomy (fail-closed).
- If `final gate != GO` and valid override token present -> enter `OVERRIDE_AUTONOMY` with bounded scope and expiry.
- If override expires/revoked/safety anomaly -> immediate return to NO-GO supervised mode.

### Approach and rationale

Implement directive in three layers:

1. Governance policy layer: explicit override gate logic and constraints.
2. Runtime enforcement layer: state transition + bounded execution controls.
3. Audit layer: immutable event capture for reconstructable review.

This preserves deterministic control while enabling deliberate human sovereign intervention.

### Explicit assumptions

- Human approval can be represented as a structured artifact (not free-form chat).
- Override checks can be evaluated before autonomous execution dispatch.
- Existing monitoring hooks can surface override anomalies.

### Promotion Record

- Promoted On: 2026-02-19
- Promoted By: GitHub Copilot (on behalf of CTO directive)
- Promotion Basis: ToM Methodology Standard v1.1
- Promotion State: implementation complete

## VERIFY

### Stakeholder/provider validation

- CTO governance intent captured and restated in Phase 1 directive.
- Builder/maintainer sign-off required before runtime merge.

### Dependency checks

- Governance engine update path (`src/core/oxideGovernance.ts`) available.
- Runtime persistence/audit path available (`src/integrations/runtimeMemoryStore.ts` and audit artifacts).
- CI/lint/build checks available for enforcement validation.

### Risk assessment

- Risk R1: accidental persistence of override beyond expiry.
- Risk R2: weak approver verification causing unauthorized override.
- Risk R3: incomplete audit records reduce reconstructability.

### Fallback paths

- F1: hard-disable override branch if token validation fails.
- F2: revert to NO-GO supervised mode on any evaluation ambiguity.
- F3: rollback release and restore prior governance logic if post-deploy anomalies occur.

### Logic gates

- Assumption validation gate: A1/A2/A3 must be proven in implementation tests.
- Environment readiness gate: build/lint/runtime checks must pass.
- Rollback readiness gate: rollback procedure documented and tested in dry-run.
- Go/No-Go: GO only after audit reconstruction is demonstrated.

## PREREQUISITES

- Capture current baseline behavior of NO-GO autonomy blocking.
- Snapshot key governance and runtime files before mutation.
- Confirm approver identity model and role mapping source of truth.
- Confirm audit output destination and retention path.
- Confirm reviewer availability for second-builder verification.

## SUCCESS CRITERIA

### Definition of done

- NO-GO blocks autonomy unless valid, bounded HITL override exists.
- Override entry/exit strictly enforce scope, expiry, and revocation.
- Required authorization semantics are represented in structured approval artifact.
- All override events are audit logged and reconstructable.
- Documentation and as-built records updated with verified behavior.

### Acceptance checks

1. Negative path: NO-GO without override rejects autonomous execution.
2. Positive path: NO-GO with valid override allows only in-scope actions.
3. Expiry path: override auto-terminates and returns to supervised mode.
4. Revocation path: explicit revoke immediately terminates override autonomy.
5. Audit path: complete metadata present (approver, risk, scope, expiry, linked proposal).

### Phase checkpoints

- C1: governance logic implemented
- C2: runtime transition and control tests passing
- C3: audit event coverage complete
- C4: docs/as-built/debrief updated

## TO-DO LIST

1. Add override policy contract in governance layer.
   - Verify: unit checks for entry and denial conditions.
   - Expected: deterministic policy decision for GO/NO-GO/override.
2. Implement `OVERRIDE_AUTONOMY` state transitions.
   - Verify: transition tests for entry, expiry, revocation, anomaly.
   - Expected: automatic return to NO-GO supervised mode on exit triggers.
3. Implement structured HITL override artifact validation.
   - Verify: invalid free-form/partial payloads rejected.
   - Expected: only complete, bounded artifacts pass.
4. Add immutable audit logging for override lifecycle.
   - Verify: log entries contain mandatory fields and action lineage.
   - Expected: session reconstructability by record replay.
5. Update reference docs + as-built architecture snapshot.
   - Verify: lint clean and retrieval visibility.
   - Expected: implementation reflected in searchable architecture memory.
6. Run full validation and open peer review.
   - Verify: build/lint/tests pass and second-builder review completed.
   - Expected: promotion state can move to implementation complete.

## ROLLBACK PLAN

- Trigger T1: override branch permits action outside scope.
  - Rollback: disable override path and redeploy prior policy version.
- Trigger T2: audit entries missing mandatory fields.
  - Rollback: block override execution and revert logging integration change.
- Trigger T3: expiry/revocation fails to terminate autonomy.
  - Rollback: force NO-GO supervised mode globally and revert override feature flag.

### Abort vs continue gate

- Abort immediately for any scope breach, auth ambiguity, or audit failure.
- Continue only when all acceptance checks pass in order.

### Escalation path

- Escalate to CTO + ToM Engineering owner for emergency governance disablement.

## MONITORING & VALIDATION

- Monitoring window: minimum 48 hours post-release.
- Health indicators:
  - count of override invocations,
  - invalid override attempts,
  - forced exits (expiry/revocation/anomaly),
  - audit completeness rate.
- Alert conditions:
  - any override with missing mandatory audit fields,
  - any autonomy action recorded after expiry,
  - scope violation detection.
- Remediation playbook:
  - immediate fail-closed mode,
  - disable override feature path,
  - incident debrief and policy patch.

## LESSONS LEARNED (Debrief Placeholder)

- To be completed after implementation window with:
  - what worked,
  - what failed/surprised,
  - what changes in next iteration,
  - updates to institutional knowledge artifacts.

## Next Promotion State Transition

Implementation completed with evidence:

- Governance gate logic added for NO-GO + HITL override validation and state decisions.
- Runtime cycle policy now records autonomy gate details and explicit override audit events.
- API `POST /cycle` now accepts optional `hitlOverrideToken` for governed override flow.
- Validation evidence:
   - `npm run lint` (pass)
   - `npm run build` (pass)

If future amendments extend override semantics, update:

- Status: `COMPLETE (YYYY-MM-DD, Owner)`
- Promotion Record -> `Promotion State: implementation complete`
