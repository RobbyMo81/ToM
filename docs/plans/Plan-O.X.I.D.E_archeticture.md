# **O.X.I.D.E.** — Operational X-ray for Introspective Development & Enhancement

- A **Rust-resident cognitive layer**
- Parity with the **host application’s LLM brain**
- **Local model execution via Ollama**
- Continued adherence to **governed self-improvement**, not autonomous mutation

Below is the **CTO-level architectural amendment** to integrate that capability cleanly and safely.

---

# 13. Cognitive Layer Integration (Rust Brain + Ollama)

## 13.1 Purpose of the O.X.I.D.E. Brain

O.X.I.D.E. must include a **localized reasoning subsystem** implemented in Rust that provides:

- Structured reasoning over detected skills
- Deterministic proposal synthesis
- Policy-aware decision support
- Offline/self-contained cognition

This brain **does not replace** the host LLM brain.
It acts as a **bounded, safety-oriented co-processor** dedicated to:

> **Governed self-improvement orchestration**

---

## 13.2 Architectural Separation of Minds

### Host Application Brain

Responsible for:

- General reasoning
- Skill discovery
- Long-context learning
- External knowledge synthesis
- Creative solution generation

### O.X.I.D.E. Brain (Rust + Ollama)

Responsible for:

- Translating skills → deterministic patches
- Running validation reasoning
- Enforcing governance logic
- Performing risk classification
- Operating in **offline / secure mode**

**Key rule:**

> O.X.I.D.E. never trusts raw LLM output without deterministic validation.

---

## 13.3 Ollama Enablement Requirements

O.X.I.D.E. must support **local inference via Ollama** with the following guarantees:

### Model Execution Constraints

- **Local-only by default**
- No outbound network calls during reasoning
- Model whitelist enforced via policy
- Deterministic temperature bounds (e.g., ≤ 0.3 for patch synthesis)
- Token/output length caps

### Required Capabilities

Ollama-backed reasoning must support:

- Structured JSON output
- Chain-of-thought suppression in logs
- Tool-calling or function schema output
- Deterministic retry with seed control
- Timeout + circuit breaker behavior

---

## 13.4 Rust Cognitive Runtime Expectations

The Rust brain must be implemented as a **first-class crate subsystem**, not glue code.

### Required Modules

```
oxide-brain/
 ├─ reasoning/
 ├─ policy/
 ├─ risk/
 ├─ patch_synthesis/
 ├─ validation/
 └─ telemetry/
```

### Runtime Guarantees

- Memory-safe execution (no unsafe unless audited)
- Async inference handling
- Deterministic state transitions
- Full observability hooks
- Graceful degradation if Ollama unavailable

If Ollama fails:

> O.X.I.D.E. must fall back to **no-op safe mode**, never autonomous change.

---

## 13.5 Dual-Brain Governance Model

Self-improvement must require **cross-brain agreement**:

| Stage           | Required Authority              |
| --------------- | ------------------------------- |
| Skill discovery | Host brain                      |
| Patch proposal  | O.X.I.D.E. brain                |
| Validation      | Deterministic CI                |
| Risk approval   | Policy engine + human if needed |

No single brain can:

- Discover **and**
- Approve **and**
- Deploy

This enforces **separation of cognitive powers**.

---

## 13.6 Security Boundary

Because Ollama introduces executable model logic:

O.X.I.D.E. must enforce:

- Signed model manifests
- Checksum validation
- Model capability classification
- Sandboxed inference execution
- Resource quotas (CPU, RAM, GPU)

### Explicit Prohibition

O.X.I.D.E. brain **must never**:

- Download models autonomously
- Upgrade its own reasoning model
- Modify inference policies
- Change governance thresholds

All require **human-approved PR**.

---

## 13.7 Observability Additions

New telemetry required:

- Model used for reasoning
- Prompt class identifier (not raw prompt)
- Determinism score
- Retry count
- Inference latency
- Reasoning → CI success correlation

Stored alongside existing:

```
oxide_audit_log.json
```

---

## 13.8 Failure Modes Introduced by Local LLMs

### New Risks

| Risk                            | Mitigation                  |
| ------------------------------- | --------------------------- |
| Model hallucinated patch        | CI + policy gate            |
| Non-deterministic reasoning     | Seed + temp cap             |
| Model drift after update        | Version pinning             |
| Resource starvation             | Quotas + watchdog           |
| Prompt injection via skill text | Structured schema isolation |

---

## 13.9 Acceptance Criteria Additions for v1

Before enabling the Rust brain:

- Offline Ollama inference validated
- Deterministic JSON reasoning proven
- Sandboxed execution verified
- Cross-brain approval workflow tested
- Safe-mode fallback demonstrated
- Model pinning + checksum enforcement working

---

# Executive Addendum

With this inclusion, O.X.I.D.E. evolves from:

> **CI/CD self-improvement engine**

into:

> **A dual-brain, Rust-enforced, locally reasoning, policy-governed evolutionary subsystem**

Crucially:

- Intelligence is **allowed**
- Autonomy is **constrained**
- Evolution is **audited**
- Deployment is **earned**

---

# 14. Runtime Memory Database Requirement (ToM + O.X.I.D.E)

To support durable conversation history, workflow memory, and governed self-improvement lineage, ToM and O.X.I.D.E require a shared runtime SQL system-of-record in addition to vector storage.

Suggested runtime DB:

- `memory/tom_runtime.sqlite`

System-of-record entities:

- `sessions`, `conversation_turns`
- `workflow_runs`, `workflow_steps`, `task_events`
- `skills_learned`
- `behavior_profiles`, `personality_profiles`
- `skill_to_logic_proposals`, `validation_results`, `approvals`, `deploy_outcomes`

Design note:

- Vector DB remains retrieval-focused.
- Runtime DB is chronology/governance-focused.

Reference schema:

- `../reference/Runtime_Memory_DB_Schema_v1.md`

---
