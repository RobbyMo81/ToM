1. Capability model: keep the engine, restrict the surface area
   Keep (because you explicitly need it)
   UI (primary control plane)
   Telegram channel (conversational + alerts)
   Cron scheduler (nightly deep jobs)
   Memory system (short-term + long-term)
   Agent orchestration (multi-agent / isolated runs)
   Research tools (but domain constrained; more below)
   Restrict hard (fail-fast)
   Any channel other than Telegram
   Any “tool” that can execute arbitrary shell commands
   Any file system write outside an allowlisted subtree
   Any outbound messaging except Telegram (and maybe UI notifications)
   Any webhook ingress unless you explicitly need it (and then token + IP allowlist)
   This is best implemented as a first-class policy layer in your fork (a “capability allowlist”), not by manually deleting code first.

2. Continuous Improvement Cycle (CIC): what to log, how to learn, how to act
   You want “know what worked and what didn’t.” You need three data streams:

A) Decisions & outcomes (the core training signal)
For every “action proposal” and “action execution,” log:

timestamp, market context snapshot, strategy name/version
proposal: what trade, why, confidence, expected outcome
approval path: who/what approved (UI confirmation, Telegram confirmation, auto-approved policy)
execution details: order id, fill price, slippage, fees
outcome labels: P&L over time windows (1h/1d/1w), max drawdown, whether thesis invalidated
This becomes your ground truth.

B) Tool/agent performance telemetry
Log per agent/tool:

which tools were used
latency, token usage (if applicable), error types
user satisfaction signals (explicit thumbs-up/down in UI, or “that was wrong” in Telegram)
“regret” events (trade canceled, reversed, or policy violation)
C) Knowledge/memory deltas
Track:

what new facts were added to memory
what was corrected/removed later
citations for research artifacts (URLs, docs, filings)
This prevents the system from accumulating “confident nonsense.”

3. Nightly “deep learning” cron jobs: what they actually do in practice
   On a VPS, “deep learning” nightly usually means offline analysis + model-assisted synthesis, not training a huge model locally. A pragmatic nightly pipeline:

Nightly Job 1 — “Outcome grading”
Pull yesterday’s decisions/executions
Compute outcome metrics per strategy and per market regime
Label what worked/failed + key counterfactuals (“would a tighter stop have helped?”)
Nightly Job 2 — “Research digest (domain-constrained)”
Only pull sources you allow (SEC filings, major financial news sources, earnings calendars, broker docs)
Extract facts with citations
Store as a “research artifact” (immutable) and a “summary memory” (editable)
Nightly Job 3 — “Policy & prompt refinement proposal”
Analyze failures and near-misses
Propose changes (not auto-apply) to:
strategy parameters
tool routing
risk limits
prompts / rubrics for analysis
Output a UI “Change Proposal” that you approve
Nightly Job 4 — “Memory maintenance”
Promote high-signal notes to long-term memory
Demote/expire stale items
Detect contradictions and flag for review
Key point: nightly jobs should produce proposals + reports, not silently change behavior in production.

4. Where this runs (OpenClaw-tailored mechanics)
   Since you’re using OpenClaw as the runtime, use its scheduler/orchestration patterns:

Use isolated runs for heavy nightly jobs (so they don’t pollute the main conversational context).
Deliver a summary report into the UI (and optionally a Telegram notification: “Nightly report ready”).
If you keep OpenClaw’s cron subsystem enabled, treat it as the orchestrator. If you prefer OS-level reliability, run a system cron that hits an internal “run nightly pipeline” entrypoint. Either is fine; choose based on what you trust operationally.

5. Safety gates for a trading system (non-negotiable design constraints)
   If this app can place trades, implement these as fail-fast invariants:

Two-step confirmation for any live order (UI confirm; Telegram confirm optional)
Hard risk limits enforced in code (max position size, max daily loss, allowed symbols, allowed order types)
Paper trading mode default; live trading requires explicit toggle + audit log entry
Immutable audit log for all trade actions and approvals
No autonomous strategy changes without human approval (nightly job only proposes) 6) What to delete vs keep (given your new requirements)
You likely should not delete:

cron/orchestration components
memory components
research tool infrastructure (but restrict destinations)
UI/gateway core
You can still delete/disable aggressively:

non-Telegram channels
consumer/social integrations not relevant to trading
unrelated skills/tooling that expands filesystem/network access
onboarding/demo content you won’t ship
But again: do the capability allowlist + tests first, then delete.
UI=extend existing OpenClaw UI and Nightly=A (OpenClaw cron), you can keep the core engine/UI while making the product trading-focused, cheaper to run, and safer by adding three layers:

