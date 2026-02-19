**CTO Stakeholder Sanity Checks**

Below is the sanity check, mapped directly to what your current architecture says. 

---

## 1) What you already have (and it matches the proposal)

### A. Dual-role identity model already exists

Your topology explicitly defines:

* **ToM: Primary Executive**
* **O.X.I.D.E: Technical Subsystem**
  and shows both as “Bound LLM Instances” sharing `runCycle`. 

That matches the “ToM orchestrates, Oxide executes technical tasks” split.

### B. Governance/identity separation already matches the plan

You already treat `.tom-workspace` as **non-vectorized governance/identity** and purge it from ingestion. 
This aligns with our requirements for:

* audit artifacts
* authorization tokens
* override tokens
* proposal stores
  …living in `.tom-workspace` without retrieval leakage.

### C. Runtime lineage + proposal tables already exist

Your runtime DB already includes tables for:

* `skills_learned`
* `skill_to_logic_proposals`
* `validation_results`
* `approvals`
* `deploy_outcomes` 

That is *exactly* the data model the governed self-improvement loop expects. The “override token” becomes another approval-class artifact tied to those records.

### D. You already have the right entrypoints

* `src/index.ts` starts cron jobs + API. 
* `src/cli.ts` exists for CLI. 
* `POST /cycle`, `POST /generate`, `POST /query` exist for agent shell endpoints. 

So “LLM wrapper in an agent shell” is already structurally supported.

---

## 2) The only mismatch (and how to resolve it)

### Current architecture: Oxide is an LLM *instance* within ToM

In `whoiam.md`, O.X.I.D.E is currently represented as a “Bound LLM Instance” that participates in `runCycle`. 

### Proposal: Oxide is a Rust subsystem with its own CLI + enforcement

This is not contradictory, but it requires a **naming precision**:

* **O.X.I.D.E (Role / Persona / LLM Instance)** = “Oxide-mind” (planning + analysis + bounded reasoning)
* **oxide (Rust binary / executor)** = “Oxide-engine” (refactoring + CI evidence + patch production)

**ToM owns both**, but only the Rust engine is allowed to modify code.

This preserves your identity model (LLM instance) while adding the deterministic executor (Rust).

---

## 3) Where it plugs in your current topology

### In your flowchart, add one box:

Right now you have “Bound LLM Instances” feeding into `runCycle`. 
You extend it like this:

* OXIDE_Instance (LLM role) → produces **proposal + plan**
* ToMBrain / cycleJob → calls **oxide (Rust CLI)** to execute + validate

This is consistent with your planned “Formal Identity Binder middleware” that injects role prompts per request. 

---

## 4) Sanity-check constraints against your escalation NO-GO reality

Your escalation report says final gate is **NO-GO due to governance closeout**, not engineering. 
Our proposed governance spine *fits* that reality because:

* It makes “GO/NO-GO” a first-class state that blocks autonomy by default.
* It allows **HITL override tokens** as an explicit break-glass path (your new requirement).

That is aligned with the “identity binding / lineage logs ensure O.X.I.D.E does not perform executive overrides.” 

---

## 5) Minimal edits I would make to “current architect” to match the proposal

### Edit 1 — Clarify Oxide’s two-layer implementation in whoiam.md

Add one paragraph under “Execution”:

* O.X.I.D.E Instance = LLM role binding
* oxide binary = Rust executor invoked by ToM

### Edit 2 — Make the “Identity Binder” middleware the policy enforcement point

Your doc already says it’s planned and not fully enforced on all paths. 
That middleware becomes where you enforce:

* capability firewall
* approval checks
* autonomy/override tokens

### Edit 3 — Declare the ToM↔oxide interface contract

Pick: **stdin/stdout JSON-RPC** for v1 (best fit for your CLI-first system).

---

*Use With Cause*

**Granular Specification for your Research and Review**

---

## Proposed Architecture Delta for `whoiam.md`

### A) Add a new subsection under **2) Core Runtime Topology**

Insert immediately after **2) Core Runtime Topology** diagram:

#### 2.X O.X.I.D.E Two-Layer Implementation Model (Role + Executor)

Add this text:

