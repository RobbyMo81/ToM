# Plan - Electron MCP + Context DB (V2 Promotion)

- Status: PROMOTED (2026-02-19, ToM Engineering)
- Date: 2026-02-19
- Owner: ToM Engineering
- Method Basis: docs/reference/ToM_Methodology_Standard.md v1.1
- Prior Draft: docs/plans/Plan-Electron_MCP_ContextDB.md (superseded by this v2)

## RESEARCH

### Problem framing

We need a practical way for Electron to expose runtime governance context to operators and O.X.I.D.E without weakening existing trust boundaries.

### Current-state evidence

- Electron main already initializes Spotlight sidecar in dev mode:
  - `electron/main/index.ts` (`import('@spotlightjs/sidecar')` + `setupSidecar()`)
- Privileged path is already hardened in main and calls `requirePrivilege(...)` with main-owned context:
  - `electron/main/index.ts`
  - `src/core/governance/privilegedGate.ts`
- Runtime lineage data is already persisted to `memory/tom_runtime.sqlite` through `RuntimeMemoryStore`:
  - `src/integrations/runtimeMemoryStore.ts`
- HTTP API already exposes lineage context:
  - `GET /lineage/latest`
  - `GET /lineage/runs`
  - in `src/api/httpServer.ts`
- No current Electron preload API exists for generic context fetch beyond privileged IPC:
  - `electron/preload/preload.ts`
- No `current_identity_context` SQL table exists in runtime schema:
  - `sql/001_runtime_memory_v1.sql`

### Constraints

- Preserve existing hardened renderer->main security boundary.
- Keep `.tom-workspace/**` governance artifact policy unchanged (non-vectorized).
- Avoid introducing unnecessary dependencies/surface area where existing API paths already satisfy use case.
- Keep production build clean from dev-only observability dependencies.

### Alternatives considered

1. **Direct SQLite access from Electron main (always-on)**
   - Pros: local low-latency read access.
   - Cons: tighter coupling to schema, multi-process lock/contention risks, duplicate query logic.
2. **API-first context access (selected)**
   - Pros: reuses existing lineage endpoints, preserves service boundary, lower coupling.
   - Cons: requires API service availability and auth token path.
3. **Sentry-first implementation for Spotlight visibility**
   - Pros: richer trace/error semantics if fully instrumented.
   - Cons: introduces extra dependency and config overhead; not required for baseline sidecar operation.

### Unknowns and assumptions

- A1: API auth token can be safely provided to Electron main (not renderer) for lineage fetch.
- A2: Existing lineage endpoints satisfy minimum context UX without schema changes.
- A3: Spotlight sidecar telemetry in dev is sufficient for runtime debugging baseline before optional Sentry layering.

## PLAN

### Objective

Promote a practical v2 architecture where Electron context visibility is API-first, Spotlight remains dev-only, and direct SQLite access is optional/fallback-only.

### Scope

- Define and promote v2 architecture decision for Electron context retrieval.
- Keep current hardened privileged IPC path unchanged.
- Add phased implementation sequence for context-view exposure.

### Non-scope

- Reworking `requirePrivilege` interfaces.
- Adding a mandatory `current_identity_context` table in this phase.
- Introducing mandatory Sentry dependency in this phase.

### Decision tree

- If ToM API is available and authorized -> use API lineage endpoints for context view.
- If API is unavailable in dev/local diagnostic mode -> optional direct SQLite read via Electron main-only adapter.
- If advanced trace analytics is explicitly required -> add Sentry instrumentation as a separate follow-on plan.

### Approach and rationale

- Use existing authoritative runtime API as primary data contract for UI context.
- Keep renderer isolated: expose only minimal `getContext()` preload bridge backed by main process calls.
- Preserve existing sidecar integration; avoid forcing Sentry adoption until trace-level requirements are explicit.

### Explicit assumptions

- `memory/tom_runtime.sqlite` remains canonical runtime lineage store.
- Lineage endpoints remain backward compatible for near-term UI usage.
- Electron main remains the only authority boundary for privileged and context access.

### Promotion Record

- Promoted On: 2026-02-19
- Promoted By: GitHub Copilot
- Promotion Basis: ToM Methodology Standard v1.1
- Promotion State: PROMOTED (plan -> implementation start)

## VERIFY

### Stakeholder/provider validation

- Consumer: ToM operators and O.X.I.D.E runtime reviewers need practical runtime observability.
- Provider: existing ToM API and runtime memory services already provide required lineage data.

