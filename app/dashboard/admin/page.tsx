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
  source: string | null;
  mode: string | null;
  error_signature: string | null;
  confidence_score: number | null;
  observability_coverage: number | null;
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

interface RecipeRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  ci_workflow_name: string | null;
  installation_id: number | null;
  allowed_domains: string[];
  allowed_command_categories: string[];
}

async function getData() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { runs: [], approvals: [], recipes: [] };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const [runsRes, approvalsRes, recipesRes] = await Promise.all([
    supabase.from("runs").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("approvals").select("*").order("requested_at", { ascending: false }).limit(100),
    supabase.from("recipes").select("*").order("repo_owner").order("repo_name"),
  ]);

  return {
    runs: (runsRes.data as RunRow[]) ?? [],
    approvals: (approvalsRes.data as ApprovalRow[]) ?? [],
    recipes: (recipesRes.data as RecipeRow[]) ?? [],
  };
}

export default async function AdminPage() {
  await requireAdmin();
  const { runs, approvals, recipes } = await getData();
  const correlations = runs.reduce<Array<{ key: string; count: number; repo: string }>>((acc, run) => {
    const key = run.error_signature ?? `${run.repo_owner}/${run.repo_name}`;
    const existing = acc.find((item) => item.key === key);
    if (existing) {
      existing.count += 1;
      return acc;
    }
    acc.push({
      key,
      count: 1,
      repo: `${run.repo_owner}/${run.repo_name}`,
    });
    return acc;
  }, []);

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
          <TabsTrigger value="policies">Policies ({recipes.length})</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
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
                  <TableHead>Mode</TableHead>
                  <TableHead>Confidence</TableHead>
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
                    <TableCell>{run.source ?? "web"} · {run.mode ?? "apply_verify"}</TableCell>
                    <TableCell>{run.confidence_score != null ? `${run.confidence_score}/100` : "—"}</TableCell>
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

        <TabsContent value="policies" className="mt-4">
          {recipes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No repo policies found.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repo</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>GitHub App</TableHead>
                  <TableHead>CI Workflow</TableHead>
                  <TableHead>Allowed Domains</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>{recipe.repo_owner}/{recipe.repo_name}</TableCell>
                    <TableCell>{recipe.enabled ? "true" : "false"}</TableCell>
                    <TableCell>{recipe.installation_id ?? "—"}</TableCell>
                    <TableCell>{recipe.ci_workflow_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {recipe.allowed_domains?.join(", ") || "none"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="correlation" className="mt-4">
          {correlations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No related incidents found yet.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correlation Key</TableHead>
                  <TableHead>Repo</TableHead>
                  <TableHead>Run Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correlations.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell className="font-mono text-xs">{entry.key}</TableCell>
                    <TableCell>{entry.repo}</TableCell>
                    <TableCell>{entry.count}</TableCell>
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
