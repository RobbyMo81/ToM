# Lineage Workflow Closeout Debrief — 2026-02-18

- Date: 2026-02-18
- Scope: Runtime persistence, lifecycle lineage capture, lineage API/SDK surfacing, smoke checks, optional CI integration
- Related docs:
  - `ToM_Build_Debrief_2026-02-18.md`
  - `Ollama_LLM_Wiring_Debrief.md`
  - `../handoffs/Handoff Report.md`

## Executive Summary

This workflow is complete. Runtime memory is now wired through active query/generate
paths, cycle execution emits full workflow and proposal lifecycle lineage records,
lineage is exposed through API and both SDK surfaces, and smoke validation is
available locally and as an optional non-blocking CI job.

## Delivered Outcomes

1. Runtime session and turn persistence integrated into:
   - CLI: `query`, `generate`
   - API: `POST /query`, `POST /generate`
2. Cycle lineage persistence integrated for:
   - workflow runs, steps, and task events
   - learned skills and skill-to-logic proposals
   - validation, approval, deploy outcome records
   - status transitions through deterministic gate outcomes
3. Lineage observability endpoints delivered:
   - `GET /lineage/latest`
   - `GET /lineage/runs` with filter/sort/pagination support
4. SDK parity delivered in both:
   - `src/sdk/*`
   - `packages/tom-brain-sdk/src/*`
5. Operational validation added:
   - `npm run lineage:smoke`
   - optional CI job `lineage-smoke` (non-blocking) in `.github/workflows/ci.yml`

## API Capability Snapshot

- `GET /lineage/latest` returns latest run-to-deploy lifecycle summary.
- `GET /lineage/runs` supports:
  - `limit`
  - `order=asc|desc`
  - `cursor`
  - `status`
  - `triggerSource`
  - `startedAfter`
  - `startedBefore`
- Cursor response contract includes `page.hasMore` and `page.nextCursor`.

## Validation Evidence

- `npm run build` → PASS
- `npm run lint:all` → PASS
- API lineage smoke checks (`/lineage/latest`, `/lineage/runs`) → PASS
- Runtime DB verification confirmed population of:
  - `sessions`
  - `conversation_turns`
  - `workflow_runs`
  - `workflow_steps`
  - `task_events`
  - `skills_learned`
  - `skill_to_logic_proposals`
  - `validation_results`
  - `approvals`
  - `deploy_outcomes`

## CI/Operations Notes

- Required CI path remains unchanged and strict: `build-and-lint`.
- Optional lineage smoke can be enabled by:
  - setting repository variable `CI_ENABLE_INTEGRATION_SMOKE=true`, or
  - manual dispatch with `run_integration_smoke=true`.
- Optional job is `continue-on-error: true` to avoid blocking required checks.

## Deferred / Future Enhancements

- CI step-summary annotation for optional smoke results.
- Expanded integration smoke assertions across filter combinations and cursor windows.

## Definition of Done

- [x] Runtime persistence in active CLI/API query and generation flows
- [x] Full workflow/proposal lifecycle lineage persistence in cycle execution
- [x] Lineage read APIs with filtering, sorting, and cursor pagination
- [x] SDK parity for lineage APIs
- [x] Documentation updated for usage and CI activation
- [x] Build and lint quality gates passing

## Closeout Statement

This lineage workflow is closed. The repository is in a validated state with
operational runtime lineage capture, queryable observability APIs, typed client
access, and repeatable smoke verification.
