import type { RunMode, RunSource, RunStartPayload } from "@/lib/patchpilot/contracts";
import { redactUnknown } from "@/lib/patchpilot/redaction";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";

/**
 * Inserts or updates the `runs` row for a workflow invocation.
 * Called from API routes before `start()` so `/runs/[id]` never races the workflow VM.
 * The workflow step `createRunRecord` upserts the same row (idempotent).
 */
export async function upsertRunRecordRow(input: {
  runId: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  source: RunSource;
  mode: RunMode;
  environment: string;
  workflowInput: RunStartPayload;
  threadContext?: Record<string, unknown>;
  voiceContext?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("runs").upsert(
    {
      id: input.runId,
      repo_owner: input.repoOwner,
      repo_name: input.repoName,
      base_branch: input.defaultBranch,
      status: "running",
      source: input.source,
      mode: input.mode,
      environment: input.environment,
      workflow_input: redactUnknown(input.workflowInput),
      thread_context: redactUnknown(input.threadContext ?? {}),
      voice_context: redactUnknown(input.voiceContext ?? {}),
    },
    { onConflict: "id" }
  );
}
