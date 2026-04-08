import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GlassSurface } from "@/components/ui/glass-surface";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { RunTimeline } from "@/components/runs/run-timeline";
import { ApprovalCard } from "@/components/runs/approval-card";
import { RunActionBar } from "@/components/runs/run-action-bar";
import { requireAuth } from "@/lib/auth-guard";
import {
  canResolveApprovals,
  canStartRuns,
  getRunDetailView,
} from "@/lib/dashboard-data";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const session = await requireAuth();
  const { runId } = await params;
  const { run, events, steps, approval, patch, pr, ci, receipts } =
    await getRunDetailView(session, runId);

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
    <div className="space-y-6">
      <GlassSurface
        variant="hero-panel"
        motionStrength={0.24}
        className="p-8 md:p-10"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="section-kicker">Run trace</p>
              <RunStatusBadge status={run.status} />
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              {run.repo_owner}/{run.repo_name}
            </h1>
            <p className="mt-3 font-mono text-sm text-muted-foreground">{run.id}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {run.base_branch} · {new Date(run.created_at).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {run.source} · {run.mode === "dry_run" ? "Dry Run" : "Apply + Verify"} · {run.environment}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to runs
          </Link>
        </div>
      </GlassSurface>

      <Separator />

      <RunActionBar
        runId={runId}
        canReplay={canStartRuns(session)}
        hasReceipts={Boolean(receipts)}
        sentryTraceUrl={run.sentry_trace_url}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card interactive>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Patch Confidence</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {run.confidence_score != null ? `${run.confidence_score}/100` : "—"}
          </CardContent>
        </Card>
        <Card interactive>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reproducibility</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {run.reproducibility_score != null ? `${run.reproducibility_score}/100` : "—"}
          </CardContent>
        </Card>
        <Card interactive>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Observability</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {run.observability_coverage != null ? `${run.observability_coverage}%` : "—"}
          </CardContent>
        </Card>
        <Card interactive>
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
            canResolve={canResolveApprovals(session)}
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
        <Card className="border-green-400/20">
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
            <pre className="max-h-96 overflow-x-auto rounded-[1.25rem] bg-white/[0.05] p-4 text-xs">
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
