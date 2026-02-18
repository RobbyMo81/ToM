# Plan — SOP + Automation Wiring for ToM Brain

## Objective

Keep `.tom-workspace` as governance/identity behavior context (not vectorized), and wire `automation/` as SOP/autonomy runbooks into ToM Brain retrieval + cycle updates.

## Research Findings (Current Implementation)

### Existing flow

- Local ingestion runs through `loadKnowledgeDocs()` in `src/integrations/knowledgeLoader.ts`.
- Cycle execution calls local ingestion in `ToMBrain.runCycle()` (`src/core/brain.ts`).
- API and SDK query the same vector store, so anything ingested is immediately available through `/query` and `@tom/brain-sdk`.

### Gap identified

- The prior loader pattern only indexed top-level `*.md` files.
- `automation/*.md` was not included as SOP/autonomy memory.
- Governance docs from `.tom-workspace` should not be embedded or retrievable.

## Wiring Implemented

### 1) Automation SOP ingestion

`src/integrations/knowledgeLoader.ts` now includes:

- `*.md`
- `automation/**/*.md`

### 2) Context tags for retrieval relevance

Documents are now tagged by source path:

- `automation/**` → `sop`, `automation`, `autonomy`, `runbook`, `operations`, `task-execution`

### 3) Governance exclusion + purge

- `.tom-workspace/**` is excluded from ingestion.
- Any previously indexed `.tom-workspace` local docs are purged during `ingestLocalKnowledge()`.

### 4) Cycle/API/SDK inheritance

No new orchestration code needed:

- `npm run cycle`, `POST /cycle`, and cron all call the same ingestion path.
- Queries from CLI/API/SDK automatically include automation SOP vectors once indexed.

## How to use this wiring

1. Run `npm run ingest` or `npm run cycle`.
2. Query with operational prompts, e.g.:
   - "How should cron jobs be used vs heartbeat?"
   - "What hook event should trigger session memory save?"

## Suggested future enhancements

- Add metadata filters in API query route (`area`, `tag`, `sourcePathPrefix`) for deterministic retrieval slices.
- Add a dedicated endpoint `/sop/check` that verifies required automation SOP files exist and are indexed.
- Add nightly cycle report fields for automation SOP document counts.
