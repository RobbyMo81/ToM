# As-Built Architecture Snapshot — 2026-02-19

Purpose: seed `memory/as-built.sqlite` with concise, searchable architecture state.

## Peer Review Progress

- peer_review_completed: `22/22`
- peer_review_pending: `0/22`
- last_progress_update: `2026-02-19`

## Record 1

- component_name: Vector Memory Store (`tom_brain.sqlite` / `as-built.sqlite`)
- last_updated_by: GitHub Copilot
- version_impact: additive (new as-built mirror DB and query scripts)
- current_state: SQLite-backed vector store persists `documents`, `chunks`, and `vectors` for retrieval.
- rationale: isolate builder troubleshooting queries in `as-built.sqlite` while preserving main runtime memory flow.
- component_relationships: populated by ingestion (`docs/**/*.md`) and consumed by `query`/`generate` paths.
- technical_validation: ingestion completed; counts verified in as-built DB.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 2

- component_name: Runtime Memory Store (`tom_runtime.sqlite`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (referenced for architecture traceability)
- current_state: persists sessions, workflow lineage, proposal lifecycle, and event telemetry.
- rationale: separate workflow state from vector retrieval to keep investigation data deterministic.
- component_relationships: used by CLI/API runtime paths and lineage endpoints.
- technical_validation: schema remains active via runtime initialization and live API usage.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 3

- component_name: Knowledge Ingestion Pipeline
- last_updated_by: GitHub Copilot
- version_impact: behavioral (as-built indexing now part of builder workflow)
- current_state: loader indexes `docs/**/*.md`; excludes `memory/**`, `automation/**`, root markdown, and generated output directories.
- rationale: constrain indexed scope to high-signal project docs and avoid noisy runtime artifacts.
- component_relationships: `knowledgeLoader` -> chunking -> embeddings -> vector upsert.
- technical_validation: `asbuilt:ingest` indexes current docs and updates vectors.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 4

- component_name: Builder Access Surface (`asbuilt:*` scripts)
- last_updated_by: GitHub Copilot
- version_impact: additive (new npm script interface)
- current_state: `asbuilt:ingest`, `asbuilt:query`, and `asbuilt:generate` target `memory/as-built.sqlite` without manual env overrides.
- rationale: reduce operator error and ensure consistent architecture investigations.
- component_relationships: wrapper script sets DB context and dispatches existing `ToMBrain` operations.
- technical_validation: `asbuilt:query` executed successfully and returned ranked architecture records.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 5

- component_name: Governance & Architecture Evidence Layer
- last_updated_by: GitHub Copilot
- version_impact: unchanged (indexed evidence emphasized)
- current_state: build plans, implementation backlog, debriefs, and CTO escalation docs are indexed for retrieval-grounded diagnostics.
- rationale: preserve rationale (`why`) alongside implementation state (`what`) for future builder continuity.
- component_relationships: `docs/build`, `docs/plans`, `docs/debriefs`, `docs/handoffs` feed retrieval context.
- technical_validation: query results include governance artifacts and escalation evidence files.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 6

- component_name: O.X.I.D.E Rust Runtime Integration
- last_updated_by: GitHub Copilot
- version_impact: unchanged from latest merge; included for as-built traceability
- current_state: Rust subsystem includes deterministic adapter guards, telemetry fields, and safe-mode fallback behavior.
- rationale: keep local model execution governable and observable under policy constraints.
- component_relationships: TypeScript governance/runtime layer coordinates with Rust execution telemetry and evidence docs.
- technical_validation: rust lint/build gates previously passing; architecture references retrievable from indexed docs.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 7

- component_name: HTTP API Surface (`src/api/httpServer.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (captured for as-built troubleshooting)
- current_state: exposes `GET /health`, `GET /stats`, `POST /query`, `POST /generate`, `POST /ingest`, `POST /cycle`, `GET /lineage/latest`, and `GET /lineage/runs` with optional bearer-token auth.
- rationale: provide local observability and query/generate entrypoints while preserving runtime lineage access.
- component_relationships: routes coordinate `ToMBrain` for retrieval/generation and `RuntimeMemoryStore` for lineage/session persistence.
- technical_validation: endpoint wiring and request/response guards are active in current source.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 8

- component_name: O.X.I.D.E Governance Engine (`src/core/oxideGovernance.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (governance model recorded)
- current_state: enforces canonical workflow stages (`discover -> propose -> validate -> approve -> promote`), role contracts, stage authorities, and deterministic policy decisions.
- rationale: prevent uncontrolled promotion paths and keep role routing fail-closed under policy constraints.
- component_relationships: consumed by orchestration/runtime flows to validate proposals and gate progression by authority.
- technical_validation: schema validation + policy decision helpers are implemented with explicit rejection paths.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 9

- component_name: Identity Binder (`src/core/identityBinder.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (identity contract captured)
- current_state: binds execution identity from `.tom-workspace/whoiam.md` for `tom` and `oxide` roles, emitting prompt class, source hash, version, and governance-bound system prompt.
- rationale: guarantee identity-scoped behavior and preserve traceable identity provenance for strict governance execution.
- component_relationships: used by runtime execution paths requiring identity-bound context; integrates with strict-mode binding errors.
- technical_validation: binder computes deterministic source hash/version and raises explicit unavailable-binding error codes when required.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 10

- component_name: Rust Ollama Adapter (`oxide-brain/src/ollama/mod.rs`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (runtime guardrails documented)
- current_state: enforces local-only Ollama base URL, caps temperature/tokens/retries/timeout, supports deterministic request envelope (`seed`, non-stream), and safe-mode fallback with telemetry.
- rationale: keep subsystem inference deterministic, bounded, and auditable under failure conditions.
- component_relationships: emits telemetry for inference outcomes and feeds governed execution behavior in the O.X.I.D.E runtime.
- technical_validation: adapter config/request/runtime error paths and tests are present in module.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 11

- component_name: Configuration & Auth Surface (`src/core/config.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (captured for operational troubleshooting)
- current_state: resolves environment-driven runtime config for vector DB path, runtime DB path, API host/port/token, Ollama models, cron schedules, and enrichment controls.
- rationale: centralize runtime toggles to keep deployment behavior deterministic and debuggable.
- component_relationships: consumed by CLI, API server, cycle jobs, sync jobs, and identity binder path resolution.
- technical_validation: config reader normalizes bool/number env values and applies safe defaults when unset.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 12

- component_name: Runtime Lineage Store (`src/integrations/runtimeMemoryStore.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (lineage persistence contract documented)
- current_state: persists sessions, conversation turns, workflow runs/steps/events, proposal lifecycle, approvals, deploy outcomes, and lineage summary views including identity and event annotations.
- rationale: maintain auditable workflow chronology separate from retrieval vectors.
- component_relationships: written by query/generate/cycle/API execution paths and read by lineage endpoints (`/lineage/latest`, `/lineage/runs`).
- technical_validation: bootstrap runs SQL migration, enforces foreign keys, and exposes typed summary responses for API/SDK consumers.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 13

- component_name: SDK Contract Surface (`src/sdk/types.ts`, `packages/tom-brain-sdk/src/types.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (contract parity captured)
- current_state: shared TypeScript interfaces define query/generate responses, health/stats payloads, and lineage schemas (including identity and annotation fields).
- rationale: preserve client/server compatibility and reduce integration drift for builders using the SDK.
- component_relationships: API handlers emit payloads aligned to SDK types; external clients consume SDK package contracts.
- technical_validation: mirrored type definitions in source and package workspace maintain schema parity for lineage/history payloads.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 14

- component_name: Cycle Scheduler (`src/jobs/cycleJob.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (scheduler wiring documented)
- current_state: `node-cron` schedules `ToMBrain.runCycle()` using `TOM_CRON_SCHEDULE` and records cron-triggered cycle reports.
- rationale: provide predictable autonomous ingestion/enrichment cadence without manual run orchestration.
- component_relationships: scheduler instantiates `ToMBrain`, executes cycle with `triggerSource=cron`, then shuts down resources.
- technical_validation: cron registration and try/catch/finally lifecycle are implemented in job module.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 15

- component_name: GitHub Sync Pipeline (`src/jobs/githubSyncJob.ts`, `src/integrations/githubReportSync.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (operational sync flow captured)
- current_state: scheduled sync fetches repository metadata + recent commits, writes `automation/github-report.md`, and optionally triggers local reindex.
- rationale: keep repository state visible in indexed docs so architecture investigation includes current repo activity.
- component_relationships: cron job gates concurrent runs; integration layer handles GitHub API fetch + report formatting; optional reindex uses `ToMBrain.ingestLocalKnowledge()`.
- technical_validation: guarded run-state flag prevents overlap; output path creation/write and API error handling are implemented.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 16

- component_name: WhoAmI Sync Automation (`src/integrations/whoiamSync.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (identity auto-sync behavior documented)
- current_state: watches configured files, computes hashes, updates auto-generated architecture section in `.tom-workspace/whoiam.md`, and persists sync state to `memory/whoiam-sync-state.json`.
- rationale: keep identity/architecture reference document current with source changes while preserving deterministic snapshot boundaries.
- component_relationships: consumes watch list from config, parses startup/API wiring hints, and writes both document and state cache artifacts.
- technical_validation: hash-diff detection, auto-section upsert markers, and state serialization paths are implemented.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 17

- component_name: Vector Store Internals (`src/integrations/vectorStore.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (storage/search mechanics captured)
- current_state: bootstraps `documents/chunks/vectors` tables in SQLite, upserts normalized records, purges stale local docs, and executes cosine-similarity top-K search from stored JSON vectors.
- rationale: maintain deterministic local retrieval behavior with explicit chunk/document lineage and controllable cleanup.
- component_relationships: ingestion pipeline writes documents/chunks/vectors; query/generate flows call `similaritySearch`; purge helpers keep local corpus in sync.
- technical_validation: table/index bootstrap + upsert/purge/search routines are active in runtime code.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 18

- component_name: Ollama Client Integration (`src/integrations/ollamaClient.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (LLM client behavior captured)
- current_state: wraps Ollama embedding (`/api/embeddings`), health checks (`/api/tags`), and non-streaming chat generation (`/api/chat`) with explicit error propagation.
- rationale: keep model access localized and predictable for retrieval + generation paths.
- component_relationships: `ToMBrain` uses embed calls for chunk/query vectors and chat calls for retrieval-grounded answer synthesis.
- technical_validation: response-shape guards and non-OK error paths are implemented for embedding and generation calls.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 19

- component_name: Chunking Strategy (`src/integrations/chunker.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (chunk pipeline semantics documented)
- current_state: normalizes markdown text, slices by configurable max chars + overlap, prefers paragraph/sentence boundaries, and emits deterministic chunk IDs/checksums.
- rationale: preserve retrieval quality while keeping chunk cardinality bounded and reproducible.
- component_relationships: ingestion pipeline calls `chunkDocument` before embedding + vector upsert.
- technical_validation: boundary fallback + overlap advance logic and deterministic hashing are active in current implementation.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 20

- component_name: API Authorization Guard (`src/api/httpServer.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (auth behavior captured)
- current_state: when `TOM_API_TOKEN` is configured, API enforces bearer-token authorization and returns `401` for missing/invalid token.
- rationale: protect local HTTP query/generate/lineage surfaces from unauthorized access while allowing tokenless local mode when unset.
- component_relationships: guard executes before route handlers; applies to health/query/generate/lineage endpoints uniformly.
- technical_validation: token parsing (`Authorization: Bearer ...`) and rejection response path are implemented in `isAuthorized` + request handler precheck.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 21

- component_name: Cycle Telemetry & Report Mapping (`src/core/brain.ts`, `src/core/types.ts`)
- last_updated_by: GitHub Copilot
- version_impact: unchanged (cycle observability contract documented)
- current_state: runCycle emits structured `CycleReport` metrics (`documentsDiscovered`, `documentsIndexed`, `chunksIndexed`, `webQueriesRun`, `webDocumentsIndexed`) and records governance/lineage events with identity + decision metadata.
- rationale: ensure each automated cycle is auditable from discovery through policy/deploy outcome.
- component_relationships: cycle execution writes workflow run/step/event/proposal/approval/deploy artifacts into runtime memory; API/SDK lineage responses consume this state.
- technical_validation: cycle report object construction and runtime-store event/proposal recording are active in production code path.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Record 22

- component_name: Conversation Compaction Policy (`.tom-workspace/AGENTS.md`, `.tom-workspace/whoiam.md`, `memory/README.md`)
- last_updated_by: GitHub Copilot
- version_impact: additive (policy codified in memory docs and as-built index)
- current_state: runtime conversation context compacts after `250,000` tokens; compacted runtime memory remains stored in `memory/tom_runtime.sqlite`.
- rationale: maintain investigation continuity while controlling active context size and token overhead.
- component_relationships: main session behavior references compaction policy; cron workflows continue running even when main context is compacted.
- technical_validation: compaction policy is documented in AGENTS/whoiam and mirrored in memory README for central discoverability.
- peer_review_status: approved (second-builder verification complete 2026-02-19)

## Linked Artifacts

- `memory/README.md`
- `src/integrations/knowledgeLoader.ts`
- `src/integrations/vectorStore.ts`
- `src/scripts/asBuiltCli.ts`
- `docs/build/Build_Instance_OXIDE_Skill_to_Logic.md`
- `docs/handoffs/CTO_Escalation_OXIDE_Remaining_Open_Tasks_2026-02-19.md`

## Peer Review Sign-off

Use this table to complete the required second-builder verification.

| Record | Reviewer | Date (YYYY-MM-DD) | Notes | Status (`approved`\|`needs-update`) |
| --- | --- | --- | --- | --- |
| 1 | Claude Sonnet 4.6 | 2026-02-19 | `documents`, `chunks`, `vectors` tables confirmed in `vectorStore.ts`; `as-built.sqlite` mirror set via `asBuiltCli.ts` env override. | approved |
| 2 | Claude Sonnet 4.6 | 2026-02-19 | `runtimeMemoryStore.ts` interfaces confirm sessions, turns, workflow runs/steps/events, proposal lifecycle, approvals, and deploy outcomes. | approved |
| 3 | Claude Sonnet 4.6 | 2026-02-19 | `knowledgeLoader.ts` uses `docs/**/*.md` with ignore for `memory/**`, `automation/**`, root `*.md`, `dist/**`, `packages/**`. `packages/**` not listed in record — not a material omission. | approved |
| 4 | Claude Sonnet 4.6 | 2026-02-19 | `asBuiltCli.ts` sets `VECTOR_DB_PATH="memory/as-built.sqlite"` at process start; supports `ingest`, `query`, `generate`. `package.json` scripts confirmed. | approved |
| 5 | Claude Sonnet 4.6 | 2026-02-19 | `docs/**/*.md` glob covers `docs/build`, `docs/plans`, `docs/debriefs`, `docs/handoffs`. Rationale and relationship description accurate. | approved |
| 6 | Claude Sonnet 4.6 | 2026-02-19 | `oxide-brain/src/ollama/mod.rs` confirms `validate_config` guardrails, `SafeModeNoOp` fallback, and `InferenceTelemetry`. | approved |
| 7 | Claude Sonnet 4.6 | 2026-02-19 | `httpServer.ts` also exposes `POST /ingest` and `POST /cycle` — both missing from original. `current_state` corrected in this review to list all eight routes with HTTP methods. | approved |
| 8 | Claude Sonnet 4.6 | 2026-02-19 | `oxideGovernance.ts` defines `OXIDE_WORKFLOW_STAGES`, role contracts, stage authorities, `assertRoleCanExecuteStage`, `validateCycleProposalPayload`, `decideCycleProposalPolicy`. | approved |
| 9 | Claude Sonnet 4.6 | 2026-02-19 | `WhoiamIdentityBinder` reads `.tom-workspace/whoiam.md`, emits `identitySourceHash`, `identityVersion`, `promptClass`, `systemPrompt` for `tom`/`oxide` roles. `IdentityBindingUnavailableError` code confirmed. | approved |
| 10 | Claude Sonnet 4.6 | 2026-02-19 | `validate_config` enforces local-only URL, temp ≤ 0.3, tokens ≤ 2048, retries ≤ 5, timeout ≤ 30000 ms. `seed` + `stream: false` envelope and `SafeModeNoOp` confirmed. | approved |
| 11 | Claude Sonnet 4.6 | 2026-02-19 | `config.ts` resolves `VECTOR_DB_PATH`, `RUNTIME_DB_PATH`, `TOM_API_HOST/PORT/TOKEN`, `OLLAMA_*`, `TOM_CRON_SCHEDULE`, `WEB_ENRICHMENT_*`, `BRAVE_API_KEY`, chunk/retrieval/generation settings. | approved |
| 12 | Claude Sonnet 4.6 | 2026-02-19 | `runtimeMemoryStore.ts` interfaces confirm sessions, turns, workflow runs/steps/events, proposals, validations, approvals, deploy outcomes, and lineage views with identity/annotation fields. | approved |
| 13 | Claude Sonnet 4.6 | 2026-02-19 | `src/sdk/types.ts` defines `QueryResponse`, `GenerateResponse`, `HealthResponse`, `StatsResponse`, lineage schemas, `LineageIdentitySummary`, `LineageEventAnnotations`. `packages/tom-brain-sdk/src/types.ts` confirmed present. | approved |
| 14 | Claude Sonnet 4.6 | 2026-02-19 | `cycleJob.ts` uses `node-cron` with `TOM_CRON_SCHEDULE`, calls `brain.runCycle({ triggerSource: "cron", initiatedBy: "scheduler" })`, shuts down in `finally`. | approved |
| 15 | Claude Sonnet 4.6 | 2026-02-19 | `githubSyncJob.ts` uses `running` boolean guard; calls `syncGitHubReport` writing `automation/github-report.md`; optionally calls `brain.ingestLocalKnowledge()`. | approved |
| 16 | Claude Sonnet 4.6 | 2026-02-19 | `whoiamSync.ts` reads watch-file hashes, upserts `WHOIAM_AUTO_SYNC:START/END` section in `.tom-workspace/whoiam.md`, writes state to `memory/whoiam-sync-state.json`. | approved |
| 17 | Claude Sonnet 4.6 | 2026-02-19 | `vectorStore.ts` bootstraps tables with FK/indexes; exposes upsert, `purgeLocalDocumentsByPathPrefix`, `purgeLocalDocumentsNotInSet`, and cosine-similarity `similaritySearch`. | approved |
| 18 | Claude Sonnet 4.6 | 2026-02-19 | `ollamaClient.ts` calls `/api/embeddings`, `/api/tags` (health), `/api/chat` (`stream: false`). Non-OK responses throw with status + body detail. | approved |
| 19 | Claude Sonnet 4.6 | 2026-02-19 | `chunker.ts` normalizes whitespace, slices by `maxChars`, prefers paragraph then sentence boundaries, computes `sha256` chunk IDs/checksums, advances with overlap. | approved |
| 20 | Claude Sonnet 4.6 | 2026-02-19 | `isAuthorized` parses `Authorization: Bearer`, returns `401` for missing/invalid token. Guard runs before all route handlers; OPTIONS pre-flight intentionally excluded. | approved |
| 21 | Claude Sonnet 4.6 | 2026-02-19 | `CycleReport` in `types.ts` has all five listed metrics plus `startedAt`/`finishedAt`. `runCycle` records LearnedSkill, Proposal, ValidationResult, Approval, Deploy with identity metadata. | approved |
| 22 | Claude Sonnet 4.6 | 2026-02-19 | `memory/README.md` documents 250,000-token compaction threshold and `tom_runtime.sqlite` as target. Policy references in `AGENTS.md` and `whoiam.md` confirmed. | approved |
