import Link from "next/link";
import { Activity, Mic, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { RunListTable, type Run } from "@/components/runs/run-list-table";
import { requireAuth } from "@/lib/auth-guard";

async function getRuns(): Promise<Run[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase
    .from("runs")
    .select(
      "id, created_at, status, repo_owner, repo_name, source, mode, confidence_score, observability_coverage"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as Run[]) ?? [];
}

function averageConfidence(runs: Run[]) {
  const withConfidence = runs.filter((run) => run.confidence_score != null);
  if (withConfidence.length === 0) return null;

  const total = withConfidence.reduce(
    (sum, run) => sum + (run.confidence_score ?? 0),
    0
  );

  return Math.round(total / withConfidence.length);
}

export default async function DashboardPage() {
  await requireAuth();
  const runs = await getRuns();

  const awaitingApproval = runs.filter(
    (run) => run.status === "awaiting_approval"
  ).length;
  const meanConfidence = averageConfidence(runs);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <GlassSurface
          variant="hero-panel"
          motionStrength={0.45}
          className="p-8 md:p-10"
        >
          <p className="section-kicker">Operator overview</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Verified <span className="text-gradient">runs</span> with readable
            proof.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Calmer motion. Better contrast. Same traceability.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/new" prefetch={false}>
              <Button size="lg">
                <Plus className="size-4" />
                New Web Run
              </Button>
            </Link>
            <Link href="/voice" prefetch={false}>
              <Button size="lg" variant="outline">
                <Mic className="size-4" />
                Voice Intake
              </Button>
            </Link>
          </div>
        </GlassSurface>

        <GlassSurface
          variant="card"
          motionStrength={0.34}
          className="grid gap-4 p-6"
        >
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              Active queue
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {runs.length}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              Awaiting approval
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {awaitingApproval}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              Avg confidence
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {meanConfidence != null ? `${meanConfidence}/100` : "—"}
            </p>
          </div>
        </GlassSurface>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassSurface
          variant="quiet-panel"
          motionStrength={0.32}
          className="p-5"
        >
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Run trace
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Decisions, receipts, approvals, and evidence stay together.
          </p>
        </GlassSurface>
        <GlassSurface
          variant="quiet-panel"
          motionStrength={0.32}
          className="p-5"
        >
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Approval gate
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            PR creation stays role-gated.
          </p>
        </GlassSurface>
        <GlassSurface
          variant="quiet-panel"
          motionStrength={0.32}
          className="p-5"
        >
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Policy guardrails
          </p>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Repo allowlists and sandbox policy stay visible.
          </p>
        </GlassSurface>
      </div>

      {runs.length === 0 ? (
        <GlassSurface
          variant="card"
          motionStrength={0.3}
          className="flex min-h-[22rem] flex-col items-center justify-center p-10 text-center"
        >
          <div className="flex size-20 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-primary">
            <Activity className="size-9" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
            No runs yet
          </h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            Start a run from web or voice to open the trace.
          </p>
          <Link href="/dashboard/new" prefetch={false} className="mt-6">
            <Button>Start Verified Fix Run</Button>
          </Link>
        </GlassSurface>
      ) : (
        <GlassSurface
          variant="card"
          motionStrength={0.28}
          className="overflow-hidden"
        >
          <div className="border-b border-white/[0.08] px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Recent activity
            </h2>
          </div>
          <RunListTable runs={runs} />
        </GlassSurface>
      )}
    </div>
  );
}
