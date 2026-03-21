import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    .select("id, created_at, status, repo_owner, repo_name")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as Run[]) ?? [];
}

export default async function DashboardPage() {
  await requireAuth();
  const runs = await getRuns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
          <p className="text-muted-foreground">
            Incident-to-PR verified fix runs
          </p>
        </div>
        <Link href="/voice">
          <Button>New Run (Voice)</Button>
        </Link>
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No runs yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a run from Slack, GitHub, or the voice page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <RunListTable runs={runs} />
      )}
    </div>
  );
}
