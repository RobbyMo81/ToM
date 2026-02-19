# Override Security Sufficiency Review — Findings

Date: 2026-02-19
Request Source: `docs/plans/CTO-Request_Information.md`
Review Scope:
- `src/core/governance/overrideToken.ts`
- `src/core/oxideGovernance.ts`
- Supporting context only: `src/core/config.ts`, `.env.example`, and call-site wiring in `src/core/brain.ts`

## Final Determination

**NO-GO (Blocking Issues Identified)** for production sufficiency under current criteria.

The implementation is solid on canonicalization, HMAC verification, constant-time comparison, and expiry checks, but it does not yet satisfy replay resistance, revocation reliability, scope/capability enforcement, or per-action re-validation requirements.

---

## Required Artifacts Summary

### 1) `overrideToken.ts` coverage

Implemented:
- Deterministic canonicalization (`json-canonicalize`) in signing view generation.
- HMAC-SHA256 verification (`createHmac`) and signature comparison using `timingSafeEqual`.
- Expiry and issued-at checks with clock skew.
- `token_hash` verification over canonical signing payload.

Not implemented:
- Nonce ledger / single-use enforcement.
- Revocation check against any persistent revocation source.

### 2) `oxideGovernance.ts` runtime behavior

Implemented:
- Token validity feeds autonomy gate decision (`NORMAL_GO`, `SUPERVISED_NO_GO`, `OVERRIDE_AUTONOMY`).
- NO-GO can be overridden only when token validation is successful.

Not implemented:
- Per-action capability enforcement from token `capabilities.allow/deny`.
- Path-scope enforcement using `project.scope.allowed_paths/disallowed_paths`.
- Revocation handling mechanism.

### 3) Configuration context

Implemented:
- Key sourcing from env via `src/core/config.ts`:
  - `TOM_OVERRIDE_HMAC_KEY_ID`
  - `TOM_OVERRIDE_HMAC_KEY_B64`
- Documented in `.env.example`.

Not implemented:
- Key-ring/rotation map support beyond a single key id + key pair.

### 4) Audit & replay controls

Current state:
- Override acceptance/rejection emits task events in cycle runtime path.
- No nonce replay ledger.
- No single-use override lockout.
- No revocation list/state check.
- No per-privileged-action re-verification.

---

## Evaluation Criteria Results

1. Deterministic canonicalization: **PASS**
2. HMAC integrity correctness: **PASS**
3. Constant-time verification: **PASS**
4. Expiry enforcement: **PASS**
5. Replay resistance: **FAIL (blocking)**
6. Scope enforcement correctness: **FAIL (blocking)**
7. Per-action enforcement (not just session start): **FAIL (blocking)**
8. Revocation reliability: **FAIL (blocking)**
9. Key custody model sufficiency: **PARTIAL** (acceptable for local v1, weak for stronger threat model)
10. Audit integrity guarantees: **PARTIAL** (events logged, but no replay/revocation chain controls)

---

## Findings (Severity, Location, Minimal Fix)

### F1 — Missing replay protection (single-use / nonce ledger)
- Severity: **Critical**
- Location:
  - `src/core/governance/overrideToken.ts` (nonce parsed but never checked for prior use)
  - `src/core/oxideGovernance.ts` / `src/core/brain.ts` (no replay registry integration)
- Minimal fix:
  - Persist `override_id` + `integrity.nonce` in runtime store at acceptance time.
  - Reject token reuse when same pair is seen again.

### F2 — No revocation enforcement
- Severity: **High**
- Location:
  - `src/core/governance/overrideToken.ts` (no revocation lookup)
  - `src/core/oxideGovernance.ts` (no revocation gate)
- Minimal fix:
  - Add revocation lookup source (runtime table or revocation artifact store).
  - Check revocation status before granting override autonomy.

### F3 — Scope/capability claims in token are not enforced
- Severity: **Critical**
- Location:
  - `src/core/oxideGovernance.ts` (decision logic does not evaluate `project.scope` or `capabilities` fields)
- Minimal fix:
  - Enforce deny-overrides-allow semantics.
  - Validate requested action and affected paths against token scope/capability rules before each privileged operation.

### F4 — Validation effectively occurs at cycle decision point, not per privileged action
- Severity: **High**
- Location:
  - `src/core/brain.ts` (`verifyOverrideToken` invoked once in cycle proposal flow)
- Minimal fix:
  - Re-validate override status and capability scope before each privileged step (e.g., approval/deploy/patch actions).

### F5 — Key management is single-key only (no keyset rotation path)
- Severity: **Medium**
- Location:
  - `src/core/config.ts` (`overrideAuth.keyId` + `hmacKey` single source)
- Minimal fix:
  - Add optional keyset env (`TOM_OVERRIDE_HMAC_KEYSET_JSON`) and resolver fallback by `key_id`.

---

## Production Readiness Judgment

Current implementation is **cryptographically competent but operationally incomplete** for production-grade override security.

- Good foundation: canonicalized signed tokens + timing-safe HMAC verification.
- Blocking gaps: replay, revocation, scope/capability enforcement, and per-action re-validation.

**Decision:** `NO-GO` until F1–F4 are remediated.

---

## Notes on Non-Goals Compliance

This review does not redesign the architecture, identity model, or introduce external secret managers. Findings are limited to sufficiency of override security controls as requested.
