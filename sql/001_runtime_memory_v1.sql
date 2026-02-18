PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  channel TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL,
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
  trigger_source TEXT NOT NULL,
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL,
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
  event_type TEXT NOT NULL,
  event_level TEXT NOT NULL,
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
  source_type TEXT NOT NULL,
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
  behavior_json TEXT NOT NULL,
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
  personality_json TEXT NOT NULL,
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
  proposed_by TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  proposal_json TEXT NOT NULL,
  determinism_score REAL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(skill_id) REFERENCES skills_learned(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS validation_results (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  validator TEXT NOT NULL,
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
  approval_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  notes TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY(proposal_id) REFERENCES skill_to_logic_proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deploy_outcomes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  deployment_target TEXT NOT NULL,
  deployment_id TEXT,
  status TEXT NOT NULL,
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