> **O.X.I.D.E is implemented as two coupled layers:**
>
> 1. **O.X.I.D.E Instance (Bound LLM Role)** — a role-bound reasoning persona operating inside the ToM runtime via the Identity Binding Layer. It produces scoped proposals, plans, and technical reasoning, but cannot directly modify code or promote deployments.
>
> 2. **`oxide` Rust Executor (Deterministic Engine)** — an external Rust subsystem invoked by ToM (CLI/RPC) to perform refactoring, upgrades, CI validation, and evidence capture. It may use local Ollama models for bounded reasoning but is constrained by governance policy, approvals, and scoped autonomy tokens.
>
> **Rule:** O.X.I.D.E Instance proposes; `oxide` executes. All code changes must be produced via the Rust executor pathway and promoted only through governed CI/CD.

This aligns with your existing statement that role separation prevents O.X.I.D.E from performing executive overrides. 

---

### B) Update the Mermaid diagram to include the Rust executor boundary

In the **2) Core Runtime Topology** Mermaid block, modify as follows (minimal change):

1. Add a new subgraph after `Execution`:

```mermaid
   subgraph OxideEngine ["O.X.I.D.E Rust Executor (External Subsystem)"]
      OE1[oxide CLI / JSON-RPC]
      OE2[Refactor / Upgrade Engine]
      OE3[CI Validation + Evidence]
      OE4[Patch + PR Artifacts]
      OE5[Monitor + Rollback Hooks]
      OE1 --> OE2 --> OE3 --> OE4 --> OE5
   end
```

2. Add the connection from `ToM_Instance` / `runCycle` to the executor:

* Keep your existing `ToM_Instance --> F[runCycle]` and `OXIDE_Instance --> F`
* Add:

```mermaid
      F --> OE1
```

3. Style (optional but consistent with your highlighting approach):

```mermaid
   style OxideEngine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

This preserves your “Bound LLM Instances” model and explicitly shows the Rust subsystem as an invoked engine. 

---

### C) Add governance enforcement statements under **7) Safety & Identity Boundaries**

Append these bullets to section 7:

* **Rust executor boundary:** all code/config modifications must be performed by `oxide` (Rust executor) and must produce CI evidence artifacts before promotion.
* **Autonomy gating:** autonomous execution is prohibited when the final gate is **NO-GO**, **unless** a formally recorded HITL Override token is present, valid, time-bounded, and project-scoped.
* **Token storage:** all approvals, scoped autonomy tokens, and NO-GO override tokens are stored in `.tom-workspace/**` and remain excluded from vector memory.

This matches your non-vectorized governance policy and formalizes the override semantics. 

---

### D) Add an explicit “Interface Contract” under **3) Logic Paths**

Insert a short subsection after “Cycle Path”:

#### ToM ↔ `oxide` Executor Interface (v1)

* Transport: **local process invocation + stdin/stdout JSON-RPC** (preferred v1)
* Executor entrypoint: `oxide` binary available on PATH or configured path
* Evidence output: `.tom-workspace/proposals/<proposal_id>/evidence/`
* Hard requirement: `oxide validate` must succeed (PASS) before any PR merge or deploy action is permitted.

This is consistent with your CLI-first posture and avoids introducing a daemon prematurely. 

---

### E) Update **2.2 Implementation Status** (Planning vs Runtime)

Under “Planned (not yet implemented)” you already reference a “Dedicated O.X.I.D.E localized Rust brain subsystem.” 
Modify that line to:

* Dedicated O.X.I.D.E **Rust executor subsystem** (`oxide`) invoked by ToM for deterministic refactors, CI validation, and evidence capture (may include localized Ollama-backed bounded reasoning).

This makes the plan explicit and ties it to the executor boundary.

---

# Why this delta is correct (sanity-check criteria)

This patch:

* **Does not break** your current model where O.X.I.D.E is a bound role instance. 
* Adds the missing operational reality: **Rust does the changes**.
* Keeps governance artifacts in `.tom-workspace` (non-vectorized), matching your policy. 
* Cleanly supports your “LLM wrapper in an agent shell” goal without conflating role identity with execution authority.

---


