-- RePro schema: artifact kind expansion

-- Allow audio artifacts produced by voice workflows and transcription flows.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'artifacts'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE artifacts DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_kind_check
  CHECK (kind IN ('log', 'screenshot', 'pdf', 'audio', 'other'));
