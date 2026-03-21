/**
 * Database operations as durable steps.
 *
 * These MUST be "use step" functions because the Supabase client
 * uses setInterval (for auth auto-refresh), which is forbidden
 * inside "use workflow" functions. Steps run in normal Node.js runtime.
 */
import type {
  ApprovalAction,
  RepoPolicy,
  RunMode,
  RunSource,
  RunStartPayload,
  RunStatus,
  RunStepStatus,
  RunStepType,
} from "@/lib/patchpilot/contracts";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import { redactUnknown } from "@/lib/patchpilot/redaction";

async function getSupabase() {
  return getSupabaseAdmin();
}

function summarizeDiff(unifiedDiff: string) {
  const files = new Set<string>();
  let additions = 0;
  let deletions = 0;

  for (const line of unifiedDiff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      files.add(line.slice(6));
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions += 1;
    }
  }

  return {
    changedFiles: Array.from(files),
    diffstat: `${files.size} file(s), +${additions} / -${deletions}`,
  };
}

export async function createRunRecord(input: {
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
    source: input.source,
    mode: input.mode,
    environment: input.environment,
    workflow_input: redactUnknown(input.workflowInput),
    thread_context: redactUnknown(input.threadContext ?? {}),
    voice_context: redactUnknown(input.voiceContext ?? {}),
  }, { onConflict: "id" });
}

export async function updateRunRecord(input: {
  runId: string;
  status?: RunStatus;
  traceId?: string | null;
  sentryTraceUrl?: string | null;
  policySnapshot?: RepoPolicy | Record<string, unknown>;
  outcomeSummary?: string | null;
  confidenceScore?: number | null;
  reproducibilityScore?: number | null;
  observabilityCoverage?: number | null;
  rollbackRecommendation?: boolean | null;
  errorSignature?: string | null;
}) {
  "use step";
  const supabase = await getSupabase();
  if (!supabase) return;

  const payload = redactUnknown({
    updated_at: new Date().toISOString(),
    ...(input.status ? { status: input.status } : {}),
    ...(input.traceId !== undefined ? { trace_id: input.traceId } : {}),
    ...(input.sentryTraceUrl !== undefined ? { sentry_trace_url: input.sentryTraceUrl } : {}),
    ...(input.policySnapshot !== undefined ? { policy_snapshot: input.policySnapshot } : {}),
    ...(input.outcomeSummary !== undefined ? { outcome_summary: input.outcomeSummary } : {}),
    ...(input.confidenceScore !== undefined ? { confidence_score: input.confidenceScore } : {}),
    ...(input.reproducibilityScore !== undefined
      ? { reproducibility_score: input.reproducibilityScore }
      : {}),
    ...(input.observabilityCoverage !== undefined
      ? { observability_coverage: input.observabilityCoverage }
      : {}),
    ...(input.rollbackRecommendation !== undefined
      ? { rollback_recommendation: input.rollbackRecommendation }
      : {}),
    ...(input.errorSignature !== undefined ? { error_signature: input.errorSignature } : {}),
  });

  await supabase.from("runs").update(payload).eq("id", input.runId);
}

export async function recordRunStep(input: {
  runId: string;
  stepType: RunStepType;
  status: RunStepStatus;
  title: string;
  summary?: string | null;
  decision?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  toolReceipts?: unknown[];
  nextAction?: string | null;
  retryCount?: number;
  startedAt?: string;
  endedAt?: string | null;
  durationMs?: number | null;
}) {
  "use step";
  const supabase = await getSupabase();
  if (!supabase) return;

  await supabase.from("run_steps").upsert(
    redactUnknown({
      run_id: input.runId,
      step_type: input.stepType,
      status: input.status,
      title: input.title,
      summary: input.summary ?? null,
      decision: input.decision ?? {},
      evidence: input.evidence ?? {},
      tool_receipts: input.toolReceipts ?? [],
      next_action: input.nextAction ?? null,
      retry_count: input.retryCount ?? 0,
      started_at: input.startedAt ?? new Date().toISOString(),
      ended_at: input.endedAt ?? null,
      duration_ms: input.durationMs ?? null,
    }),
    { onConflict: "run_id,step_type" }
  );
}

