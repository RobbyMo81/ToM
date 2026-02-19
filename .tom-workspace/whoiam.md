# whoiam.md — ToM Build Identity (Living Document)

This is the living technical identity of ToM.

Purpose:

- Explain how ToM is built.
- Map major logic paths and runtime behavior.
- Provide machine-readable architecture context using Mermaid for LLM reasoning.
- Keep governance/identity context in `.tom-workspace` (not vectorized).

---

## 1) System Identity

ToM is a local-first knowledge brain with:

- TypeScript runtime
- Local embeddings via Ollama
- Local vector persistence via SQLite
- Scheduled orchestration (cron)
- Localhost HTTP API
- Workspace SDK (`@tom/brain-sdk`)
- GitHub report sync cron
- Runtime lifecycle lineage memory (sessions, workflow runs, proposals)
- WhoAmI sync cron for living architecture state

Knowledge policy:

- Exclude in vector memory: root markdown + `automation/**/*.md`
- Excluded from vector memory: `.tom-workspace/**` (governance, behavior, identity)

---

## 2) Core Runtime Topology

```mermaid
flowchart TD
   subgraph Definitions [".agents/ (Logic & Role)"]
      ToM_Role[ToM: Primary Executive]
      OXIDE_Role[O.X.I.D.E: Technical Subsystem]
   end

   subgraph Entry ["System Entrypoint (src/index.ts)"]
      A[index.ts] --> B[Initialize Services]
   end

   subgraph Workspace [".tom-workspace/ (The Mirror)"]
      W1[whoiam.md]
      W2[Identity Traits & Constraints]
      W1 --> W2
   end

   subgraph Binding ["Identity Binding Layer"]
      direction TB
      B1[Load Workspace Traits]
      B2[Inject System Prompt]

      ToM_Role & W2 --> B1
      OXIDE_Role & W2 --> B1
      B1 --> B2
   end

   subgraph Execution ["Bound LLM Instances"]
      B2 --> ToM_Instance["ToM (Bound to Persona)"]
      B2 --> OXIDE_Instance["O.X.I.D.E (Bound to Helper Role)"]
   end

  subgraph OxideEngine ["O.X.I.D.E Rust Executor (External Subsystem)"]
    OE1[oxide CLI / JSON-RPC]
    OE2[Refactor / Upgrade Engine]
    OE3[CI Validation + Evidence]
    OE4[Patch + PR Artifacts]
    OE5[Monitor + Rollback Hooks]
    OE1 --> OE2 --> OE3 --> OE4 --> OE5
  end

   subgraph Core ["Logic Engine (ToMBrain)"]
      ToM_Instance --> F[runCycle]
      OXIDE_Instance --> F
    F --> OE1
      F --> G[Ollama Health]
      F --> H[ingestKnowledge]
   end

   Definitions --> Entry
   Entry --> Workspace
   Workspace --> Binding
   Binding --> Execution
   Execution --> Core

   style Binding fill:#fff3e0,stroke:#ff9800,stroke-width:2px
   style ToM_Instance fill:#4A90E2,stroke:#fff,color:#fff
   style OXIDE_Instance fill:#50E3C2,stroke:#333
  style OxideEngine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
   style Workspace fill:#fff9c4,stroke:#fbc02d
```

### 2.X O.X.I.D.E Two-Layer Implementation Model (Role + Executor)

O.X.I.D.E is implemented as two coupled layers:

1. O.X.I.D.E Instance (Bound LLM Role)
  - Role-bound reasoning persona operating inside ToM via Identity Binding.
  - Produces scoped proposals, plans, and technical reasoning.
  - Cannot directly modify code or promote deployments.
2. `oxide` Rust Executor (Deterministic Engine)
  - External Rust subsystem invoked by ToM (CLI/RPC).
  - Performs deterministic refactors/upgrades, CI validation, and evidence
    capture.
  - Operates under governance policy, approval checks, and scoped autonomy
    token rules.

Rule: O.X.I.D.E Instance proposes; `oxide` executes. All code/config changes
must be produced via the Rust executor pathway and promoted only through
governed CI/CD.

### 2.1 Identity Bind Implementation Pattern

To ensure the LLM cannot drift from identity constraints, the binding layer
must follow this pattern:

1. Trait Extraction
   - `startWhoiamSyncJob` parses `whoiam.md` into a structured JSON object.
