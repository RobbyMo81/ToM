# Runtime Memory DB Schema v1 (ToM + O.X.I.D.E)

Purpose: Define a shared SQLite system-of-record for conversational memory, workflow state, skill learning, governance decisions, and behavior/personality evolution.

- Engine: SQLite
- Suggested file: `memory/tom_runtime.sqlite`
- Scope: runtime state and governance history (not vector embeddings)

---

## Design Principles

1. Keep vector retrieval and runtime chronology separate.
2. Preserve append-only audit trails for high-risk decisions.
3. Version behavior/personality with effective windows.
4. Allow deterministic replay of skill-to-logic promotion flow.

---

## Core Tables (DDL)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL, -- e.g. tom, oxide, user, system
  channel TEXT,        -- cli, api, sdk, cron
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL, -- system|user|assistant|tool|agent
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, turn_index)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  trigger_source TEXT NOT NULL, -- cron|manual|api|agent
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL,          -- queued|running|failed|succeeded|aborted
  started_at TEXT NOT NULL,
  finished_at TEXT,
  context_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(workflow_run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
  UNIQUE(workflow_run_id, step_index)
);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT,
  step_id TEXT,
  event_type TEXT NOT NULL,      -- info|warn|error|policy|approval
  event_level TEXT NOT NULL,     -- low|medium|high|critical
  message TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(workflow_run_id) REFERENCES workflow_runs(id) ON DELETE SET NULL,
  FOREIGN KEY(step_id) REFERENCES workflow_steps(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skills_learned (
  id TEXT PRIMARY KEY,
  skill_key TEXT NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT NOT NULL,     -- conversation|doc|external
  source_ref TEXT,
  confidence REAL NOT NULL,
  learned_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(skill_key, learned_at)
);

CREATE TABLE IF NOT EXISTS behavior_profiles (
  id TEXT PRIMARY KEY,
  profile_name TEXT NOT NULL,
  version INTEGER NOT NULL,
  behavior_json TEXT NOT NULL,   -- constraints, communication style, escalation policy
  rationale TEXT,
  source_ref TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  UNIQUE(profile_name, version)
);

CREATE TABLE IF NOT EXISTS personality_profiles (
  id TEXT PRIMARY KEY,
  profile_name TEXT NOT NULL,
  version INTEGER NOT NULL,
  personality_json TEXT NOT NULL, -- traits, tone, adaptive preferences
  rationale TEXT,
  source_ref TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  UNIQUE(profile_name, version)
);

CREATE TABLE IF NOT EXISTS skill_to_logic_proposals (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  proposed_by TEXT NOT NULL,      -- oxide|human
  proposal_type TEXT NOT NULL,    -- code_patch|config_change|policy_change
  proposal_json TEXT NOT NULL,
  determinism_score REAL,
  risk_level TEXT NOT NULL,       -- low|medium|high|critical
  status TEXT NOT NULL,           -- drafted|validated|rejected|approved|promoted
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(skill_id) REFERENCES skills_learned(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS validation_results (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  validator TEXT NOT NULL,        -- ci|oxide|human
  build_pass INTEGER NOT NULL DEFAULT 0,
  lint_pass INTEGER NOT NULL DEFAULT 0,
  test_pass INTEGER NOT NULL DEFAULT 0,
  policy_pass INTEGER NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}',
  validated_at TEXT NOT NULL,
  FOREIGN KEY(proposal_id) REFERENCES skill_to_logic_proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  approver TEXT NOT NULL,
  approval_type TEXT NOT NULL,    -- policy|human|security|ops
  decision TEXT NOT NULL,         -- approved|rejected
  notes TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY(proposal_id) REFERENCES skill_to_logic_proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deploy_outcomes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  deployment_target TEXT NOT NULL,
  deployment_id TEXT,
  status TEXT NOT NULL,           -- succeeded|failed|rolled_back
  summary TEXT,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  deployed_at TEXT NOT NULL,
  FOREIGN KEY(proposal_id) REFERENCES skill_to_logic_proposals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_turns_session_created ON conversation_turns(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status, started_at);
CREATE INDEX IF NOT EXISTS idx_skills_key_state ON skills_learned(skill_key, state);
CREATE INDEX IF NOT EXISTS idx_proposals_status_risk ON skill_to_logic_proposals(status, risk_level);
CREATE INDEX IF NOT EXISTS idx_behavior_effective ON behavior_profiles(profile_name, effective_from);
CREATE INDEX IF NOT EXISTS idx_personality_effective ON personality_profiles(profile_name, effective_from);
```

---

## Behavior + Personality Notes

- `behavior_profiles` stores operational behavior constraints (e.g., escalation thresholds, guardrails, execution style).
- `personality_profiles` stores communication and interaction traits.
- Both use versioning + effective windows for deterministic historical replay.

---

## Minimum v1 Query Set

1. Latest active behavior profile for `tom`.
2. Latest active personality profile for `tom`.
3. Session replay by `session_id` ordered by `turn_index`.
4. Workflow replay by `workflow_run_id` ordered by `step_index` + events.
5. Full proposal lineage: `skill → proposal → validations → approvals → deploy outcome`.

---

## Suggested Migration Path

1. Add bootstrap SQL migration file for v1 schema.
2. Introduce a `RuntimeMemoryStore` TypeScript adapter.
3. Start writing `sessions` + `conversation_turns` first.
4. Add workflow/proposal lineage writes in O.X.I.D.E rollout phase.
5. Enable behavior/personality profile reads in response orchestration.
