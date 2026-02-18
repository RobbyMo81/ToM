# Build Plan Instance — ToM Brain Ollama LLM Wiring

- Built From Template: `Build_OneTask_Template.md`
- Execution Checklist: `TODO-Ollama_LLM_Wiring.md`
- Date: 2026-02-18
- Owner: ToM Engineering
- Related Request: Enhance ToM Brain by wiring and implementing Ollama environment for LLM use
- Target Branch: `main`
- Last Updated: 2026-02-18

---

## 1) Objective

Wire ToM Brain to support local Ollama-based LLM generation as a first-class runtime capability (not embeddings-only), with clear architecture, guardrails, and validation paths. Deliver an execution-ready plan where requirements and recommendations are tracked in one artifact.

- Objective:
  - Add robust Ollama chat generation integration and response orchestration in ToM.
  - Preserve existing retrieval behavior and keep quality gates green.
  - Prepare for future RAG + agentic workflow expansion without lock-in.
- Non-goals:
  - No cloud-vendor integration in this build unless explicitly added later.
  - No mobile/on-device deployment implementation in this build.
  - No multi-agent autonomous execution loops in this build.

---

## 2) Requirements Matrix (Must-Have)

| Req ID | Requirement                                                       | Scope (files/systems)                       | Validation Command                      | Evidence Artifact                              | Status   |
| ------ | ----------------------------------------------------------------- | ------------------------------------------- | --------------------------------------- | ---------------------------------------------- | -------- |
| R-001  | Add Ollama chat generation client path (non-embedding)            | `src/integrations/ollamaClient.ts`          | `npm run build`                         | updated client methods + successful compile    | Complete |
| R-002  | Add Brain-level API for answer generation using retrieved context | `src/core/brain.ts`                         | `npm run build`                         | new method(s) and integration logic            | Complete |
| R-003  | Expose generation via HTTP API endpoint                           | `src/api/httpServer.ts`                     | `npm run build` and endpoint smoke test | new `POST /generate` route and response schema | Complete |
| R-004  | Expose generation via CLI command                                 | `src/cli.ts`                                | `npx tsx src/cli.ts generate "..."`     | CLI output for sample query                    | Complete |
| R-005  | Add SDK support for generation call                               | `src/sdk/*`, `packages/tom-brain-sdk/src/*` | `npm run build` and `npm run build:sdk` | SDK method + typing updates                    | Complete |
| R-006  | Add config controls for generation behavior                       | `src/core/config.ts`, `.env.example`        | `npm run build`                         | env vars and defaults documented               | Complete |
| R-007  | Update docs for usage + operational caveats                       | `README.md`                                 | `npm run format:check`                  | updated command/API/SDK docs                   | Complete |
| R-008  | Preserve all existing quality gates                               | repo-wide                                   | `npm run lint:all`                      | passing lint/format checks                     | Complete |

Status values: Not Started / In Progress / Complete / Blocked

---

## 3) Recommendations Matrix (Should-Have)

| Rec ID  | Recommendation                                                       | Why it matters                                   | Priority | Implemented or Deferred                             | Owner           |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------ | -------- | --------------------------------------------------- | --------------- |
| REC-001 | Add model/router abstraction (`small`, `large`, fallback)            | Reduces lock-in and supports cost/latency tuning | High     | Deferred (baseline local Ollama wiring prioritized) | ToM Engineering |
| REC-002 | Add prompt-template versioning and metadata tags                     | Supports reproducibility and prompt evolution    | High     | Deferred (future hardening phase)                   | ToM Engineering |
| REC-003 | Add semantic cache for repeated generation requests                  | Reduces token cost and latency                   | High     | Deferred (optimize after usage baselines)           | ToM Engineering |
| REC-004 | Add safety middleware (PII redaction + prompt-injection checks)      | Improves compliance and resilience               | High     | Deferred (next safety wave)                         | ToM Engineering |
| REC-005 | Add structured output contracts for key workflows                    | Makes downstream automation safer                | Medium   | Deferred (next workflow phase)                      | ToM Engineering |
| REC-006 | Add generation observability spans/metrics                           | Improves debugging and SLA tracking              | High     | Deferred (telemetry phase)                          | ToM Engineering |
| REC-007 | Add CI `commitlint` parity check                                     | Aligns hook and CI quality controls              | Medium   | Deferred (separate CI policy task)                  | ToM Engineering |
| REC-008 | Configure branch protection + required status check `build-and-lint` | Enforces merge safety on `main`                  | High     | Deferred (external GitHub settings required)        | Repo Admin      |
| REC-009 | Keep orchestration as glue, domain logic in service layer            | Enables framework swaps later                    | High     | Implemented (logic remains in ToM service layer)    | ToM Engineering |
| REC-010 | Add termination guards for future agent loops                        | Prevents runaway execution                       | Medium   | Deferred (future agent phase)                       | ToM Engineering |

