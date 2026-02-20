---
Promoted On: 2026-02-19
Promoted By: automation
Promotion Basis: docs/reference/ToM_Methodology_Standard.md v1.1
Promotion State: PROMOTED (plan -> implementation start)
Plan Document: docs/plans/Plan-Implement_Electron.md
---

# Promotion Record — Implement Electron Integration

This promotion records the decision to move `docs/plans/Plan-Implement_Electron.md` from Plan -> Implementation, following the ToM Methodology Standard v1.1.

## 1) Research (summary)

- Problem: embed a Chromium-based renderer to enable a secure UI and developer tooling for privileged workflows.
- Current-state evidence: plan located at `docs/plans/Plan-Implement_Electron.md`; existing governance modules at `src/core/governance/*` including `privilegedGate()`; as-built memory updated with `memory/spotlight_sidecar.md`.
- Constraints: Windows-first support, dev-only spotlight sidecar; production builds must not include sidecar; must preserve `privilegedGate()` verification server-side.
- Alternatives considered: Electron (chosen), direct CEF embed (higher cost/maintenance).
- Assumptions: `process.env.NODE_ENV` is set for dev runs; `requirePrivilege` is exported from `src/core/governance/privilegedGate`.

## 2) Verify (pre-implementation checks)

- Stakeholders: ToM Engineering, Security/CTO (implicit). Validate before production bundle.
- Dependency checks: `@spotlightjs/sidecar` present in devDependencies; `electron` & `electron-builder` added to devDependencies; `cross-env` present.
- Risk assessment: sidecar leakage to prod (mitigated by conditional import), telemetry leakage of secrets (mitigated by sanitization in `electron/main/index.ts`).
- Fallback: revert to CLI-only flows; disable Electron via environment flag.

## 3) Prerequisites

- Backup: ensure runtime state snapshots if performing production-affecting tests (not required for dev-only prototype).
- Current-state capture: as-built ingestion completed and `memory/as-built.sqlite` contains sidecar entry.
- Access: developer machine with Node.js >=20 and ability to run `electron`.
- Approvals: developer-level approval to run sidecar and locally inspect privileged flows.

## 4) Success Criteria (explicit, testable)

- Criterion 1: Electron dev build launches (`npm run electron:dev`) and opens a renderer window.
- Criterion 2: Renderer can invoke `window.api.requestPrivileged()` and the main process routes to `privilegedGate()` successfully for both GO and NO-GO flows.
- Criterion 3: Sidecar is active in development and receives sanitized telemetry (no raw tokens or `.tom-workspace/whoiam.md` content).
- Criterion 4: No sidecar artifacts are bundled into production builds (`electron:build` output verified to exclude sidecar package/files).

## 5) To-Do List (execution plan)

1. Scaffold `electron/renderer` (Vite + minimal UI). — Owner: automation / dev — Verify: `npm run electron:dev` opens UI. 
2. Implement small UI control to call `requestPrivileged` with test payloads (GO & NO-GO). — Verify: runtime DB logs `PRIVILEGE_GRANTED` and `PRIVILEGE_DENIED` events.
3. Add unit/integration tests for `electron/main` IPC handler (mock `requirePrivilege`). — Verify: CI test pass.
4. Add packaging checks to CI to ensure `@spotlightjs/sidecar` is not bundled. — Verify: build artifacts inspected.
5. Execute monitoring window (48 hours) if prototype triggers any persistent services. — Verify: monitoring alerts/no regressions.

## 6) Rollback Plan

- Trigger conditions: discovery of sidecar leakage into production build, or sensitive data in telemetry.
- Rollback actions:
  - Revert `electron` commits and remove `electron/*` artifacts.
  - Revert `package.json` devDependency changes.
  - Purge any sidecar-configured telemetry endpoints used in the prototype.
  - Re-run `asbuilt:ingest` to restore memory state if necessary.

## 7) Monitoring & Validation

- Monitoring window: 48 hours for prototype runtime behavior.
- Health indicators: IPC latency, number of PRIVILEGE_DENIED events, sidecar connection errors, unexpected telemetry payload sizes.
- Alerts: increase in PRIVILEGE_DENIED > threshold (configurable), sidecar errors, or any telemetry containing redacted fields.

## 8) Lessons Learned (placeholder)

- To be filled after implementation and monitoring.

---
Promotion recorded by automation on 2026-02-19.
