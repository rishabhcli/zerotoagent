-- RePro schema: Phase 1 init

-- Runs table: one row per RePro run
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','awaiting_approval','approved','rejected','failed','completed')),
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  head_branch TEXT,
  model_primary TEXT NOT NULL DEFAULT 'google/gemini-3.1-pro-preview',
  model_fallbacks JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs (created_at DESC);
CREATE INDEX IF NOT EXISTS runs_status_idx ON runs (status);

-- Run events: append-only event log for UI + debugging
CREATE TABLE IF NOT EXISTS run_events (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  seq INT NOT NULL,
  type TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  span_id TEXT,
  tool_name TEXT,
  UNIQUE (run_id, seq)
);

CREATE INDEX IF NOT EXISTS run_events_run_id_ts_idx ON run_events (run_id, ts);

-- Artifacts: screenshot/log/pdf refs
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('log','screenshot','pdf','other')),
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  sha256 TEXT,
  source TEXT
);

CREATE INDEX IF NOT EXISTS artifacts_run_id_idx ON artifacts (run_id);

-- Approvals: mirrors workflow hook token/resolution
CREATE TABLE IF NOT EXISTS approvals (
  token TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  approved BOOLEAN,
  comment TEXT,
  resolved_by_user_id TEXT
);

CREATE INDEX IF NOT EXISTS approvals_run_id_idx ON approvals (run_id);

-- Patches: verified patch diff from sandbox
CREATE TABLE IF NOT EXISTS patches (
  run_id UUID PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  unified_diff TEXT NOT NULL,
  changed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  diffstat TEXT
);

-- PRs: PR metadata for receipts
CREATE TABLE IF NOT EXISTS prs (
  run_id UUID PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'github',
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  pr_number INT NOT NULL,
  pr_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prs_repo_idx ON prs (repo_owner, repo_name);

-- Recipes: per-repo config for the agent
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  test_command TEXT NOT NULL DEFAULT 'pnpm test',
  install_command TEXT NOT NULL DEFAULT 'pnpm install',
  build_command TEXT,
  package_manager TEXT NOT NULL DEFAULT 'pnpm'
    CHECK (package_manager IN ('pnpm','npm','yarn')),
  allowed_domains JSONB DEFAULT '[]'::jsonb,
  snapshot_id TEXT,
  UNIQUE (repo_owner, repo_name)
);

-- Enable realtime for run_events (required for Supabase Realtime Postgres Changes)
ALTER PUBLICATION supabase_realtime ADD TABLE run_events;
