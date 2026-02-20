# Plan - WebUI Interaction Start (Normalized)

- Status: Draft (Pre-design prep)
- Date: 2026-02-20
- Owner: ToM Engineering
- Method Basis: ToM Methodology Standard (Research / Plan / Verify)

## RESEARCH

### Problem framing

We are preparing to implement a WebUI interface and must verify that current runtime, governance boundaries, and packaging path are stable enough for safe execution.

### Current-state evidence

- Electron main already exposes API-first context bridge:
  - `electron/main/index.ts` -> `ipcMain.handle('context:get', ...)`
- Renderer has context-isolated access surface:
  - `electron/preload/preload.ts` -> `window.api.getContext()`
- Lineage API contract is present:
  - `src/api/httpServer.ts` -> `GET /lineage/latest`, `GET /lineage/runs`
- Governance and identity context is maintained in `.tom-workspace/**` and excluded from vector memory.

### Assumptions

- A1: WebUI can rely on API-first context retrieval without direct renderer DB access.
- A2: Existing TypeScript/electron renderer build pipeline is stable enough for feature development.
- A3: Packaging instability (if present) can be isolated as environment/privilege configuration and treated as release-gate, not development-gate.

### Risks

- R1: Packaging failures on Windows due to symlink privilege constraints block release artifact generation.
- R2: Config docs drift from runtime controls causes rollout confusion.
- R3: Plan ambiguity slows implementation and review.

## PLAN

### Objective

Move from Conditional GO to Full Promotion readiness by completing pre-design technical alignment tasks.

### Scope

- Update environment control documentation for WebUI-adjacent controls.
- Verify packaging behavior (`npm run electron:build`) under Developer Mode condition.
- Normalize this plan into methodology-compliant structure.

### Non-scope

- Implementing WebUI feature code.
- Altering governance semantics or privilege gate behavior.

### Work Items

1. **Environment Hygiene**
   - Add `ELECTRON_CONTEXT_SQLITE_FALLBACK` and `SENTRY_SPOTLIGHT` to `.tom-workspace/whoiam.md` configuration controls.
2. **Packaging Stability**
   - Attempt to enable Developer Mode on Windows host.
   - Run `npm run electron:build` and capture pass/fail evidence.
3. **Documentation Normalization**
   - Convert WebUI prep notes to standard Research / Plan / Verify format.

### Success criteria

- Environment controls listed in `whoiam.md` match current WebUI/Electron operational needs.
- Packaging result is captured with reproducible command output and blocker classification.
- Plan is methodology-compliant and review-ready.

## VERIFY

### Verification checklist

- [ ] `whoiam.md` config section includes both required env controls.
- [ ] `npm run electron:build` has current evidence captured.
- [ ] Packaging result classified as pass or blocker with root-cause notes.
- [ ] Plan format includes explicit Research / Plan / Verify sections.

### Commands

- `npm run lint`
- `npm run build`
- `npm run renderer:build`
- `npm run electron:build`

### Rollback

- If doc updates introduce drift/noise, revert only:
  - `.tom-workspace/whoiam.md`
  - `docs/plans/Plan-WebUI_Interagion_N-Start.md`

### Promotion gate

- Full Promotion only after packaging path is stable and verified (artifact generation succeeds).
- If packaging remains blocked by host privilege policy, maintain Conditional GO and track as explicit release blocker.
