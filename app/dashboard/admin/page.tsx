import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { requireAdmin } from "@/lib/auth-guard";

interface RunRow {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
}

interface ApprovalRow {
  token: string;
  run_id: string;
  requested_at: string;
  resolved_at: string | null;
  approved: boolean | null;
  comment: string | null;
  resolved_by_user_id: string | null;
}

async function getData() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { runs: [], approvals: [] };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const [runsRes, approvalsRes] = await Promise.all([
    supabase.from("runs").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("approvals").select("*").order("requested_at", { ascending: false }).limit(100),
  ]);

  return {
    runs: (runsRes.data as RunRow[]) ?? [],
    approvals: (approvalsRes.data as ApprovalRow[]) ?? [],
  };
}

export default async function AdminPage() {
  await requireAdmin();
  const { runs, approvals } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          Audit console — run history and approval log
        </p>
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Run History ({runs.length})</TabsTrigger>
          <TabsTrigger value="approvals">Approval Log ({approvals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4">
          {runs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No runs found.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Repo</TableHead>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell>{run.repo_owner}/{run.repo_name}</TableCell>
                    <TableCell className="font-mono text-xs">{run.id}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(run.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          {approvals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approvals found.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((a) => (
                  <TableRow key={a.token}>
                    <TableCell>
                      {a.approved === null ? (
                        <RunStatusBadge status="awaiting_approval" />
                      ) : a.approved ? (
                        <RunStatusBadge status="approved" />
                      ) : (
                        <RunStatusBadge status="rejected" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.run_id}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.requested_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{a.comment ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
