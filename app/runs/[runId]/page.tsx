import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { RunTimeline } from "@/components/runs/run-timeline";
import { ApprovalCard } from "@/components/runs/approval-card";
import type { RunEvent } from "@/hooks/use-run-events";
import { requireAuth } from "@/lib/auth-guard";

interface RunData {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
  base_branch: string;
}

async function getRunData(runId: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { run: null, events: [], approval: null, patch: null, pr: null };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const [runRes, eventsRes, approvalRes, patchRes, prRes] = await Promise.all([
    supabase.from("runs").select("*").eq("id", runId).single(),
    supabase.from("run_events").select("*").eq("run_id", runId).order("seq"),
    supabase.from("approvals").select("*").eq("run_id", runId).single(),
    supabase.from("patches").select("*").eq("run_id", runId).single(),
    supabase.from("prs").select("*").eq("run_id", runId).single(),
  ]);

  return {
    run: runRes.data as RunData | null,
    events: (eventsRes.data as RunEvent[]) ?? [],
    approval: approvalRes.data as { token: string; approved: boolean | null; resolved_at: string | null } | null,
    patch: patchRes.data as { unified_diff: string; diffstat: string | null } | null,
    pr: prRes.data as { pr_url: string; pr_number: number } | null,
  };
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await requireAuth();
  const { runId } = await params;
  const { run, events, approval, patch, pr } = await getRunData(runId);

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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to runs
        </Link>
      </div>

      <Separator />

      {/* Approval card */}
      {run.status === "awaiting_approval" && approval && !approval.resolved_at && (
        <ApprovalCard runId={runId} token={approval.token} />
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

      {/* Patch preview */}
      {patch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patch</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-96">
              {patch.unified_diff || "(empty diff)"}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Run Trace</h2>
        <RunTimeline runId={runId} initialEvents={events} />
      </div>
    </div>
  );
}
