import { GlassSurface } from "@/components/ui/glass-surface";
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
      <GlassSurface
        variant="hero-panel"
        motionStrength={0.3}
        className="p-8 md:p-10"
      >
        <p className="section-kicker">New run</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Start a verified run.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Add the incident, choose the repo, then verify or stop at approval.
        </p>
      </GlassSurface>

      {repos.length === 0 ? (
        <GlassSurface
          variant="card"
          motionStrength={0.26}
          className="p-10 text-center text-muted-foreground"
        >
          <p>
            No allowlisted repos yet. Add one in admin first.
          </p>
        </GlassSurface>
      ) : (
        <NewRunForm repos={repos} />
      )}
    </div>
  );
}
