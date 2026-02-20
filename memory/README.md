# Memory Directory Summary

This folder contains runtime data and local state for ToM.

## Files

### `SOP.md`

Purpose:

- Living standard operating procedure for LLM agents in this workspace.
- Defines required startup behavior and update expectations for recurring workflows.

Primary use:

- Read at the start of every agent session.
- Update when operating procedures, safeguards, or recurring practices change.

---

### `as-built.sqlite`

Purpose:

- Point-in-time vector database representing the current as-built architecture
  state.
- Builder-facing troubleshooting index for architecture investigation.

Primary use:

- Query independently when validating architecture behavior or regressions.
- Refresh via ingestion when architecture/state changes are deployed.

---

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

## Conversation Compaction

- Runtime compaction policy: compact conversation/runtime context after
  `250,000` tokens.
- Compaction target: compacted runtime memory remains stored in
  `memory/tom_runtime.sqlite`.
- Operational expectation: compaction must preserve investigation continuity
  while reducing active context size.
- Canonical policy references:
  - `.tom-workspace/AGENTS.md`
  - `.tom-workspace/whoiam.md`

## Architectural Alignment & Vector Memory Integration

To reduce manual alignment overhead, `memory/tom_brain.sqlite` functions as the
Living Architecture Blueprint for retrieval and troubleshooting context.

### Operating directives

- Immediate action: populate vector memory with the current architectural state.
- Ongoing maintenance: update vector memory concurrently with any architectural
  change or feature deployment.
 - Reports and verification artifacts: include `docs/reports/**/*.md` as a
   source for as-built snapshots and verification artifacts used during
   architecture investigations.
- Operational constraint: keep entries concise and investigation-focused; avoid
  redundant code dumps.
- Success metric: memory reflects the 1:1 state of production so any builder can
  investigate issues without external consultation.
- Seeded architecture snapshot source doc: `docs/reference/AsBuilt_Architecture_Snapshot_2026-02-19.md`.

## Architecture Update: Definition of Done

- Accuracy and alignment: each entry matches the 1:1 current architecture and
  is updated concurrently with deployment to prevent stale memory.
- Conciseness (signal over noise): include only what is needed for
  investigation; prioritize rationale and component relationships over code
  duplication.
- Standardized metadata: every entry includes mandatory fields at minimum:
  `component_name`, `last_updated_by`, and `version_impact`.
- Technical validation:
  - Embedding consistency: new data uses the same embedding function as the
    existing collection.
  - Persistence check: updates are persisted under `memory/` and queryable by
    other builders.
- Traceability: capture the architectural rationale (the why), not only the
  implementation outcome (the what).
- Peer review: at least one additional builder verifies clarity and technical
  accuracy.
- Accessibility: keep language clear and place records in central `memory/`
  artifacts for team access.

## Execution Standards for Builders

- Contemporaneous updates: document architecture changes as they happen, not in
  end-of-sprint batches.
- Visual aids: when relationships are complex, reference or link diagrams.
- Routine maintenance: periodically prune orphaned data and fragmented indexes
  to preserve retrieval quality and performance.

## Automation Note

- Peer-review progress in
  `docs/reference/AsBuilt_Architecture_Snapshot_2026-02-19.md` is auto-updated
  during pre-commit via `npm run asbuilt:progress`.
- The pre-commit hook stages the refreshed snapshot before markdown linting.
