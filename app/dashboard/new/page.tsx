import { Card, CardContent } from "@/components/ui/card";
import { NewRunForm } from "@/components/runs/new-run-form";
import { requireAuth } from "@/lib/auth-guard";
import { syncGitHubInstallationRecipes } from "@/lib/patchpilot/repo-sync";

interface RepoOption {
  id: string;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
}

async function getRepos() {
  let syncedRepositories: Set<string> | null = null;

  try {
    const syncSummary = await syncGitHubInstallationRecipes();
    if (syncSummary.synced) {
      syncedRepositories = new Set(syncSummary.repositories);
    }
  } catch (error) {
    console.error("[dashboard/new] failed to sync GitHub repositories", error);
  }

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
    .from("recipes")
    .select("id, repo_owner, repo_name, enabled, metadata")
    .eq("enabled", true)
    .order("repo_owner")
    .order("repo_name");

  return ((data as RepoOption[]) ?? [])
    .filter((repo) =>
      syncedRepositories
        ? syncedRepositories.has(`${repo.repo_owner}/${repo.repo_name}`)
        : true
    )
    .map((repo) => ({
      id: repo.id,
      owner: repo.repo_owner,
      name: repo.repo_name,
      defaultBranch:
        typeof repo.metadata?.defaultBranch === "string"
          ? (repo.metadata.defaultBranch as string)
          : "main",
      enabled: repo.enabled,
    }));
}

export default async function NewRunPage() {
  await requireAuth();
  const repos = await getRepos();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">New Run</h1>
        <p className="max-w-3xl text-muted-foreground">
          Start a verified PatchPilot run from the web UI. Upload evidence, choose the allowlisted repo scope, and pick whether to stop at a dry run or continue to approval-gated PR creation.
        </p>
      </div>

      {repos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No allowlisted repos are configured yet. Add a repo policy in the admin console first.
          </CardContent>
        </Card>
      ) : (
        <NewRunForm repos={repos} />
      )}
    </div>
  );
}
