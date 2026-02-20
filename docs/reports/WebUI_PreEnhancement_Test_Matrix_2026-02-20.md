# WebUI Pre-Enhancement Test Matrix — 2026-02-20

- Scope: pre-WebUI enhancement confidence checks (runtime, governance, packaging, auth, lineage)
- Environment: local Windows workstation (`D:\Documents\ToM`)
- Assessor: GitHub Copilot

## Summary Verdict

- Overall status: **PARTIAL PASS**
- Ready for WebUI development: **Yes (with known packaging instability risk)**
- Release-gate status: **Not yet green** (Electron packaging lock contention remains intermittent)

## Test Results

| Test | Command | Result | Notes |
| --- | --- | --- | --- |
| Governance policy simulation | `npm run oxide:policy-sim` | PASS | `nominal-indexed: PASS`, `zero-indexed: BLOCK` confirms supervised NO-GO behavior. |
| Proposal schema validation | `npm run oxide:validate-proposal` | PASS | Contract and payload validation succeeded. |
| IPC sanitize test | `npm run test:sanitize` | PASS | `sanitize tests passed`. |
| API auth guard (no token) | `GET /health` without auth | PASS | Returned `401` (expected). |
| API auth guard (bad token) | `GET /health` with invalid bearer | PASS | Returned `401` (expected). |
| API auth guard (valid token) | `GET /health` with `redteam-local-token` | PASS | Returned `200` (expected). |
| Lineage latest endpoint | `GET /lineage/latest` (auth) | PASS | `200` with payload containing identity in previous validation step. |
| Lineage runs endpoint | `GET /lineage/runs?limit=2&order=desc` (auth) | PASS | `200`, count observed (`2`). |
| Lineage smoke script (auth-enabled API) | `TOM_API_TOKEN=redteam-local-token TOM_API_BASE_URL=http://127.0.0.1:8787 npm run lineage:smoke` | PASS | Script now supports optional bearer token from env and passes in secured mode. |
| Lineage smoke script (tokenless temp API) | temp API on `8788` + `npm run lineage:smoke` | PASS | Still passes in tokenless mode. |
| Electron packaging | `npm run electron:build` | FAIL | Intermittent native module lock (`better-sqlite3.node` EBUSY/EPERM) during electron-builder dependency rebuild. |

## Issues Observed

1. **Electron packaging instability (intermittent lock contention)**
   - Symptom: `npm run electron:build` fails with `better-sqlite3` lock/unlink errors.
   - Error pattern: `EBUSY/EPERM` around `node_modules/better-sqlite3/build/Release/better_sqlite3.node`.
   - Impact: blocks consistent release artifact generation on this workstation.

2. **Lineage smoke auth gap (resolved)**
   - Prior symptom: script failed with `401` in auth-enabled mode.
   - Resolution: updated `src/scripts/lineageSmoke.ts` to include optional bearer token from `TOM_API_TOKEN`.
   - Current status: validated pass in secured mode.

## Recommendations Before Next WebUI Enhancement Step

1. Keep development moving (runtime/governance/auth checks are healthy).
2. Treat `electron:build` as a strict release gate and re-run in a clean process context (no active Node/Electron lock holders).
3. Keep using `lineage:smoke` with `TOM_API_TOKEN` in secured environments.
4. Execute manual renderer bridge check in Electron DevTools:
   - `await window.api.getContext()`
   - Expected: `{ ok: true, source: "api" | "sqlite-fallback", data: ... }`.

## Final Recommendation

Proceed with WebUI enhancement under supervised mode and authenticated API posture, while tracking packaging stabilization as the primary remaining release blocker.
