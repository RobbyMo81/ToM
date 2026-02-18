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

## Predetermined Cycle of Operations

Every cron run (`TOM_CRON_SCHEDULE`) executes:

1. **Health Gate**: verify Ollama connectivity
2. **Local Ingestion**: scan + incrementally index changed docs
3. **Web Enrichment**: run configured Brave queries and index snapshots
4. **Memory Report**: return cycle metrics for orchestration/logging

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
- Semantic query:
  ```bash
  npm run query -- "What lessons did I record about SSH hardening?"
  ```
- Run one full cycle:
  ```bash
  npm run cycle
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
- `POST /query` with JSON body `{ "question": "...", "topK": 8 }`
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

### Optional auth

If you set `TOM_API_TOKEN`, all requests must include:

```text
Authorization: Bearer <your-token>
```

## TypeScript SDK (for sibling apps)

Use the lightweight client in `src/sdk` for typed local calls.

### Import

```ts
import { ToMBrainClient } from "./src/sdk";
```

### Usage

```ts
const client = new ToMBrainClient({
  baseUrl: "http://127.0.0.1:8787",
  token: process.env.TOM_API_TOKEN,
});

const health = await client.health();
const stats = await client.stats();
const query = await client.query("What lessons did I record about SSH hardening?", 6);
```

### Example runner

```bash
npm run sdk:example
```

## Key Files

- `src/core/brain.ts` — ingestion, indexing, retrieval, cycle logic
- `src/integrations/vectorStore.ts` — local vector persistence + similarity search
- `src/integrations/ollamaClient.ts` — local embedding integration
- `src/integrations/braveClient.ts` — web search integration
- `src/jobs/cycleJob.ts` — cron wrapper
