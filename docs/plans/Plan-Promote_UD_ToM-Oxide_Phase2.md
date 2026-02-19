# Plan - Promote UD ToM-O.X.I.D.E Phase 2 (Secrets + Override Integrity)

- Status: COMPLETE (2026-02-19, ToM Engineering)
- Date: 2026-02-19
- Owner: ToM Engineering
- Source Directive: docs/plans/Plan-UD_ToM-Oxide_Phase2.mc
- Method Basis: docs/reference/ToM_Methodology_Standard.md v1.1

## RESEARCH

### Problem framing

Phase 2 requires hardening HITL override tokens so they are cryptographically verifiable while staying compatible with current env-based secret handling.

### Current-state evidence

- Env vars are loaded via `dotenv` in `src/core/config.ts`.
- `.env` is gitignored and `.env.example` documents current key/token settings.
- NO-GO/HITL gating exists in `src/core/oxideGovernance.ts`, but token validation is structural/semantic only (no signature verification).
- Cycle/API call paths pass override token data to policy decisions.

### Constraints

- Do not introduce external secret manager dependency in v1.
- Keep signing keys out of `.tom-workspace` artifacts.
- Preserve fail-closed NO-GO behavior.
- Keep implementation deterministic and auditable.

### Alternatives considered

1. Keep semantic validation only (rejected)
   - No tamper-evident guarantee.
2. Full PKI/HSM integration now (rejected)
   - High complexity and infra dependency beyond v1.
3. Env-keyed HMAC + canonical JSON + schema validation (selected)
   - Matches current architecture and delivers strong v1 integrity controls.

### Unknowns and assumptions

- A1: canonicalization library behavior is stable for token signing payloads.
- A2: key parsing from env can fail closed without breaking non-override operations.
- A3: existing CLI/API cycle pathways can pass raw token JSON without API breakage.

## PLAN

### Objective

Promote Phase 2 into enforceable runtime controls that validate signed override tokens using env-sourced HMAC keys and canonical JSON payloads.

### Scope

- Add override key config fields to env/config.
- Add Zod schema and HMAC verification module.
- Enforce verification in cycle run-path policy decisions.
- Add CLI support for override token file input.
- Update documentation for env key requirements.

### Non-scope

- External secrets manager integration.
- Multi-admin PKI trust chains.
- New deployment infrastructure.

### Decision tree

- If NO-GO and token absent/invalid signature -> deny autonomy.
- If NO-GO and token valid/within bounds -> allow bounded override autonomy.
- If final gate is GO -> normal autonomy policy remains.

### Approach and rationale

- Implement a dedicated governance module for override verification (`src/core/governance/overrideToken.ts`).
- Keep `config.ts` as single env source of truth.
- Keep policy decision logic in `oxideGovernance.ts` with explicit verification-result plumbing.

### Explicit assumptions

- Signing keys are provided through env vars on execution hosts.
- Override artifacts remain stored in `.tom-workspace/**` without secret material.
- Signature encoding standard is base64.

### Promotion Record

- Promoted On: 2026-02-19
- Promoted By: GitHub Copilot (CTO directive promotion)
- Promotion Basis: ToM Methodology Standard v1.1
- Promotion State: implementation complete

## VERIFY

### Stakeholder/provider validation

- CTO directive review confirms env-keyed HMAC requirement and token artifact storage model.

### Dependency checks

- `zod` and `json-canonicalize` available in runtime dependencies.
- Node `crypto` APIs available (`createHmac`, `timingSafeEqual`).

### Risk assessment

- R1: malformed key material causes false negatives.
- R2: non-canonical payload generation causes signature drift.
- R3: weak call-site wiring bypasses verification path.

### Confirmed fallback paths

- Fail closed for invalid signature/key/expiry.
- Continue normal operation for non-override workflows.
- Roll back by reverting Phase 2 modules and config fields.

### Logic gates

- Assumption gate: A1/A2/A3 validated with lint/build and integration checks.
- Environment gate: key vars documented and parseable.
- Rollback gate: old validation path recoverable by revert.
- Go/No-Go gate: GO only when signature and expiry checks are enforced in cycle path.

## PREREQUISITES

- Snapshot current `config.ts`, `oxideGovernance.ts`, `brain.ts`, `cli.ts`, `.env.example`.
- Confirm `.env` remains gitignored.
- Confirm key naming convention (`TOM_OVERRIDE_HMAC_KEY_B64`, `TOM_OVERRIDE_HMAC_KEY_ID`).

## SUCCESS CRITERIA

### Definition of done

- Signed override token schema exists and is validated with Zod.
- Canonical JSON HMAC signature verification is implemented with timing-safe compare.
- Env-sourced override key config is available and documented.
- Cycle policy consumes verification result and fails closed for invalid tokens.
- CLI/API paths can provide override token input to run loop.

### Acceptance checks

1. Valid signed token at NO-GO can activate override autonomy.
2. Invalid signature or expired token at NO-GO is rejected.
3. Missing key material results in fail-closed rejection.
4. Lint/build pass with new dependencies and types.

### Phase checkpoints

- C1: promotion artifact complete
- C2: module/config updates complete
- C3: run-path enforcement complete
- C4: validation + docs/as-built updates complete

## TO-DO LIST

1. Add Phase 2 env fields to `.env.example` and config model.
2. Add `overrideToken` governance module with Zod schema + verification.
3. Wire verification result into `runCycle` policy decisions.
4. Add CLI support for override token file input.
5. Validate API cycle path compatibility with signed token object.
6. Run lint/build/docs checks and record evidence.

## ROLLBACK PLAN

- Trigger T1: token verification blocks valid operational flows.
  - Rollback: revert verification wiring and restore prior semantic-only validation.
- Trigger T2: key parsing/encoding defects cause broad runtime failures.
  - Rollback: make key config optional and disable override verification path temporarily.
- Trigger T3: CLI/API token ingestion errors break cycle execution.
  - Rollback: disable override input parsing and keep standard cycle path.

### Abort vs continue gate

- Abort on any verification bypass or unintended autonomy grant.
- Continue only when fail-closed checks are confirmed.

### Emergency escalation path

- Escalate to CTO + ToM Engineering for governance-critical regressions.

## MONITORING & VALIDATION

- Monitoring window: minimum 48 hours post-merge.
- Indicators:
  - override verification pass/fail counts,
  - signature mismatch frequency,
  - expired token rejection frequency,
  - NO-GO autonomy grants tied to valid override IDs.
- Alerts:
  - any NO-GO autonomy grant with invalid verification result,
  - missing key material while override attempts are present,
  - malformed token acceptance.
- Remediation:
  - fail-closed enforcement,
  - key rotation and token reissue,
  - revert and incident debrief.

## LESSONS LEARNED (Debrief Placeholder)

To be completed post-implementation with outcomes, surprises, and next-iteration updates.

## Next Promotion State Transition

Implementation evidence captured:

- Added env-sourced override key config (`TOM_OVERRIDE_HMAC_KEY_ID`,
  `TOM_OVERRIDE_HMAC_KEY_B64`) in `.env.example` and `src/core/config.ts`.
- Added signed override token schema + verifier at
  `src/core/governance/overrideToken.ts` (`zod`, `json-canonicalize`,
  HMAC-SHA256, timing-safe compare).
- Wired verification into cycle policy path in `src/core/brain.ts` and policy
  handling in `src/core/oxideGovernance.ts`.
- Added CLI override token file support in `src/cli.ts`.
- Validation evidence:
  - `npm run lint` PASS
  - `npm run build` PASS

Future Phase 2+ hardening should append incremental evidence while preserving
`Status: COMPLETE`.