### Dependency checks

- `@spotlightjs/sidecar` present and initialized in dev-only Electron main path.
- `better-sqlite3` already present for runtime store integration.
- No required new dependency for baseline v2 promotion.

### Risk assessment

- R1: API unavailability blocks context UI (mitigate with explicit fallback state and optional local DB mode).
- R2: exposing excessive context data to renderer (mitigate with main-only filtering and minimal payload schema).
- R3: schema drift if UI queries SQLite directly (mitigate by making direct SQLite fallback optional and internal).

### Confirmed fallback paths

- Primary fallback: show degraded context state in UI if API unavailable.
- Secondary fallback (dev-only): read minimal context from SQLite in main process.

### Logic gates

- Assumption validation: A1/A2/A3 accepted for v2 promotion.
- Environment readiness: existing API + Electron main + sidecar path confirmed in codebase.
- Rollback readiness: plan-level rollback is procedural (revert context bridge additions only).
- Go/No-Go: **GO** for v2 promotion because it aligns with current implementation and minimizes new risk.

## PREREQUISITES

- Capture before-state of:
  - `electron/main/index.ts`
  - `electron/preload/preload.ts`
  - `src/api/httpServer.ts`
- Confirm API auth token loading behavior in runtime config.
- Confirm no production bundling regression for sidecar package.

## SUCCESS CRITERIA

### Definition of done

- Electron context view reads lineage context via API-first path from main process.
- Renderer receives a minimal sanitized context payload through preload bridge.
- Existing privileged IPC hardening remains unchanged and passing.
- No Sentry requirement introduced in this phase.

### Acceptance checks

1. `getContext()` from renderer returns latest lineage summary from main-mediated API call.
2. API unavailable scenario returns deterministic degraded status (not crash).
3. `npm run build` and `npm run lint` pass with v2 changes.
4. Electron production packaging still excludes sidecar artifacts.

### Phase checkpoints

- C1: v2 promotion approved.
- C2: preload/main context bridge implemented.
- C3: API-first context retrieval validated.
- C4: fallback behavior validated.

## TO-DO LIST

1. Add main-process context query adapter (API-first).
   - Verify: successful call to `/lineage/latest`.
   - Expected: normalized context JSON returned.
2. Add `getContext()` preload exposure.
   - Verify: renderer can request context without direct Node access.
   - Expected: context payload visible in renderer.
3. Add degraded-state handling for API unavailable.
   - Verify: simulate API down.
   - Expected: deterministic `{ ok:false, reason:'api_unavailable' }` style response.
4. Optional (dev-only): add direct SQLite fallback adapter in main process.
   - Verify: fallback path returns minimal context.
   - Expected: no renderer/main boundary violations.
5. Validate build/lint/package guardrails.
   - Verify: `npm run build`, `npm run lint`, and sidecar exclusion checks.
   - Expected: all pass.

## ROLLBACK PLAN

- Trigger T1: context bridge leaks privileged/internal fields.
  - Rollback: revert preload/main context bridge commits.
- Trigger T2: API-first context path destabilizes Electron startup.
  - Rollback: disable context feature flag and revert adapter.
- Trigger T3: packaging includes dev-only sidecar unexpectedly.
  - Rollback: revert packaging changes and re-run artifact verification.

### Abort vs continue gate

- Abort if any boundary regression affects privileged IPC security.
- Continue if only context-read degradation occurs and fallback works.

### Emergency escalation

- Escalate to ToM Engineering + Security owner for any privilege boundary regression.

## MONITORING & VALIDATION

- Monitoring window: 48 hours minimum post-implementation.
- Indicators:
  - context query success/failure rate,
  - API lineage endpoint latency/error rate,
  - renderer errors tied to context bridge,
  - sidecar startup errors in dev.
- Alert conditions:
  - repeated context query failures,
  - renderer crash tied to context API,
  - unexpected privileged gate behavior changes.
- Remediation playbook:
  - disable context UI path,
  - revert bridge adapter,
  - preserve privileged path unchanged,
  - re-run validation commands.

## LESSONS LEARNED (Initial)

- Practicality improves when we reuse existing runtime API contracts instead of introducing new schema and direct DB coupling by default.
- Spotlight sidecar can remain useful without forcing Sentry adoption in baseline implementation.
- Context observability should be additive and must not modify the hardened privilege boundary.
