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
import { GlassSurface } from "@/components/ui/glass-surface";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { requireAdmin } from "@/lib/auth-guard";
import { syncGitHubInstallationRecipes } from "@/lib/patchpilot/repo-sync";

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
  let syncedRepositories: string[] = [];
  let syncedRepoCount: number | null = null;
  let installationCount: number | null = null;

  try {
    const syncSummary = await syncGitHubInstallationRecipes();
    if (syncSummary.synced) {
      syncedRepositories = syncSummary.repositories;
      syncedRepoCount = syncSummary.discoveredRepoCount;
      installationCount = syncSummary.installationCount;
    }
  } catch (error) {
    console.error("[dashboard/admin] failed to sync GitHub repositories", error);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      runs: [],
      approvals: [],
      recipes: [],
      syncedRepositories,
      syncedRepoCount,
      installationCount,
    };
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
    syncedRepositories,
    syncedRepoCount,
    installationCount,
  };
}

export default async function AdminPage() {
  await requireAdmin();
  const { runs, approvals, recipes, syncedRepositories, syncedRepoCount, installationCount } =
    await getData();
  const syncedRepositorySet = new Set(syncedRepositories);
  const stalePolicyCount = recipes.filter(
    (recipe) => !syncedRepositorySet.has(`${recipe.repo_owner}/${recipe.repo_name}`)
  ).length;
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
      <GlassSurface
        variant="hero-panel"
        motionStrength={0.24}
        className="p-8 md:p-10"
      >
        <p className="section-kicker">Admin console</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Audit history, approvals, and repo policies.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Same calmer operator material system, denser data surfaces, and
          approval history when you need to inspect the control plane.
        </p>
      </GlassSurface>

      {syncedRepoCount != null ? (
        <Card interactive>
          <CardContent className="flex flex-wrap items-center gap-6 py-5 text-sm text-muted-foreground">
            <span>
              GitHub App inventory: <span className="font-medium text-foreground">{syncedRepoCount}</span>{" "}
              repositories
            </span>
            <span>
              Installations: <span className="font-medium text-foreground">{installationCount ?? 0}</span>
            </span>
            <span>
              Policies outside installation access:{" "}
              <span className="font-medium text-foreground">{stalePolicyCount}</span>
            </span>
          </CardContent>
        </Card>
      ) : null}

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
                  <TableHead>Installation Access</TableHead>
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
                    <TableCell>
                      {syncedRepositorySet.size === 0
                        ? "unknown"
                        : syncedRepositorySet.has(`${recipe.repo_owner}/${recipe.repo_name}`)
                          ? "installed"
                          : "missing"}
                    </TableCell>
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
