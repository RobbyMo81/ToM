# Memory Directory Summary

This folder contains runtime data and local state for ToM.

## Files

### `tom_brain.sqlite`

Purpose:

- Long-term memory database for retrieval and generation context.
- Stores document metadata, chunks, vectors, and similarity-search data.

Primary use:

- Read/write by ingestion, retrieval (`query`), and generation (`generate`) paths.
- Backing store for semantic search relevance.

Do not treat as:

- governance timeline store
- workflow/approval/audit source of truth

---

### `tom_runtime.sqlite`

Purpose:

- History-context and current-workflow system-of-record.
- Stores sessions, conversation turns, workflow runs/steps/events, learned skills,
  proposal lifecycle, validations, approvals, and deploy outcomes.

Primary use:

- Read/write by runtime-memory integration paths (`cli`, API, and cycle execution).
- Backing store for lineage endpoints:
  - `GET /lineage/latest`
  - `GET /lineage/runs`

Do not treat as:

- vector similarity index
- embedding/chunk store

---

### `whoiam-sync-state.json`

Purpose:

- State cache for WhoAmI sync job.
- Tracks watched file hashes and last sync metadata used to update
  `.tom-workspace/whoiam.md` auto-generated section.

---

## Separation of Concerns

- `tom_brain.sqlite` = long-term memory (what the system has learned for retrieval)
- `tom_runtime.sqlite` = history context + current workflow memory (what is happening now and why)

This separation is intentional and should be preserved.

## Operational Notes

- Back up both SQLite files together to preserve retrieval + runtime continuity.
- For clean-room resets, remove databases only when intentional and documented.
- Avoid manual writes to these files outside controlled migration/runtime paths.
