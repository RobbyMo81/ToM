# ToM Brain

ToM Brain converts your markdown knowledge base into a local, queryable vector memory system.

It classifies files into your three domains:

- `Learn*` → Learn
- `Lesson*` / `Lessons*` → Lesson
- `Plan*` → Plan

## What this service does

1. Ingests markdown from this folder
2. Chunks documents into semantically-sized blocks
3. Embeds chunks using local Ollama models
4. Stores vectors + metadata in local SQLite (`memory/tom_brain.sqlite`)
5. Optionally enriches memory with Brave web search snapshots
6. Runs on cron using a predefined cycle

### Included knowledge sources

Local ingestion now includes:

- project documentation in `docs/**/*.md`

Local ingestion explicitly excludes:

- root markdown files (`*.md`)
- automation SOP runbooks (`automation/**/*.md`)
- `.tom-workspace/**` (governance/identity/behavior context only; not vectorized)

Operational source tags are added automatically for retrieval quality:

- automation SOP docs are intentionally excluded from vector memory under the current planning-mode policy.

## Predetermined Cycle of Operations

Every cron run (`TOM_CRON_SCHEDULE`) executes:

1. **Health Gate**: verify Ollama connectivity
2. **Local Ingestion**: scan + incrementally index changed docs
3. **Web Enrichment**: run configured Brave queries and index snapshots
4. **Memory Report**: return cycle metrics for orchestration/logging

### Memory Roles

- `memory/tom_brain.sqlite` = long-term memory for retrieval knowledge.
- `memory/tom_runtime.sqlite` = history context + current workflow memory.

## GitHub Report Sync Cron

ToM can sync a GitHub repository report on its own interval and write it to markdown.

- Schedule config: `GITHUB_SYNC_SCHEDULE`
- Default output file: `automation/github-report.md`
- Optional auth/rate-limit token: `GITHUB_TOKEN`
- Optional automatic reindex after sync: `GITHUB_SYNC_REINDEX=true`

This is a separate cron job from `TOM_CRON_SCHEDULE`.

## WhoAmI Living-Document Sync Cron

ToM can auto-maintain `.tom-workspace/whoiam.md` as a living architecture/system-logic document.

- Schedule config: `WHOIAM_SYNC_SCHEDULE`
- Document path: `WHOIAM_DOC_PATH` (default `.tom-workspace/whoiam.md`)
- State file: `WHOIAM_SYNC_STATE_PATH` (default `memory/whoiam-sync-state.json`)
- Watched files: `WHOIAM_SYNC_WATCH_FILES` (pipe-separated relative paths)

When watched files change, ToM updates an auto-generated snapshot section in `whoiam.md`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create local env file:
   ```bash
   copy .env.example .env
   ```
3. Start Ollama and pull embedding model:
   ```bash
   ollama pull nomic-embed-text
   ollama pull llama3.1:8b
   ```
4. Add your Brave API key in `.env` (`BRAVE_API_KEY=...`)

## Commands

- One-time local index:
  ```bash
  npm run ingest
  ```
- Initialize runtime memory DB schema:
  ```bash
  npm run runtime:init
  ```
- Semantic query:
  ```bash
  npm run query -- "What lessons did I record about SSH hardening?"
  ```
- Retrieval-grounded generation:
  ```bash
  npm run generate -- "Summarize what I learned about SSH hardening"
  ```
- Run one full cycle:
  ```bash
  npm run cycle
  ```
- Run GitHub report sync once:
  ```bash
  npm run github:sync
  ```
- Run WhoAmI living-document sync once:
  ```bash
  npm run whoiam:sync
  ```
- Run lint suite:
  ```bash
  npm run lint:all
  ```
- Run lineage pagination smoke test (API must be running):
  ```bash
  npm run lineage:smoke
  ```
- Start cron scheduler:
  ```bash
  npm run build
  npm start
  ```
- Start API + scheduler in dev:
  ```bash
  npm run api
  ```

## Build Planning Template

Use the one-task planning template for all future build efforts:

- `docs/build/Build_OneTask_Template.md`

Methodology gold standard for promoting plans to implementations:

- `docs/reference/ToM_Methodology_Standard.md`

Mandatory usage scope:

- upgrades
- enhancements
- builds
- tool creation
- skill creation

This template ensures each build includes:

- must-have requirements
- recommendations and defer/implement decisions
- quality gates and evidence
- CI/policy requirements
- external action ownership
- debrief-ready verification logs

Any implementation plan is considered non-compliant unless it references and follows the methodology standard.

## Git Hooks

This repo uses Husky + Commitlint.

- `pre-commit` runs `npm run build`, `npm run lint`, and `npm run lint:md`
- `commit-msg` enforces Conventional Commits via Commitlint
- commit scope is required (e.g. `feat(brain): ...`)
- commit subject must be concise, lowercase style, and no trailing period
- commit header max length is 100 characters

Examples:

- `feat(brain): add whoiam sync cron`
- `fix(api): handle empty query payload`

See detailed commit guide: `.github/COMMIT_CONVENTION.md`

## CI and Branch Protection

