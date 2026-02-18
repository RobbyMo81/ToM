# Plan

## Project Status (2026-02-18)

### Overall

- **State:** MVP complete and operationally verified.
- **Primary objective achieved:** ToM knowledge base transformed into a local vector memory system with cron orchestration, localhost API, and TypeScript SDK.
- **Policy update applied:** `.tom-workspace/**` is governance/identity context and is explicitly excluded from vector memory.

### Runtime Status

- ToM service was successfully started and health-checked.
- ToM service was intentionally stopped after verification (`/health` returns down when stopped).

## Debrief: What We Built

### 1) Core Brain (Vector Memory)

- Built local ingestion + chunking + embedding + vector retrieval pipeline.
- Embeddings use local Ollama (`nomic-embed-text`).
- Persistence uses local SQLite at `memory/tom_brain.sqlite`.

### 2) Predetermined Cycle Orchestration

- Implemented cron-driven cycle in the app runtime.
- Cycle contract:
  1.  Ollama health gate
  2.  Local ingestion (incremental by checksum)
  3.  Optional Brave enrichment
  4.  Cycle metrics report

### 3) HTTP API (Localhost)

- Added lightweight API on `127.0.0.1:8787` with endpoints:
  - `GET /health`
  - `GET /stats`
  - `POST /query`
  - `POST /ingest`
  - `POST /cycle`
- Optional bearer token auth via `TOM_API_TOKEN`.

### 4) TypeScript SDK

- Added typed client methods: `health`, `stats`, `query`, `ingest`, `cycle`.
- Promoted SDK to workspace package: `@tom/brain-sdk`.
- Added workspace build support and local dependency install pattern for sibling repos.

### 5) SOP/Governance Wiring

- **Included in vectors:** `automation/**/*.md` (SOP/autonomy/task execution runbooks).
- **Excluded from vectors:** `.tom-workspace/**` (identity/governance/behavior only).
- Added purge behavior during local ingest to remove any previously indexed `.tom-workspace` docs.

## Validation Summary

- TypeScript build checks passed after implementation updates.
- Cycle execution succeeded after installing missing embed model.
- OpenClaw query validation returned strong automation/runbook matches.
- Database sanity check confirmed `.tom-workspace` indexed count = `0`.

## Immediate Operating Notes

- Before cycle/ingest, ensure Ollama model is available:
  - `ollama pull nomic-embed-text`
- Start service: `npm start`
- Stop service: terminate active runtime terminal/process.

## Next Priorities

### Priority A (Near-term)

- Add query filters (`tag`, `pathPrefix`, `sourceType`) for deterministic SOP-only retrieval.
- Add lightweight `/sop/check` endpoint for automation-runbook coverage verification.

### Priority B (Deferred)

#### Shared API Contracts Package

- Keep as a **future enhancement**: create `@tom/brain-types`.
- Purpose: centralize shared API contracts between server and SDK.
- Benefit: stricter client/server version alignment across app family.
- Status: **Deferred** (not part of current implementation).

## Current Direction

- Continue using `@tom/brain-sdk` as the active integration package.
- Use `automation/` as the canonical SOP source for autonomous task behavior.
- Keep `.tom-workspace` out of vector memory as governance and identity layer.
- Use `../build/Build_OneTask_Template.md` as the default planning artifact so each future build captures both requirements and recommendations in one execution pass.
