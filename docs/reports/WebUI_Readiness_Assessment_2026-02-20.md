# WebUI Readiness Assessment — 2026-02-20

- Request: assess whether ToM is ready to implement the WebUI interface
- Source plan reviewed: `docs/plans/Plan-WebUI_Interagion_N-Start.md`
- Assessment mode: plan + codebase validation + build stability checks
- Assessor: GitHub Copilot

## Executive Summary

System readiness is **Conditional GO** for WebUI implementation.

- Core engineering baseline is stable for development work (`lint`, `build`, `typecheck`, renderer build all pass).
- The primary packaging path (`electron:build`) is **not yet stable** on this workstation due to Windows privilege constraints creating symlinks during `electron-builder` code-sign tooling extraction.
- CTO assumptions in the source plan are mostly valid against current runtime architecture, with one documentation hygiene gap (environment control list completeness).

## Research Note on Source Plan Quality

`docs/plans/Plan-WebUI_Interagion_N-Start.md` currently reads as a **review memo**, not a structured implementation plan (no methodology sections, no tasks/checkpoints/rollback matrix). It is useful for assumptions, but not sufficient alone as an execution plan artifact.

## CTO Assumption Validation

| Assumption from source plan | Evidence checked | Status | Notes |
| --- | --- | --- | --- |
| `whoiam.md` is the architecture mirror and should align with runtime | `.tom-workspace/whoiam.md`, `electron/main/index.ts`, `electron/preload/preload.ts` | **Valid** | Electron context path and preload bridge are documented and implemented. |
| Identity/governance artifacts remain non-vectorized to prevent leakage | `.tom-workspace/whoiam.md`, memory policy docs referenced in existing architecture records | **Valid** | Governance artifacts remain under `.tom-workspace/**` and excluded from vector memory by policy. |
| API-first context retrieval via `/lineage/latest` is available | `electron/main/index.ts`, `src/api/httpServer.ts` | **Valid** | `ipcMain.handle('context:get')` fetches API-first lineage context. |
| Deterministic degraded behavior exists when API unavailable | `electron/main/index.ts` | **Valid** | Explicit non-OK reason handling (`api_disabled`, `api_unavailable`, etc.). |
| SQLite fallback is main-process-only and opt-in | `electron/main/index.ts`, `.tom-workspace/whoiam.md` | **Valid** | Guarded by `ELECTRON_CONTEXT_SQLITE_FALLBACK=1`; fallback read stays in main process. |
| `TOM_API_TOKEN` is handled in a secure authority path | `src/core/config.ts`, `electron/main/index.ts`, `src/api/httpServer.ts` | **Valid** | Token is loaded in config and used in main/API boundaries; renderer receives bridged responses only. |
| Config surface in docs fully reflects current controls | `.tom-workspace/whoiam.md` section 5 | **Partial** | `ELECTRON_CONTEXT_SQLITE_FALLBACK` is documented in logic path but not listed in env control list. |

## Build & Stability Verification

Commands executed during this assessment:

1. `npm run lint` -> **PASS**
2. `npm run build` -> **PASS**
3. `npx tsc --noEmit` -> **PASS**
4. `npm run renderer:build` -> **PASS**
5. `npm run electron:build` -> **FAIL** (environmental/packaging)

### Packaging Failure Details

`electron:build` failure was reproduced after clearing `node`/`electron` processes.

Observed blocker:
- `electron-builder` fails extracting `winCodeSign` cache archive due to symlink creation privilege error:
  - `ERROR: Cannot create symbolic link : A required privilege is not held by the client.`

Interpretation:
- This is a **workstation privilege/configuration issue**, not a TypeScript/WebUI feature compile failure.
- App/runtime code readiness is stronger than packaging readiness on this host.

## Readiness Decision

### Decision

**Conditional GO** for WebUI implementation start.

### Conditions

- Proceed with WebUI feature development in dev flow (renderer + API/main bridge).
- Treat packaging as a parallel hardening track.

### Must-Do Before Release Candidate

1. Resolve Windows packaging privilege path for `electron-builder` symlink extraction.
2. Re-run and capture green evidence for `npm run electron:build`.
3. Normalize `docs/plans/Plan-WebUI_Interagion_N-Start.md` into ToM methodology format (research/plan/verify/checkpoints/rollback).
4. Add `ELECTRON_CONTEXT_SQLITE_FALLBACK` to the documented env control list in `.tom-workspace/whoiam.md` configuration surface section.

## Team Review Checklist

- [ ] Approve Conditional GO for implementation sprint.
- [ ] Assign owner for packaging privilege remediation.
- [ ] Assign owner to normalize WebUI plan document.
- [ ] Confirm release gate requires passing `electron:build` evidence.

## Final Recommendation

Start WebUI implementation now under **Conditional GO**, with release promotion blocked until packaging stability is green and documentation alignment tasks are closed.