- CI workflow: `.github/workflows/ci.yml`
- Trigger: push + pull request on `main`
- Required commands in CI:
  - `npm ci`
  - `npm run build`
  - `npm run lint:all`
- Optional non-blocking integration job:
  - `lineage-smoke` (runs `npm run lineage:smoke` against live API)
  - Enable by setting repository variable `CI_ENABLE_INTEGRATION_SMOKE=true`
  - Or run manually via `workflow_dispatch` with `run_integration_smoke=true`

Recommended GitHub repo settings follow-up:

1. Enable branch protection on `main`
2. Require pull request before merge
3. Require status checks before merge
4. Add required status check: `build-and-lint`

## Integration in your AI system family

This service is designed as a memory subsystem. In your other apps:

- invoke `npm run cycle` from orchestrators when needed, or keep scheduler running
- call `npm run query -- "..."` for retrieval
- read cycle metrics from stdout logs

## Localhost HTTP API

By default the API binds to `127.0.0.1:8787`.

### Endpoints

- `GET /health` → service heartbeat
- `GET /stats` → vector count
- `GET /lineage/latest` → latest workflow + proposal lifecycle summary
- `GET /lineage/runs?limit=20&order=asc&cursor=<cursor>&status=succeeded&triggerSource=cron&startedAfter=2026-02-18T00:00:00.000Z&startedBefore=2026-02-18T23:59:59.999Z` → recent workflow lineage history with optional filters and cursor pagination
- `POST /query` with JSON body `{ "question": "...", "topK": 8 }`
- `POST /generate` with JSON body `{ "question": "...", "topK": 8 }`
- `POST /ingest` → run local markdown ingestion
- `POST /cycle` → run full predetermined cycle

### Examples

```bash
curl http://127.0.0.1:8787/health
```

```bash
curl -X POST http://127.0.0.1:8787/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What lessons did I record about SSH hardening?","topK":6}'
```

```bash
curl -X POST http://127.0.0.1:8787/generate \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize what I learned about SSH hardening.","topK":6}'
```

```bash
curl http://127.0.0.1:8787/lineage/latest
```

```bash
curl "http://127.0.0.1:8787/lineage/runs?limit=20"
```

```bash
curl "http://127.0.0.1:8787/lineage/runs?limit=20&order=asc"
```

```bash
curl "http://127.0.0.1:8787/lineage/runs?limit=20&order=desc&cursor=2026-02-18T20:00:00.514Z|a1a3540a-0b6f-4614-ba14-7701a6ad866b"
```

```bash
curl "http://127.0.0.1:8787/lineage/runs?limit=20&status=succeeded&triggerSource=cron"
```

```bash
curl "http://127.0.0.1:8787/lineage/runs?limit=20&order=asc&status=succeeded&triggerSource=cron&startedAfter=2026-02-18T00:00:00.000Z&startedBefore=2026-02-18T23:59:59.999Z"
```

### Optional auth

If you set `TOM_API_TOKEN`, all requests must include:

```text
Authorization: Bearer <your-token>
```

## TypeScript SDK (for sibling apps)

Use the workspace package `@tom/brain-sdk` for typed local calls.

### Import

```ts
import { ToMBrainClient } from "@tom/brain-sdk";
```

### Usage

```ts
const client = new ToMBrainClient({
  baseUrl: "http://127.0.0.1:8787",
  token: process.env.TOM_API_TOKEN,
});

const health = await client.health();
const stats = await client.stats();
const lineage = await client.lineageLatest();
const lineageRuns = await client.lineageRuns({
  limit: 20,
  order: "asc",
  status: "succeeded",
  triggerSource: "cron",
  startedAfter: "2026-02-18T00:00:00.000Z",
  startedBefore: "2026-02-18T23:59:59.999Z",
});

const nextPage = lineageRuns.page.nextCursor
  ? await client.lineageRuns({
      limit: 20,
      order: "asc",
      cursor: lineageRuns.page.nextCursor,
    })
  : null;
const query = await client.query("What lessons did I record about SSH hardening?", 6);
const generated = await client.generate("Summarize what I learned about SSH hardening.", 6);
```

## Generation controls

Generation behavior can be tuned with environment variables:

- `GENERATE_MAX_CONTEXT_CHARS` (default `8000`)
- `GENERATE_MAX_RESPONSE_TOKENS` (default `600`)
- `GENERATE_TEMPERATURE` (default `0.2`)
- `GENERATE_SYSTEM_PROMPT` (grounding instruction for generated responses)

Operational caveat: generation quality and latency depend on local model availability (`OLLAMA_CHAT_MODEL`) and host capacity.

### Example runner

```bash
npm run sdk:example
```

### Build the workspace package

```bash
npm run build:sdk
```

### Use from another local repo

In your sibling app repo, add a local file dependency:

```bash
npm install --save "file:../ToM/packages/tom-brain-sdk"
```

## Key Files

- `src/core/brain.ts` — ingestion, indexing, retrieval, cycle logic
- `src/integrations/vectorStore.ts` — local vector persistence + similarity search
- `src/integrations/ollamaClient.ts` — local embedding integration
- `src/integrations/braveClient.ts` — web search integration
- `src/jobs/cycleJob.ts` — cron wrapper
