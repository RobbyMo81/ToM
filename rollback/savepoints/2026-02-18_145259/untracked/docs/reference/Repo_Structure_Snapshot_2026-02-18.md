# Repo Structure Snapshot — ToM (2026-02-18)

## Scope

- Workspace mounted: `d:\Documents\ToM`
- Snapshot intent: provide CTO-facing structure of current ToM folders.
- Note: no separate `Oxide` repository/folder is mounted in this workspace context.

## Top-Level Structure

```text
ToM/
├─ .agents/
├─ .github/
├─ .husky/
├─ .tom-workspace/
├─ automation/
├─ dist/
├─ docs/
├─ memory/
├─ node_modules/
├─ packages/
├─ scripts/
├─ sql/
├─ src/
├─ .env.example
├─ .gitignore
├─ commitlint.config.cjs
├─ eslint.config.mjs
├─ package-lock.json
├─ package.json
├─ README.md
└─ tsconfig.json
```

## Source Layout (`src/`)

```text
src/
├─ api/
│  └─ httpServer.ts
├─ core/
│  ├─ brain.ts
│  ├─ config.ts
│  ├─ hash.ts
│  ├─ logger.ts
│  └─ types.ts
├─ integrations/
│  ├─ braveClient.ts
│  ├─ chunker.ts
│  ├─ githubReportSync.ts
│  ├─ knowledgeLoader.ts
│  ├─ ollamaClient.ts
│  ├─ runtimeMemoryStore.ts
│  ├─ vectorStore.ts
│  ├─ webKnowledge.ts
│  └─ whoiamSync.ts
├─ jobs/
│  ├─ cycleJob.ts
│  ├─ githubSyncJob.ts
│  └─ whoiamSyncJob.ts
├─ scripts/
│  ├─ initRuntimeMemory.ts
│  └─ lineageSmoke.ts
├─ sdk/
│  ├─ example.ts
│  ├─ index.ts
│  ├─ tomBrainClient.ts
│  └─ types.ts
├─ cli.ts
└─ index.ts
```

## Documentation Layout (`docs/`)

```text
docs/
├─ build/
├─ debriefs/
├─ handoffs/
├─ lessons/
├─ plans/
└─ reference/
```

### Current Debriefs (`docs/debriefs/`)

- Lesson-OpenClaw_Phase4_Completion_Debrief_20260216.md
- Lesson-OpenClaw_Phase4_Debrief_20260216.md
- Lesson-OpenClaw_Phase4_Expansion_Debrief_20260216.md
- Lesson-OpenClaw_Prevention_Debrief_20260216.md
- Lesson-OpenClaw_SSH_Setup_Debrief_20260215.md
- Lessons-Workflow_Debrief_Feb16_Complete_20260216.md
- Lineage_Workflow_Closeout_Debrief_2026-02-18.md
- Linting_Debrief.md
- Ollama_LLM_Wiring_Debrief.md
- ToM_Build_Debrief_2026-02-18.md

## Package Layout (`packages/`)

```text
packages/
└─ tom-brain-sdk/
   └─ src/
      ├─ index.ts
      ├─ tomBrainClient.ts
      └─ types.ts
```

## CTO Note: ToM vs Oxide

- This snapshot reflects the currently mounted ToM repository only.
- If you want a combined ToM/Oxide map, mount the Oxide repo/workspace folder and I can generate a unified structure document.