2. System Prompt Hardening
   - before any call to Ollama `/generate` or `/query`, the system prepends
     identity traits.
   - ToM receives the Executive/Strategic block.
   - O.X.I.D.E receives the Subsystem/Operational block.
3. Validation
   - `RuntimeMemoryStore` lineage logs which identity was active during each
     cycle or request, ensuring O.X.I.D.E does not perform ToM-level executive
     overrides.

### 2.2 Implementation Status (Planning vs Runtime)

- Implemented
  - Runtime lineage persistence and lifecycle tracking in ToM runtime DB.
  - Lineage API visibility via `/lineage/latest` and `/lineage/runs`.
  - WhoAmI sync scheduling and living-document update pipeline.
- Partial
  - Identity-oriented governance is documented, but explicit per-request
    identity binding metadata is not yet enforced on all query/generate paths.
- Planned (not yet implemented)
  - Formal Identity Binder middleware that injects role-specific system prompts
    before every LLM call.
  - Role-separated runtime enforcement that guarantees ToM executive vs
    O.X.I.D.E subsystem boundaries at execution time.
  - Dedicated O.X.I.D.E Rust executor subsystem (`oxide`) invoked by ToM for
    deterministic refactors, CI validation, and evidence capture (may include
    localized Ollama-backed bounded reasoning).

---

## 3) Logic Paths (Source of Truth)

### Boot Path

1. `src/index.ts`
   - starts cycle cron
   - starts GitHub sync cron
   - starts WhoAmI sync cron
   - starts HTTP API

### Cycle Path

1. `src/jobs/cycleJob.ts`
2. `src/core/brain.ts::runCycle()`
3. `src/integrations/knowledgeLoader.ts` (local docs)
4. `src/integrations/chunker.ts` (chunking)
5. `src/integrations/ollamaClient.ts` (embeddings)
6. `src/integrations/vectorStore.ts` (persistence + retrieval)

### ToM ↔ `oxide` Executor Interface (v1)

- Transport: local process invocation + stdin/stdout JSON-RPC (preferred v1)
- Executor entrypoint: `oxide` binary on PATH or configured path
- Evidence output: `.tom-workspace/proposals/<proposal_id>/evidence/`
- Hard requirement: `oxide validate` must PASS before PR merge or deploy
  promotion is permitted

### GitHub Sync Path

1. `src/jobs/githubSyncJob.ts`
2. `src/integrations/githubReportSync.ts`
3. output file: `automation/github-report.md`
4. optional local reindex (`GITHUB_SYNC_REINDEX=true`)

### API Path

1. `src/api/httpServer.ts`
2. endpoints:
   - `GET /health`
   - `GET /stats`
   - `GET /lineage/latest`
   - `GET /lineage/runs`
   - `POST /query`
   - `POST /generate`
   - `POST /ingest`
   - `POST /cycle`

### Runtime Lineage Path

1. `src/core/brain.ts::runCycle(options)`
2. `src/integrations/runtimeMemoryStore.ts`
3. tables:
   - `sessions`, `conversation_turns`
   - `workflow_runs`, `workflow_steps`, `task_events`
   - `skills_learned`, `skill_to_logic_proposals`
   - `validation_results`, `approvals`, `deploy_outcomes`

---

## 4) Key Build Logic Snippets

### Startup orchestration

```ts
startCycleJob();
startGitHubSyncJob();
startWhoiamSyncJob();
startHttpApi();
```

### Governance purge during ingest

```ts
const governanceDir = path.resolve(this.config.knowledgeDir, ".tom-workspace");
this.vectors.purgeLocalDocumentsByPathPrefix(governanceDir);
```

### Included local patterns

```ts
const patterns = ["docs/**/*.md"];
```

### GitHub report scheduler guard

```ts
if (running) {
  logger.warn("GitHub sync skipped: previous run still active.");
  return;
}
```

### GitHub report output

```ts
await writeFile(outputFile, report, "utf8");
```

---

## 5) Configuration Surface (Operational Controls)

Primary env controls:

- `TOM_CRON_SCHEDULE`
- `GITHUB_SYNC_ENABLED`
- `GITHUB_SYNC_SCHEDULE`
- `GITHUB_SYNC_OWNER`
- `GITHUB_SYNC_REPO`
- `GITHUB_TOKEN`
- `GITHUB_SYNC_OUTPUT_FILE`
- `GITHUB_SYNC_REINDEX`
- `OLLAMA_BASE_URL`
- `OLLAMA_EMBED_MODEL`
- `VECTOR_DB_PATH`
- `TOM_API_ENABLED`
- `TOM_API_HOST`
- `TOM_API_PORT`
- `TOM_API_TOKEN`
- `TOM_RUNTIME_DB_PATH`
- `WHOIAM_SYNC_SCHEDULE`
- `WHOIAM_DOC_PATH`
- `WHOIAM_SYNC_STATE_PATH`
- `WHOIAM_SYNC_WATCH_FILES`

