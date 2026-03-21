import { buildReceiptManifest, createReceiptArchive, storeReceiptArchive } from "@/lib/patchpilot/receipts";
import type { ConfidenceBreakdown, RunStartPayload } from "@/lib/patchpilot/contracts";
import { requireSupabaseAdmin } from "@/lib/patchpilot/supabase";

export async function finalizeReceiptsStep(input: {
  runId: string;
  workflowInput: RunStartPayload;
  summary: string;
  patchSummary: string;
  status: "completed" | "failed" | "rejected" | "blocked";
  confidence: ConfidenceBreakdown;
  reproducibility: ConfidenceBreakdown;
  observabilityCoverage: number;
  traceId?: string | null;
  sentryTraceUrl?: string | null;
}) {
  "use step";

  const supabase = requireSupabaseAdmin();
  const [runRes, eventsRes, stepsRes, approvalRes, patchRes, prRes, ciRes] = await Promise.all([
    supabase.from("runs").select("*").eq("id", input.runId).single(),
    supabase.from("run_events").select("*").eq("run_id", input.runId).order("seq"),
    supabase.from("run_steps").select("*").eq("run_id", input.runId).order("started_at"),
    supabase.from("approvals").select("*").eq("run_id", input.runId).maybeSingle(),
    supabase.from("patches").select("*").eq("run_id", input.runId).maybeSingle(),
    supabase.from("prs").select("*").eq("run_id", input.runId).maybeSingle(),
    supabase.from("ci_runs").select("*").eq("run_id", input.runId).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const manifest = buildReceiptManifest({
    runId: input.runId,
    mode: input.workflowInput.mode,
    source: input.workflowInput.source,
    repo: {
      owner: input.workflowInput.repo.owner,
      name: input.workflowInput.repo.name,
      branch: input.workflowInput.repo.defaultBranch,
    },
    environment: input.workflowInput.environment,
    status: input.status,
    summary: input.summary,
    patchSummary: input.patchSummary,
    confidence: input.confidence,
    reproducibility: input.reproducibility,
    observabilityCoverage: input.observabilityCoverage,
    approval: {
      requestedAction: approvalRes.data?.requested_action ?? "open_pr",
      requiredRole: approvalRes.data?.required_role ?? "approver",
      approved: approvalRes.data?.approved ?? null,
      approvedBy: approvalRes.data?.resolved_by_user_id ?? null,
      comment: approvalRes.data?.comment ?? null,
      resolvedAt: approvalRes.data?.resolved_at ?? null,
    },
    pr: {
      url: prRes.data?.pr_url ?? null,
      number: prRes.data?.pr_number ?? null,
    },
    ci: {
      provider: ciRes.data?.provider ?? "github_actions",
      status: ciRes.data?.status ?? "not_started",
      url: ciRes.data?.url ?? null,
      summary: ciRes.data?.summary ?? null,
    },
    trace: {
      traceId: input.traceId ?? runRes.data?.trace_id ?? null,
      sentryUrl: input.sentryTraceUrl ?? runRes.data?.sentry_trace_url ?? null,
    },
    files: (patchRes.data?.changed_files ?? []).map((path: string) => ({
      path,
      kind: "source",
    })),
  });

  const archive = await createReceiptArchive({
    manifest,
    diff: patchRes.data?.unified_diff ?? "",
    runEvents: eventsRes.data ?? [],
    runSteps: stepsRes.data ?? [],
    approvalRecord: approvalRes.data ?? undefined,
    ciRecord: ciRes.data ?? undefined,
  });

  return storeReceiptArchive({
    runId: input.runId,
    archive,
    manifest,
  });
}
