import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RunListTable, type Run } from "@/components/runs/run-list-table";
import { requireAuth } from "@/lib/auth-guard";
import { Mic, Activity, Plus, ShieldCheck } from "lucide-react";

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
    .select("id, created_at, status, repo_owner, repo_name, source, mode, confidence_score, observability_coverage")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as Run[]) ?? [];
}

export default async function DashboardPage() {
  await requireAuth();
  const runs = await getRuns();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/30 rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="z-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Verified <span className="text-gradient">Fix Runs</span>
          </h1>
          <p className="text-lg text-muted-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Incident-to-PR resolution tracking
          </p>
        </div>
        <div className="z-10 mt-4 flex flex-wrap gap-3 md:mt-0">
          <Link href="/dashboard/new">
            <Button size="lg" className="rounded-full gap-2 px-8 py-6 text-md shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all hover:shadow-[0_0_30px_rgba(var(--primary),0.6)]">
              <Plus className="w-5 h-5" />
              New Web Run
            </Button>
          </Link>
          <Link href="/voice">
            <Button size="lg" variant="outline" className="rounded-full gap-2 px-8 py-6 text-md">
              <Mic className="w-5 h-5" />
              Voice Intake
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl border border-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Run Trace</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Every run keeps a readable timeline with decisions, tool receipts, approvals, and downloadable evidence.
          </p>
        </div>
        <div className="glass-card rounded-2xl border border-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Approval Gate</p>
          <p className="mt-2 text-sm text-muted-foreground">
            PR creation is role-gated. Operators can run and inspect; approvers authorize the final step.
          </p>
        </div>
        <div className="glass-card rounded-2xl border border-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Policy Guardrails</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            Repo allowlists, command categories, and sandbox network policy stay visible to judges and operators.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
            <Activity className="w-10 h-10 text-primary opacity-80" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No runs yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start a new incident resolution run from Slack, GitHub, or use the voice interface to begin debugging instantly.
          </p>
          <Link href="/dashboard/new" className="mt-6">
            <Button>Start Verified Fix Run</Button>
          </Link>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>
          <RunListTable runs={runs} />
        </div>
      )}
    </div>
  );
}