---

## 6) Mermaid + LLM Usage Model (Required Guidance)

Large Language Models (LLMs) can effectively utilize Mermaid diagrams for:

1. **Task Processing**  
   LLMs can process complex tasks by mapping branching and looping operations.

2. **Information Extraction**  
   LLMs can extract entities/relationships from text and visualize structure.

3. **Flowchart Generation**  
   LLMs can convert text procedures into Mermaid syntax for workflow clarity.

4. **Benchmarking**  
   Mermaid sequence benchmarking can evaluate structured reasoning in diagram form.

These capabilities improve ToM’s internal understanding and reasoning traceability.

### 6.1 Task Processing Diagram

```mermaid
flowchart LR
    Q[Incoming Task] --> T{Task Type}
    T -->|Query| R[Embed question]
    R --> S[Similarity search]
    S --> O[Return ranked chunks]

    T -->|Ingest| D[Load docs]
    D --> C[Chunk]
    C --> E[Embed]
    E --> V[Persist vectors]

    T -->|Sync| G[Fetch GitHub data]
    G --> W[Write report]
    W --> I[Optional reindex]
```

### 6.2 Information Extraction Diagram

```mermaid
graph TD
   A[docs/**/*.md] --> B[Entity extraction]
    B --> C[commands]
    B --> D[schedules]
    B --> E[event hooks]
    C --> F[operational memory]
    D --> F
    E --> F
```

### 6.3 Sequence Diagram for Cron GitHub Sync

```mermaid
sequenceDiagram
    participant Cron as GitHub Cron
    participant Sync as syncGitHubReport
    participant GH as GitHub API
    participant FS as File System
    participant Brain as ToMBrain

    Cron->>Sync: trigger on schedule
    Sync->>GH: GET /repos/{owner}/{repo}
    Sync->>GH: GET /commits?per_page=5
    GH-->>Sync: repo + commits payload
    Sync->>FS: write automation/github-report.md
    Sync-->>Cron: sync result
    Cron->>Brain: ingestLocalKnowledge() (optional)
```

---

## 7) Safety & Identity Boundaries

- `.tom-workspace` is governance and identity layer.
- It must remain non-vectorized to avoid retrieval leakage.
- Automation runbooks in `automation/` are the SOP/autonomy execution layer and
  are currently excluded from vector memory under planning-mode policy.
- O.X.I.D.E automation ownership and directory-level alignment contract are
  documented in `automation/README.md` (traceability index).
- `docs/reference/` is reserved for ToM and O.X.I.D.E-specific memory
  artifacts only.
- Rust executor boundary: all code/config changes must be executed via `oxide`
  and must produce CI evidence artifacts before promotion.
- Autonomy gating: autonomous execution is prohibited while final gate is
  NO-GO unless a formally recorded, valid, time-bounded, project-scoped HITL
  override token exists.
- Token storage: approvals, scoped autonomy tokens, and NO-GO override tokens
  are stored in `.tom-workspace/**` and remain excluded from vector memory.
- Any change to these boundaries must update:
  - `src/integrations/knowledgeLoader.ts`
  - `src/core/brain.ts` (purge behavior)
  - `README.md`
  - this file

---

## 8) Update Protocol (Living Document)

Update this file whenever any of these change:

- startup wiring (`src/index.ts`)
- cron jobs/schedules
- ingestion policy
- vector schema/retrieval path
- API surface
- SDK package contract

Recommended change block:

```md
### Change Log Entry

- Date:
- Change:
- Files touched:
- Runtime impact:
- Backward compatibility notes:
```

Enhancement completion protocol:

- Follow `docs/plans/Plan-Topology_Compliance_Phase_Checklist.md` completion flow.
- Once complete, update `2.2 Implementation Status (Planning vs Runtime)` and
  `9) Current Build Snapshot` in this file to reflect final runtime state.
- Mirror completion evidence in:
  - `docs/debriefs/Lineage_Workflow_Closeout_Debrief_2026-02-18.md`
  - `docs/handoffs/Handoff Report.md`