Capability allowlist (product policy)
Model routing policy (cost control)
Nightly improvement pipeline (cron + memory + evaluation)
Below is a concrete blueprint.

1. Capability allowlist (what stays vs goes)
   Keep (required by your decisions)
   Gateway + existing UI
   Telegram channel
   Cron scheduler
   Memory + sessions (isolated runs)
   Web fetch/search tooling (domain-restricted)
   Disable (default-off; only enable if explicitly needed)
   All other channels (Discord/Slack/WhatsApp/Signal/etc.)
   Hooks/webhooks (hooks.enabled=false) unless you later need inbound triggers
   Node pairing / remote nodes (unless you have a specific reason)
   Browser automation (keep off unless you truly need it for filings/login flows)
   Hard safety gates (fail-fast)
   For AlwaysonAssistant “prod mode”, fail startup if any of these are true:

A non-Telegram channel is enabled
Telegram allowlist is empty
Gateway is bound non-loopback without OPENCLAW_GATEWAY_TOKEN
“dangerous tools” are enabled (shell execution, arbitrary file writes outside allowlist, arbitrary HTTP to non-allowlisted hosts)
This is the key to later deleting directories safely: once the product refuses to load disallowed capabilities, removal is low risk.

2. Model routing policy (token + $ control)
   You want cheap models for routine, and specialized models for research. Implement this as a first-class routing rule set:

Tier 0: “Local / cheap”
Use Ollama (local) for:

heartbeats
cron summaries / log triage
memory cleanup (dedupe, clustering, tagging)
UI copy edits, formatting, classification
“is this message a trade request?” intent detection
extracting structured fields from UI forms / Telegram messages
Tier 1: “Reasoning / trading decisions”
Use a strong general model (cloud) only when:

generating trade theses
risk analysis, scenario analysis
multi-step orchestration that affects decisions
post-trade evaluation writeups that influence policy
Tier 2: “Research/news”
Use Perplexity (or similar) for:

market-moving event detection
“what happened today?” summaries with sources
company-specific catalysts and macro data checks
Rule: research outputs must be stored with citations (URLs + timestamps) and must not directly trigger trades without your UI approval step.

Practical enforcement
Nightly jobs and heartbeats default to Tier 0 unless a step explicitly escalates.
Trade proposal generation requires Tier 1.
News/catalyst gathering uses Tier 2, then Tier 0 summarizes into your internal format. 3) Nightly pipeline (OpenClaw cron) — concrete job set
Schedule these inside your 9–10pm Pacific window. Recommended structure:

Job N1: “Daily Grade”
Input:

all trades proposed/executed
fills, P&L windows, drawdown, rule violations
Output (stored + shown in UI):

what worked / what didn’t (by strategy + regime)
mistakes taxonomy (signal error, sizing error, timing error, execution error)
Model:
Tier 0 for aggregation + formatting
Tier 1 only for deeper causal writeups if needed
Job N2: “News/Catalyst”
Input:

allowed tickers/watchlist
macro calendar
earnings schedule
Perplexity/news sources
Output:

“market movers” list with citations
per-ticker catalyst notes (facts only) + confidence + source links
Model:
Tier 2 fetch + Tier 0 summarize
Job N3: “Improve Plan”
Input:

outputs of N1 + N2
last N days of regret events (“shouldn’t have traded”, “missed trade”, etc.)
Output:

a Change Proposal pack (UI review/approve):
prompt/rubric changes
strategy parameter tweaks
new guardrails
experiments to run tomorrow
Model:
Tier 1 to generate proposals (but bounded: small context, strict format)
Job N4: “Memory Sweep”
Input:

daily notes + transcripts + artifacts
Output:

promote high-signal items into long-term memory
expire stale items
contradiction report (“we believed X, now evidence says Y”)
Model:
Tier 0
Important: N3 never auto-applies. It writes a proposal you approve in the UI.

4. Skills/tools trimming (without breaking UI/orchestration)
   Instead of “delete everything not used” immediately, do this sequence:

Implement the capability allowlist + fail-fast checks
Add a CI check: “Only telegram + UI enabled; only allowed tools registered”
Run your trading workflow end-to-end (UI + Telegram + nightly)
Only then delete directories for disabled channels/tools
This prevents accidental removal of something the UI depends on.

5. Enhancements worth adding now (high leverage)
   A) Paper/live separation
   Default to paper trading
   Live trading requires:
   explicit UI toggle
   confirm step
   audit log entry
   B) Immutable audit log
   Append-only event log for:

