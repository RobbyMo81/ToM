# TODO — Ollama LLM Wiring (Execution Checklist)

Derived from: `Build_Instance_Ollama_LLM_Wiring.md`
Date: 2026-02-18

## Phase 1: Preparation

- [x] Confirm Ollama chat model is available on runtime host
  - [x] Verify `OLLAMA_CHAT_MODEL` target model exists (`ollama list`)
  - [x] Confirm `OLLAMA_BASE_URL` connectivity
- [x] Confirm final prompt contract for generation path
  - [x] Define context assembly format (system + user + retrieved context)
  - [x] Define max context/length budget policy

---

## Phase 2: Core Implementation (Must-Have Requirements)

### R-001: Ollama chat generation client path

- [x] Extend `src/integrations/ollamaClient.ts`
  - [x] Add chat/generate method for local Ollama LLM
  - [x] Add robust error handling for non-OK responses

### R-002: Brain-level generation orchestration

- [x] Update `src/core/brain.ts`
  - [x] Add retrieval-grounded generation method
  - [x] Preserve existing query/retrieval behavior

### R-003: HTTP API generation endpoint

- [x] Update `src/api/httpServer.ts`
  - [x] Add `POST /generate`
  - [x] Add request validation and typed response shape

### R-004: CLI generation command

- [x] Update `src/cli.ts`
  - [x] Add generation command usage and execution path

### R-005: SDK generation support

- [x] Update app SDK (`src/sdk/*`)
  - [x] Add typed client method and response types
- [x] Update package SDK (`packages/tom-brain-sdk/src/*`)
  - [x] Add matching typed client method and response types

### R-006: Config controls for generation behavior

- [x] Update `src/core/config.ts`
  - [x] Add generation-related config fields (limits/options)
- [x] Update `.env.example`
  - [x] Document generation env vars and defaults

### R-007: Documentation updates

- [x] Update `README.md`
  - [x] Add API endpoint usage for generation
  - [x] Add CLI command usage for generation
  - [x] Add SDK usage for generation
  - [x] Add env/config notes and operational caveats

### R-008: Preserve quality gate integrity

- [x] Ensure all required quality gates pass after implementation

---

## Phase 3: Validation and Evidence

- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run lint:md`
- [x] `npm run format:check`
- [x] `npm run lint:all`
- [x] `npx tsx src/cli.ts query "openclaw"`
- [x] `npx tsx src/cli.ts generate "what did I learn about SSH hardening?"`
- [x] API smoke test `POST /generate`
- [x] SDK smoke test for new generate method

---

## Phase 4: Recommendation Tracking (Implement or Defer)

- [x] REC-001 Model/router abstraction (small/large/fallback) — Deferred
- [x] REC-002 Prompt-template versioning — Deferred
- [x] REC-003 Semantic cache — Deferred
- [x] REC-004 Safety middleware (PII/redaction/injection) — Deferred
- [x] REC-005 Structured output contracts — Deferred
- [x] REC-006 Observability spans/metrics — Deferred
- [x] REC-007 CI commitlint parity check — Deferred
- [x] REC-008 Branch protection required checks (`build-and-lint`) — Deferred (external)
- [x] REC-009 Keep orchestration as glue only — Implemented
- [x] REC-010 Agent loop termination guards — Deferred

Rule: Do not leave recommendations unclassified. Mark each as either:

- [ ] Implemented in this build
- [ ] Deferred with rationale + owner

---

## Phase 5: External Actions Register

- [ ] EA-001 GitHub branch protection setup (`main`)
  - [ ] Require pull requests before merge
  - [ ] Require status checks before merge
  - [ ] Required check: `build-and-lint`
  - [ ] Strict up-to-date mode enabled
- [ ] EA-002 Runtime model provisioning and verification
- [ ] EA-003 Optional runtime sizing/benchmark decision

---

## Phase 6: Completion Artifacts

- [x] Update `Build_Instance_Ollama_LLM_Wiring.md` status fields
- [x] Complete verification log in build instance
- [x] Produce debrief: `../debriefs/Ollama_LLM_Wiring_Debrief.md`
- [x] Record deferred items and named owners

---

## Build-Level Definition of Done

- [x] All must-have requirements complete
- [x] All required quality gates pass
- [x] Recommendations implemented or explicitly deferred
- [x] CI requirements documented and aligned
- [ ] External actions assigned with owners
- [x] Verification log completed
- [x] Debrief produced
