---
Promoted On: 2026-02-19
Promoted By: automation
Promotion Basis: docs/reference/ToM_Methodology_Standard.md v1.1
Plan Document: docs/plans/Plan-Implement_Electron.md
---

# Full Implementation Plan — Electron + Spotlight Sidecar

This document is the canonical implementation plan following the ToM Methodology Standard v1.1. It aggregates prior research, recommendations, and a step-by-step execution plan to bring the Electron renderer into production-ready state while preserving governance, telemetry hygiene, and packaging safety.

## 1) Research (evidence & rationale)

- Problem: Provide a secure, auditable UI for privileged workflows while enabling developer visibility during research via a dev-only Spotlight sidecar.
- Evidence:
  - Governance modules implemented: `src/core/governance/*` (`privilegedGate`, `override*`).
  - Prototype Electron scaffold present under `electron/` and a Vite+React renderer in `electron/renderer`.
  - Sidecar dev dependency present in `devDependencies` and a memory entry `memory/spotlight_sidecar.md` indexed in as-built DB.
- Constraints:
  - Sidecar must never be bundled into production artifacts.
  - Packaging and CI must verify sidecar exclusion and sanitize telemetry payloads.
  - Windows-first packaging requires `electron-builder` configuration and proper app metadata.
- Alternatives considered: direct CEF embed (higher implementation and maintenance cost) vs. Electron (chosen for speed and ecosystem support).

## 2) Plan (one-sentence objective, scope, decision tree)

- Objective: Deliver a secure, testable Electron renderer that integrates with ToM governance and enables dev-only Spotlight inspection without leaking secrets into telemetry or production builds.

- Scope: Implements dev/prod Electron build paths, Vite+React renderer, IPC sanitization, CI packaging and verification, unit tests for sanitization and IPC, and operational recommendations (monitoring/retention).

- Decision tree (summary):
  - If dev-only inspection required → enable Spotlight sidecar conditional on NODE_ENV=development.
  - If production packaging requested → run CI packaging, verify sidecar excluded, and perform security & monitoring checks before release.

## 3) Verify (pre-implementation checks)

- Stakeholder validation: ToM engineering & security must approve telemetry sanitization policy.
- Dependency checks: `electron`, `electron-builder`, `vite`, `react`, `@spotlightjs/sidecar` present in `devDependencies`.
- Risk assessment: telemetry leakage, accidental bundling of sidecar, missing packaging metadata. Mitigations: sanitize module, CI verification script, updated `package.json` `build` config.

Verification checklist (must pass before proceeding to production):
- `npm run test:sanitize` returns success.
- `npm run renderer:build` produces `electron/renderer/dist`.
- CI `electron-packaging.yml` runs and `scripts/verify_no_sidecar_in_build.js` passes.

## 4) Prerequisites

- Local dev environment: Node.js >= 20, npm, ability to run Electron locally.
- CI environment: GitHub Actions runner with Node.js 20 (workflow added at `.github/workflows/electron-packaging.yml`).
- Backups: ensure runtime/state snapshots exist if testing production releases.

## 5) Success Criteria (explicit & testable)

- SC1: Developer can run `npm run ui` or `npm run electron:dev` to start the renderer and exercise privileged flows.
- SC2: Renderer `requestPrivileged` calls route to `privilegedGate()` and append runtime audit events (`PRIVILEGE_GRANTED` / `PRIVILEGE_DENIED`).
- SC3: `@spotlightjs/sidecar` runs in development and does not receive raw secrets (sanitization test passes).
- SC4: Production build artifacts (CI) do not include `@spotlightjs/sidecar` — CI verification script passes.

## 6) To-Do List (Execution Plan)

1. Finalize packaging metadata in `package.json` (author, appId, productName). — Verify: `npm run electron:build` produces dist directory without errors (CI will handle full packaging).
2. Complete sanitization and unit tests (done). — Verify: `npm run test:sanitize` passes.
3. Add IPC handler unit/integration tests (next step). — Verify: mock `requirePrivilege` and assert path and event emission.
4. Run CI packaging workflow on a PR and validate artifacts and `verify_no_sidecar_in_build.js` passes. — Expected output: workflow succeeds and artifact uploaded.
5. Security review: have Security team validate telemetry sanitization and packaging rules. — Approval required.
6. Production gating: After CI success & security approval, schedule a monitored release window with rollback plan active.

Per-step verification commands and expected output:
- Build renderer: `npm run renderer:build` → creates `electron/renderer/dist/index.html`.
- Run sanitize tests: `npm run test:sanitize` → `sanitize tests passed`.
- Run CI packaging locally (dir): `npm run electron:build` → creates `dist/win-unpacked` (may fail locally due to environment); rely on CI for final packaging.

## 7) Rollback Plan

- Triggers:
  - CI packaging verification fails (sidecar found), or
  - Sensitive telemetry observed in sidecar logs.
- Rollback actions:
  1. Revert merged commit(s) that introduced the Electron renderer packaging (`git revert` or rollback branch).
  2. Re-run `npm run asbuilt:ingest` to refresh as-built memory if deindexed content occurred.
  3. Rotate any keys possibly exposed and audit runtime events.

## 8) Monitoring & Validation (post-deployment)

- Monitoring window: minimum 48 hours of observation for production release.
- Health indicators:
  - IPC error rate (percent of privileged:request calls failing)
  - Unexpected `PRIVILEGE_DENIED` spikes
  - Sidecar connection errors (dev-only)
  - Telemetry payload sizes and presence of redacted fields
- Alerts: define thresholds and forward to on-call.

## 9) Lessons Learned (debrief template)

- What worked: (to be filled post-monitoring)
- What failed/surprised: (to be filled)
- Action items for next iteration: key rotation (F5), privileged-call-site sweep, retention/monitoring for governance JSONL stores.

## Promotion Record

- Promoted On: 2026-02-19
- Promoted By: automation
- Promotion Basis: ToM Methodology Standard v1.1
- Promotion State: Implementation started (prototype & CI added)

---
Implementation owner: ToM Engineering