proposals
approvals
orders
cancellations
parameter changes
nightly job outputs applied/not applied
C) Domain-restricted research
Allowlist outbound hosts (examples):

sec.gov, investor relations sites
your broker API domain(s)
a curated news list
Block everything else by default. 6) Next step (single-step loop, so we don’t drift)
Answer these 4 items (short answers):

Slow-and-steady plan: ship a secure, constrained v1 that can’t hurt you, then add memory depth and “continuous improvement” in layers.

1. Broker choice: Schwab vs “AI-friendly”
   Schwab can work, but the “AI-friendly” dimension usually means: clean APIs, sandbox/paper trading, easy order placement, and stable auth.

If you want the easiest programmatic trading workflow: Alpaca is commonly used (paper trading, simple REST, lots of examples).
If you want institutional-grade and broad instruments: IBKR (powerful, but integration complexity).
If you’re already committed to Schwab for operational reasons: keep Schwab and design the system so the broker adapter is pluggable (interface-based), so you can swap later without rewriting the agent.
Recommendation for noise reduction: stick with Schwab for v1, but implement a BrokerAdapter interface so you can switch later.

2. UI internet-exposed behind reverse proxy: minimum safe baseline
   Because this is a trading system, “internet-exposed” is your biggest risk multiplier.

Minimum baseline (non-negotiable, fail-fast where possible):

Reverse proxy must enforce strong auth (OIDC if you can; otherwise at least basic auth + IP allowlist + rate limiting).
OpenClaw/AlwaysonAssistant gateway must still require OPENCLAW_GATEWAY_TOKEN.
Lock admin endpoints to either:
IP allowlist, or
an internal network (best: Tailscale), even if UI is exposed.
If you tell me your proxy stack (nginx / Caddy / Traefik / Cloudflare), I’ll recommend the tightest minimal config.

3. Memory: your hybrid design is good, but implement in two phases
   What I like about your design
   Separating short-term operational state from long-term vector memory is correct.
   Chroma as an external long-term store is reasonable.
   RRF fusion can improve recall quality.
   The main concern
   You’re adding two vector stores + fusion + retention + embedding pipeline before you even have stable “what should be remembered” semantics. That’s where memory systems usually go off the rails (cost + bloat + garbage-in).

Phase 1 (v1): SQLite-only “hybrid” (fast to ship, easy to control)
Do this first:

Use SQLite for:
event log (immutable)
session memory
a single embeddings table (sqlite-vec) for “approved long-term notes”
Add retention + promotion rules:
default: don’t store everything
store only:
trade decisions + rationales
outcomes/labels
research artifacts with citations
user-approved “remember this”
This gives you hybrid memory behavior without a second service.

Phase 2: Add Chroma when you hit real scale pain
Introduce Chroma only when:

SQLite size/latency is demonstrably an issue, or
you want cross-machine persistence / clustering, or
you need more advanced retrieval operations.
Then implement:

Chroma = long-term vector store for “curated memory”
SQLite keeps:
event log + indices + metadata + pointers into Chroma
RRF is optional; start with “query both, take best N” and add RRF only if needed.
This path keeps complexity proportional to value.

4. Continuous improvement + nightly jobs: keep it narrow at first
   For v1, your nightly system should produce exactly two outputs:

Daily Trading Report
what trades happened / what was proposed
outcome metrics (P&L windows, drawdown)
top 3 “worked” patterns and top 3 “failed” patterns (templated)
Change Proposal (human review)
suggested rule tweaks / prompt tweaks
suggested watchlist changes
suggested new data sources
nothing auto-applies
This gives you the “learn what worked” loop without building an autonomous self-modifying system.

Model routing for cost:

Ollama for report compilation + clustering + formatting
Cloud “reasoning model” only for “Change Proposal” synthesis if needed
Perplexity only for “news/catalyst” ingestion (and only for your sector/ticker universe) 5) “Eliminate noise” implementation checklist (what we do first)
To start slow and steady, I would implement these in order:

Step 1 — Product lockdown (capabilities)
UI + Telegram only
everything else disabled
fail-fast if other channels enabled
Step 2 — Trading safety rails
paper mode default
hard limits (position size, instruments, allowed symbols/sector ETFs)
explicit UI confirmation for any live order
Step 3 — Memory v1 (SQLite only)
event log schema
“promotion rules” for what becomes long-term memory
embeddings table for curated items only
Step 4 — Nightly cron v1
Daily report + change proposal
stored in DB and displayed in UI
Only after those are stable do we add Chroma.