---

## 9) Current Build Snapshot

- Runtime: TypeScript + Node 20+
- Vector DB: SQLite (`memory\\tom_brain.sqlite`)
- Runtime DB: SQLite (`memory\\tom_runtime.sqlite`)
- Embeddings: Ollama (`nomic-embed-text`)
- API: `127.0.0.1:8787`
- Schedulers:
  - ToM cycle cron
  - GitHub report sync cron
  - WhoAmI sync cron
- SDK: `@tom/brain-sdk`
- GitHub report output: `automation/github-report.md`
- Lineage observability:
  - `GET /lineage/latest`
  - `GET /lineage/runs` (filters + cursor pagination)
- Verification status:
  - `npm run build` PASS
  - `npm run lint:all` PASS
  - `npm run lineage:smoke` available for API pagination smoke
- Rollback readiness:
  - savepoint created at `rollback/savepoints/2026-02-18_145259`

### 9.1 Database Definitions (Aligned with AGENTS)

- `sql\\001_runtime_memory_v1.sql` is the institutional and researched
  knowledge schema source, aggregated from:
  - `./docs/build`
  - `./docs/debriefs`
  - `./docs/handoffs`
  - `./docs/lessons`
  - `./docs/plans`
- `memory\\tom_brain.sqlite` is the Chroma-style long-term AI/LLM memory
  store (Python-managed) for ToM SOPs, self-improvement plans, and
  `docs\\reference` content.
- `memory\\tom_runtime.sqlite` is the session communication store between ToM,
  Users, and O.X.I.D.E; it is not the primary long-term memory store but may
  hold persistent memory.
- Runtime compaction policy: compact after 250,000 tokens.
- Compacted memories are stored in long-term memory at
  `memory\\tom_runtime.sqlite`.

---

<!-- WHOIAM_AUTO_SYNC:START -->

## 10) Auto-Sync Architecture Snapshot (Generated)

This section is auto-maintained by the WhoAmI sync cron.

- synced_at: 2026-02-19T00:08:16.704Z
- watched_files: 11
- changed_files: 11

### Detected Runtime Wiring

- startup_jobs: startCycleJob(), startGitHubSyncJob(), startWhoiamSyncJob(), startHttpApi()
- api_endpoints: /health, /stats, /lineage/latest, /lineage/runs, /query, /generate, /ingest, /cycle

### Changed Files Since Last Sync

- src/index.ts
- src/core/config.ts
- src/core/brain.ts
- src/integrations/knowledgeLoader.ts
- src/integrations/vectorStore.ts
- src/api/httpServer.ts
- src/jobs/cycleJob.ts
- src/jobs/githubSyncJob.ts
- src/integrations/githubReportSync.ts
- package.json
- README.md

### Watched File Hashes

- src/index.ts: 5a3348551d2bfe7bc04046d94d0fd09112c23b543b32f893fca000948aaf0aaa
- src/core/config.ts: 399bf5b498c1c0cd412ed73d0d5780e0c8f8311ef2fb5cf70b653c0347136258
- src/core/brain.ts: 02273bff291b36ee707fdd6f610c10c5045c8052269343b0167ca14a0e1b3bc8
- src/integrations/knowledgeLoader.ts: 8776f197ac4eef53c08c6e308545fc887d15ec0503d4f1b43f517f2452bf45a3
- src/integrations/vectorStore.ts: f00b9175bec887bc7981923534fc2c6e02984c50994c615718de5c6f5e73cf4b
- src/api/httpServer.ts: aaac6e8d900a5d606dbb64061ac9d70321dd0e534f17c8bde79eeef4d6b5420f
- src/jobs/cycleJob.ts: 0f387a4ac41aa8c841f5c51753dded7734a59dd2eda161fa13fd0027f544da73
- src/jobs/githubSyncJob.ts: da021b9721076d8b6db01b053805817d168faeec79a82f8e766dcdf034a42aed
- src/integrations/githubReportSync.ts: 49384c8df49781f378f0f88c0f5d22576bf6a4b98f81ce69b1222de24619d2ad
- package.json: e9fe548bf143ce8eb74205ed6801f91eda8ec33e38ef899c28216a430aa721f4
- README.md: f86f77fc412c73d9ef3f4eec78ee8cbd01f984eb1e9cde6ae546a682f5c53522

<!-- WHOIAM_AUTO_SYNC:END -->