Rule: Every recommendation must be either implemented or explicitly deferred with rationale.

---

## 4) Quality Gate Contract

Define required checks for this build.

- Build: `npm run build`
- Lint: `npm run lint`
- Markdown Lint: `npm run lint:md`
- Format Check: `npm run format:check`
- Aggregate Gate: `npm run lint:all`
- Additional test/smoke commands:
  - `npx tsx src/cli.ts query "openclaw"`
  - `npx tsx src/cli.ts <new-generate-command> "what did I learn about SSH hardening?"`
  - API smoke for `POST /generate`

Pass criteria:

- All required gates are green.
- New generation command and API endpoint both produce valid outputs.
- Existing query/retrieval behavior remains intact.

---

## 5) CI and Policy Requirements

- CI workflow path: `.github/workflows/ci.yml`
- CI required jobs/check names:
  - `build-and-lint`
- Branch protection requirements:
  - Require pull request before merge
  - Require status checks before merge
  - Required checks list:
    - `build-and-lint`
  - Strict up-to-date mode: Yes (recommended)

---

## 6) External Actions Register

Track actions that cannot be completed by code edits alone.

| Action ID | Platform/Setting                                        | Required Permission | Verification Method                               | Owner            | Status  |
| --------- | ------------------------------------------------------- | ------------------- | ------------------------------------------------- | ---------------- | ------- |
| EA-001    | GitHub branch protection for `main` + required checks   | Repo admin          | Screenshot/settings export and blocked merge test | Repo Admin       | Pending |
| EA-002    | Ollama runtime model provisioning (`OLLAMA_CHAT_MODEL`) | Host/runtime access | `ollama list` and successful generation request   | Runtime Operator | Pending |
| EA-003    | Optional GPU/runtime sizing decision                    | Infra/admin         | runtime benchmark log                             | Runtime Operator | Pending |

---

## 7) Risks and Mitigations

| Risk                                                 | Impact                             | Mitigation                                             | Owner            | Status |
| ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------ | ---------------- | ------ |
| Local model unavailable or too slow                  | Build blocked or poor UX           | Pin model in env, pre-pull model, add fallback message | Runtime Operator | Open   |
| Prompt/context overflow from large retrieval payload | degraded answer quality or failure | token/char budget in prompt assembly; top-k cap        | ToM Engineering  | Open   |
| Hallucinated outputs in generation path              | trust and correctness risk         | retrieval grounding + explicit uncertainty responses   | ToM Engineering  | Open   |
| API schema drift between server and SDK              | client breakage                    | shared typed contracts and versioned SDK release notes | ToM Engineering  | Open   |
| CI green but repo policy not enforced                | unsafe merges                      | apply branch protection with required checks           | Repo Admin       | Open   |

---

## 8) Execution Plan

1. Preparation
   - Confirm Ollama chat model availability.
   - Finalize prompt assembly contract for generation endpoint.

2. Implementation
   - Extend `ollamaClient` for chat generation.
   - Add generation workflow in `ToMBrain` (retrieve + augment + generate).
   - Add API endpoint + CLI command + SDK method.
   - Add required config/env knobs.

3. Validation
   - Run quality gates.
   - Run smoke checks for retrieval and generation paths.
   - Verify output shape and error handling.

4. Documentation updates
   - Update README with generation usage, env vars, and caveats.

