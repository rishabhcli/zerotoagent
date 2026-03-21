import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { RunTimeline } from "@/components/runs/run-timeline";
import { ApprovalCard } from "@/components/runs/approval-card";
import { RunActionBar } from "@/components/runs/run-action-bar";
import type { RunEvent } from "@/hooks/use-run-events";
import { requireAuth } from "@/lib/auth-guard";
import type { RunStep } from "@/components/runs/run-timeline";

interface RunData {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
  base_branch: string;
  source: string;
  mode: string;
  environment: string;
  outcome_summary: string | null;
  confidence_score: number | null;
  reproducibility_score: number | null;
  observability_coverage: number | null;
  sentry_trace_url: string | null;
  trace_id: string | null;
}

interface ApprovalData {
  token: string;
  approved: boolean | null;
  resolved_at: string | null;
  required_role: string | null;
  decision_summary: Record<string, unknown> | null;
}

interface PatchData {
  unified_diff: string;
  diffstat: string | null;
}

interface PrData {
  pr_url: string;
  pr_number: number;
  summary: string | null;
}

interface CiData {
  status: string;
  conclusion: string | null;
  summary: string | null;
  url: string | null;
}

interface ReceiptPackageData {
  storage_path: string;
  manifest: Record<string, unknown> | null;
}

async function getRunData(runId: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      run: null,
      events: [],
      steps: [],
      approval: null,
      patch: null,
      pr: null,
      ci: null,
      receipts: null,
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const [runRes, eventsRes, stepsRes, approvalRes, patchRes, prRes, ciRes, receiptsRes] = await Promise.all([
    supabase.from("runs").select("*").eq("id", runId).single(),
    supabase.from("run_events").select("*").eq("run_id", runId).order("seq"),
    supabase.from("run_steps").select("*").eq("run_id", runId).order("started_at"),
    supabase.from("approvals").select("*").eq("run_id", runId).maybeSingle(),
    supabase.from("patches").select("*").eq("run_id", runId).maybeSingle(),
    supabase.from("prs").select("*").eq("run_id", runId).maybeSingle(),
    supabase.from("ci_runs").select("*").eq("run_id", runId).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("receipt_packages").select("*").eq("run_id", runId).maybeSingle(),
  ]);

  return {
    run: runRes.data as RunData | null,
    events: (eventsRes.data as RunEvent[]) ?? [],
    steps: (stepsRes.data as RunStep[]) ?? [],
    approval: approvalRes.data as ApprovalData | null,
    patch: patchRes.data as PatchData | null,
    pr: prRes.data as PrData | null,
    ci: ciRes.data as CiData | null,
    receipts: receiptsRes.data as ReceiptPackageData | null,
  };
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await requireAuth();
  const { runId } = await params;
  const { run, events, steps, approval, patch, pr, ci, receipts } = await getRunData(runId);

  if (!run) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Run not found</h1>
        <p className="text-muted-foreground">
          Run <code className="font-mono">{runId}</code> does not exist
          {!process.env.SUPABASE_URL && " (Supabase not configured)"}.
        </p>
        <Link href="/dashboard" className="text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Run</h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground mt-1">{run.id}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {run.repo_owner}/{run.repo_name} ({run.base_branch})
            {" — "}
            {new Date(run.created_at).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {run.source} · {run.mode === "dry_run" ? "Dry Run" : "Apply + Verify"} · {run.environment}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to runs
        </Link>
      </div>

      <Separator />

      <RunActionBar
        runId={runId}
        hasReceipts={Boolean(receipts)}
        sentryTraceUrl={run.sentry_trace_url}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Patch Confidence</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {run.confidence_score != null ? `${run.confidence_score}/100` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reproducibility</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {run.reproducibility_score != null ? `${run.reproducibility_score}/100` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Observability</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {run.observability_coverage != null ? `${run.observability_coverage}%` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trace ID</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono text-muted-foreground">
            {run.trace_id ?? "Pending"}
          </CardContent>
        </Card>
      </div>

      {run.outcome_summary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outcome Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">{run.outcome_summary}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Approval card */}
      {run.status === "awaiting_approval" && approval && !approval.resolved_at && (
        <div id="approval-console">
          <ApprovalCard
            runId={runId}
            requiredRole={approval.required_role ?? "approver"}
            patchSummary={
              typeof approval.decision_summary?.patchSummary === "string"
                ? approval.decision_summary.patchSummary
                : pr?.summary ?? null
            }
            testSummary={
              patch?.diffstat
                ? "Sandbox verification passed; approver confirmation required before PR creation."
                : null
            }
            diffstat={patch?.diffstat ?? null}
          />
        </div>
      )}

      {/* PR link */}
      {pr && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-lg">Pull Request</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={pr.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline font-mono"
            >
              #{pr.pr_number} — {pr.pr_url}
            </a>
          </CardContent>
        </Card>
      )}

      {ci && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">GitHub Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{ci.status}</span>
              {ci.conclusion ? ` · ${ci.conclusion}` : ""}
            </p>
            {ci.summary ? <p className="text-sm text-muted-foreground">{ci.summary}</p> : null}
            {ci.url ? (
              <a
                href={ci.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                View CI run
              </a>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Patch preview */}
      {patch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patch.diffstat ? (
              <p className="text-sm text-muted-foreground">Diffstat: {patch.diffstat}</p>
            ) : null}
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-96">
              {patch.unified_diff || "(empty diff)"}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Run Trace</h2>
        <RunTimeline runId={runId} initialSteps={steps} initialEvents={events} />
      </div>
    </div>
  );
}
