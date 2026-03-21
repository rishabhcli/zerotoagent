-- PatchPilot schema: productization

-- Broaden run status support for explicit blocked outcomes.
ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_status_check;
ALTER TABLE runs
  ADD CONSTRAINT runs_status_check
  CHECK (status IN (
    'pending',
    'running',
    'awaiting_approval',
    'approved',
    'rejected',
    'blocked',
    'failed',
    'completed'
  ));

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web'
    CHECK (source IN ('slack','github','web','voice')),
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'apply_verify'
    CHECK (mode IN ('dry_run','apply_verify')),
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS trace_id TEXT,
  ADD COLUMN IF NOT EXISTS sentry_trace_url TEXT,
  ADD COLUMN IF NOT EXISTS outcome_summary TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score INT,
  ADD COLUMN IF NOT EXISTS reproducibility_score INT,
  ADD COLUMN IF NOT EXISTS observability_coverage INT,
  ADD COLUMN IF NOT EXISTS rollback_recommendation BOOLEAN,
  ADD COLUMN IF NOT EXISTS error_signature TEXT,
  ADD COLUMN IF NOT EXISTS workflow_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS thread_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS voice_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS replay_of_run_id TEXT REFERENCES runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS runs_source_idx ON runs (source);
CREATE INDEX IF NOT EXISTS runs_mode_idx ON runs (mode);
CREATE INDEX IF NOT EXISTS runs_error_signature_idx ON runs (error_signature);

ALTER TABLE artifacts
  ADD COLUMN IF NOT EXISTS filename TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE approvals
  ADD COLUMN IF NOT EXISTS requested_action TEXT NOT NULL DEFAULT 'open_pr'
    CHECK (requested_action IN ('open_pr','rollback_preview')),
  ADD COLUMN IF NOT EXISTS required_role TEXT NOT NULL DEFAULT 'approver',
  ADD COLUMN IF NOT EXISTS requested_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS decision_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Fix run_id type mismatches introduced in the initial skeleton.
ALTER TABLE patches DROP CONSTRAINT IF EXISTS patches_pkey;
ALTER TABLE patches DROP CONSTRAINT IF EXISTS patches_run_id_fkey;
ALTER TABLE patches
  ALTER COLUMN run_id TYPE TEXT USING run_id::text;
ALTER TABLE patches
  ADD PRIMARY KEY (run_id);
ALTER TABLE patches
  ADD CONSTRAINT patches_run_id_fkey
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE;

ALTER TABLE prs DROP CONSTRAINT IF EXISTS prs_pkey;
ALTER TABLE prs DROP CONSTRAINT IF EXISTS prs_run_id_fkey;
ALTER TABLE prs
  ALTER COLUMN run_id TYPE TEXT USING run_id::text;
ALTER TABLE prs
  ADD PRIMARY KEY (run_id);
ALTER TABLE prs
  ADD CONSTRAINT prs_run_id_fkey
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE;
ALTER TABLE prs
  ADD COLUMN IF NOT EXISTS head_branch TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS ci_status TEXT,
  ADD COLUMN IF NOT EXISTS ci_url TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS repro_command TEXT,
  ADD COLUMN IF NOT EXISTS installation_id BIGINT,
  ADD COLUMN IF NOT EXISTS ci_workflow_name TEXT,
  ADD COLUMN IF NOT EXISTS allowed_command_categories JSONB NOT NULL DEFAULT '["install","repro","test","build","search","read","write","diff"]'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS recipes_enabled_idx ON recipes (enabled);

CREATE TABLE IF NOT EXISTS run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN (
    'intake',
    'parse_evidence',
    'resolve_repo_policy',
    'sandbox_setup',
    'reproduce',
    'patch',
    'verify',
    'approval',
    'pr_create',
    'ci_watch',
    'receipts_finalize'
  )),
  status TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed','blocked','skipped')),
  title TEXT NOT NULL,
  summary TEXT,
  decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_action TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_ms INT,
  UNIQUE (run_id, step_type)
);

CREATE INDEX IF NOT EXISTS run_steps_run_id_idx ON run_steps (run_id, started_at);

CREATE TABLE IF NOT EXISTS ci_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'github_actions',
  workflow_name TEXT,
  workflow_run_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  conclusion TEXT,
  url TEXT,
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ci_runs_run_id_idx ON ci_runs (run_id, started_at DESC);

CREATE TABLE IF NOT EXISTS receipt_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'zip',
  storage_path TEXT NOT NULL,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  retention_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipt_packages_retention_idx ON receipt_packages (retention_until);

CREATE TABLE IF NOT EXISTS demo_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('operator','approver','admin')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO demo_users (id, email, role, display_name)
VALUES
  ('demo-operator', 'operator@patchpilot.local', 'operator', 'PatchPilot Operator'),
  ('demo-approver', 'approver@patchpilot.local', 'approver', 'PatchPilot Approver'),
  ('demo-admin', 'admin@patchpilot.local', 'admin', 'PatchPilot Admin')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name;

-- Storage buckets used by the web upload and downloadable receipts flows.
INSERT INTO storage.buckets (id, name, public)
VALUES ('patchpilot-artifacts', 'patchpilot-artifacts', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('patchpilot-receipts', 'patchpilot-receipts', false)
ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE run_steps;
