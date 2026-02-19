## How are LLM's bound to ToM and Oxide?

They’re “bound” by **policy + routing + prompt-context injection**—not by the LLM itself. In your architecture, *identity is an execution-time constraint* applied by ToM before any model call, and then reinforced by what tools/capabilities the caller is allowed to use. 

Here’s the concrete mechanism.

---

## 1) Identity binding happens *outside* the LLM

An LLM doesn’t truly “know” it is ToM or O.X.I.D.E. What makes it behave that way is:

1. **Which system/role prompt it receives**
2. **Which tools it is allowed to call**
3. **Which state machine/governance gates are enforced**
4. **Which memory/knowledge sources are accessible**
5. **Which outputs are accepted (schemas/contracts)**

So “ToM” and “Oxide” are *enforced runtime identities*.

Your `whoiam.md` already describes a planned “Formal Identity Binder middleware” that injects role prompts and prevents executive overrides by O.X.I.D.E. 

---

## 2) The identity binder: the core control point

### What it does

For every request, the binder sets:

* `actor_id`: `ToM` or `O.X.I.D.E`
* `role_prompt`: identity-specific system prompt
* `capability_profile`: allow/deny list (web search, PR merge, deploy, etc.)
* `policy_context`: current gate state (GO/NO-GO), approvals, autonomy tokens
* `data_access`: which memories/docs/indexes are accessible
* `output_contract`: required schema (e.g., proposal JSON, patch plan, risk report)

### Why this matters

Even if both identities use the *same underlying model* (e.g., the same Ollama model), they behave differently because they get different:

* instructions
* tool visibility
* constraints
* acceptance criteria

---

## 3) Practical binding levels (what you should enforce)

### Level A — Prompt binding (soft control)

* A ToM “system prompt” defines: orchestration, governance, approvals, planning.
* An O.X.I.D.E “system prompt” defines: technical analysis, patch strategy, evidence, no executive decisions.

This is necessary but not sufficient.

### Level B — Tool/capability binding (hard control)

You enforce identity by restricting tools:

**ToM may:**

* web search (Brave / webKnowledge)
* generate proposals and plans
* request O.X.I.D.E runs
* manage approvals / tokens

**O.X.I.D.E may:**

* run refactor/upgrade pipelines
* generate diffs/patches
* run CI validations
* produce evidence artifacts

**But O.X.I.D.E may NOT:**

* approve itself
* grant autonomy
* change governance policies
* merge/deploy unless explicitly authorized and within scope

This is the real binding: the LLM can “say” anything, but it can’t *do* anything outside its tool access.

### Level C — Data binding (memory & workspace boundaries)

Your architecture explicitly treats `.tom-workspace` as governance/identity space and keeps it out of ingestion/vector memory. 

Binding implication:

* Only ToM can read/write certain governance artifacts by default.
* O.X.I.D.E can write evidence outputs but can’t rewrite approval records.

### Level D — Output binding (schema + rejection)

You only accept outputs that match the identity’s expected contract.

Examples:

* ToM outputs: `Proposal`, `ScopeOfWork`, `RiskAssessment`
* Oxide outputs: `PatchPlan`, `ValidationEvidence`, `DiffArtifact`

If output violates policy (e.g., O.X.I.D.E produces “I approve this”), ToM rejects it and logs an audit event.

---

## 4) “Bound LLM instances” vs “two-layer Oxide”

In your topology, both ToM and O.X.I.D.E are represented as “Bound LLM Instances” participating in `runCycle`. 

To reconcile with the Rust executor model:

* **O.X.I.D.E (LLM role)** is bound by identity binder + limited capabilities.
* **`oxide` (Rust executor)** is not “bound by prompt”; it’s bound by:

  * its own policy engine
  * the scope tokens ToM passes
  * CI requirements
  * filesystem path allowlists
  * and audit logging

So identity binding applies both to:

* LLM reasoning role (soft + tool gates)
* deterministic executor authority (hard gates)

---

## 5) The minimum implementation you should aim for (v1)

To truly bind identity, implement these three controls:

1. **Identity Binder middleware** (centralized)

* chooses `identity_profile` per request (ToM vs OXIDE)
* injects system prompt + tool allowlist

2. **Capability firewall**

* every tool call checks `identity_profile` + approval tokens + gate state
* denies by default

3. **Audit log**

* logs: who acted, what tool, what scope, under what authority
* includes autonomy/override token references when applicable

This makes identity “real” operationally.

---

## Bottom line

ToM and O.X.I.D.E are bound by **execution-time identity profiles** enforced by your planned Identity Binder + tool gating + data boundaries + schema validation—not by the raw model. That’s the correct way to do it, and it aligns with how your architecture document already frames identity and safety separation. 