export async function storeArtifacts(input: {
  runId: string;
  artifacts: Array<{
    kind: string;
    storagePath: string;
    mimeType: string;
    filename: string;
    source?: string;
    sizeBytes?: number;
    summary?: string;
  }>;
}) {
  "use step";
  const supabase = await getSupabase();
  if (!supabase || input.artifacts.length === 0) return;

  await supabase.from("artifacts").upsert(
    input.artifacts.map((artifact) =>
      redactUnknown({
        run_id: input.runId,
        kind: artifact.kind,
        storage_path: artifact.storagePath,
        mime_type: artifact.mimeType,
        source: artifact.source ?? "web",
        filename: artifact.filename,
        size_bytes: artifact.sizeBytes ?? null,
        summary: artifact.summary ?? null,
      })
    )
  );
}

export async function storePatch(input: {
  runId: string;
  unifiedDiff: string;
}) {
  "use step";
  console.log(`[db] storePatch: ${input.runId}`);
  const supabase = await getSupabase();
  if (!supabase) return;
  const summary = summarizeDiff(input.unifiedDiff);
  await supabase.from("patches").upsert({
    run_id: input.runId,
    unified_diff: input.unifiedDiff,
    changed_files: summary.changedFiles,
    diffstat: summary.diffstat,
  }, { onConflict: "run_id" });
}

export async function createApprovalRecord(input: {
  runId: string;
  token: string;
  requestedAction?: ApprovalAction;
  requiredRole?: string;
  requestedByUserId?: string | null;
}) {
  "use step";
  console.log(`[db] createApprovalRecord: ${input.runId} token=${input.token}`);
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.from("approvals").upsert({
    token: input.token,
    run_id: input.runId,
    requested_action: input.requestedAction ?? "open_pr",
    required_role: input.requiredRole ?? "approver",
    requested_by_user_id: input.requestedByUserId ?? null,
  });
}

export async function resolveApprovalRecord(input: {
  token: string;
  approved: boolean;
  comment?: string | null;
  resolvedByUserId?: string | null;
}) {
  "use step";
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase
    .from("approvals")
    .update(
      redactUnknown({
        resolved_at: new Date().toISOString(),
        approved: input.approved,
        comment: input.comment ?? null,
        resolved_by_user_id: input.resolvedByUserId ?? null,
        decision_summary: {
          approved: input.approved,
          comment: input.comment ?? null,
        },
      })
    )
    .eq("token", input.token);
}

export async function storePrRecord(input: {
  runId: string;
  provider?: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  prUrl: string;
  headBranch?: string;
  summary?: string | null;
}) {
  "use step";
  const supabase = await getSupabase();
  if (!supabase) return;

  await supabase.from("prs").upsert(
    redactUnknown({
      run_id: input.runId,
      provider: input.provider ?? "github",
      repo_owner: input.repoOwner,
      repo_name: input.repoName,
      pr_number: input.prNumber,
      pr_url: input.prUrl,
      head_branch: input.headBranch ?? null,
      summary: input.summary ?? null,
    }),
    { onConflict: "run_id" }
  );
}

export async function storeCiRun(input: {
  runId: string;
  provider?: string;
  workflowName?: string | null;
  workflowRunId?: string | null;
  status: string;
  conclusion?: string | null;
  url?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string | null;
}) {
  "use step";
  const supabase = await getSupabase();
  if (!supabase) return;

  await supabase.from("ci_runs").insert(
    redactUnknown({
      run_id: input.runId,
      provider: input.provider ?? "github_actions",
      workflow_name: input.workflowName ?? null,
      workflow_run_id: input.workflowRunId ?? null,
      status: input.status,
      conclusion: input.conclusion ?? null,
      url: input.url ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ?? {},
      started_at: input.startedAt ?? new Date().toISOString(),
      completed_at: input.completedAt ?? null,
    })
  );
}