5. External action handoff
   - Deliver branch protection checklist to repo admin.
   - Deliver model provisioning checklist to runtime operator.

---

## 9) Verification Log

Record exact commands and outcomes.

- `npm run build` → PASS
- `npm run lint` → PASS
- `npm run lint:md` → PASS
- `npm run format:check` → PASS
- `npm run lint:all` → PASS
- `npm run build:sdk` → PASS
- `npx tsx src/cli.ts query "openclaw"` → PASS
- `npx tsx src/cli.ts generate "what did I learn about SSH hardening?"` → PASS
- SDK smoke (`npx tsx -e ... ToMBrainClient.generate(...)`) → PASS
- API smoke `POST /generate` (`node -e ...fetch('/generate')`) → PASS (HTTP 200)

---

## 10) Completion Matrix (Plan → TODO → Evidence)

| Plan Area                      | TODO/Task Ref  | Status   | Evidence                      |
| ------------------------------ | -------------- | -------- | ----------------------------- |
| Ollama chat wiring             | R-001          | Complete | build output + client code    |
| Brain generation orchestration | R-002          | Complete | method + smoke response       |
| API generation endpoint        | R-003          | Complete | endpoint test response        |
| CLI generation command         | R-004          | Complete | CLI transcript                |
| SDK generation support         | R-005          | Complete | SDK build and usage test      |
| Config and docs updates        | R-006, R-007   | Complete | `.env.example`, README        |
| Quality gate completion        | R-008          | Complete | `lint:all` pass output        |
| External repo/runtime actions  | EA-001..EA-003 | Pending  | settings/runtime verification |

---

## 11) Definition of Done (Build-Level)

- [x] All Must-Have requirements complete
- [x] All required quality gates pass
- [x] Recommendations implemented or explicitly deferred
- [x] CI reflects required checks
- [x] External actions listed with owners
- [x] Verification log completed
- [x] Debrief produced

---

## 12) Debrief Output

- Debrief filename: `../debriefs/Ollama_LLM_Wiring_Debrief.md`
- Summary of delivered outcomes:
  - local Ollama generation fully wired into Brain/API/CLI/SDK
  - retrieval-grounded prompt construction implemented
  - docs and config updated
- Follow-up recommendations:
  - semantic cache
  - safety middleware
  - observability spans
  - router abstraction
- Deferred items and owners:
  - branch protection (`Repo Admin`)
  - model provisioning/sizing (`Runtime Operator`)

---

## 13) Research Synthesis (Provided Inputs + Operational Interpretation)

### Integration mechanisms

- Direct API calls are fastest for prototypes but introduce lock-in and residency concerns.
- Self-hosting (Ollama) fits ToM’s local-first and sensitive-memory orientation.
- Orchestration frameworks help at scale; keep them as replaceable glue and maintain domain logic in ToM service layer.

### Canonical patterns relevant to ToM

1. RAG remains the default answer architecture:
   - ingest → embed/store → retrieve top-k → augment prompt → generate.
2. Agentic workflows are future stage only:
   - require strict termination guards and safety checks.
3. Prompt/model routing should be introduced after baseline generation is stable.

### Operational wiring priorities

- Safety: add redaction and prompt-injection checks as next hardening wave.
- Observability: trace each generation call with latency, model, and token metadata.
- Cost/performance: semantic cache and request dedupe should be next optimizations.

### Edge/mobile considerations

- Keep this build server-local first.
- Defer on-device quantized deployment until quality and observability are stable.

### 90-day cut-down roadmap (adapted for ToM)

- Weeks 1–2: Local Ollama generation baseline wired.
- Weeks 3–4: RAG v1 generation endpoint + SDK stabilization.
- Weeks 5–6: Guardrails layer (prompt-injection, basic policy checks).
- Weeks 7–8: Observability and dashboards.
- Weeks 9–10: Tool-augmented/agentic pilot with hard iteration limits.
- Weeks 11–12: Optional edge prototype path.

### Research notes

- The supplied architecture guidance strongly supports interface-first design and staged hardening.
- CI/branch-policy guidance supports strict required checks and explicit merge protections for stable mainline integration.
