/**
 * Database operations as durable steps.
 *
 * These MUST be "use step" functions because the Supabase client
 * uses setInterval (for auth auto-refresh), which is forbidden
 * inside "use workflow" functions. Steps run in normal Node.js runtime.
 */

async function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function createRunRecord(input: {
  runId: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
}) {
  "use step";
  console.log(`[db] createRunRecord: ${input.runId}`);
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.from("runs").upsert({
    id: input.runId,
    repo_owner: input.repoOwner,
    repo_name: input.repoName,
    base_branch: input.defaultBranch,
    status: "running",
  }, { onConflict: "id" });
}

export async function storePatch(input: {
  runId: string;
  unifiedDiff: string;
}) {
  "use step";
  console.log(`[db] storePatch: ${input.runId}`);
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.from("patches").upsert({
    run_id: input.runId,
    unified_diff: input.unifiedDiff,
    changed_files: [],
    diffstat: `${input.unifiedDiff.split("\n").length} lines`,
  }, { onConflict: "run_id" });
}

export async function createApprovalRecord(input: {
  runId: string;
  token: string;
}) {
  "use step";
  console.log(`[db] createApprovalRecord: ${input.runId} token=${input.token}`);
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.from("approvals").upsert({
    token: input.token,
    run_id: input.runId,
  });
}
