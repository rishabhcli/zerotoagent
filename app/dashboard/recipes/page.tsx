import { Card, CardContent } from "@/components/ui/card";
import { RecipeViewer, type Recipe } from "@/components/recipes/recipe-viewer";
import { requireAuth } from "@/lib/auth-guard";
import { syncGitHubInstallationRecipes } from "@/lib/patchpilot/repo-sync";

async function getRecipes(): Promise<{
  recipes: Recipe[];
  syncedRepoCount: number | null;
  installationCount: number | null;
}> {
  let syncedRepoCount: number | null = null;
  let installationCount: number | null = null;

  try {
    const syncSummary = await syncGitHubInstallationRecipes();
    if (syncSummary.synced) {
      syncedRepoCount = syncSummary.discoveredRepoCount;
      installationCount = syncSummary.installationCount;
    }
  } catch (error) {
    console.error("[dashboard/recipes] failed to sync GitHub repositories", error);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { recipes: [], syncedRepoCount, installationCount };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase.from("recipes").select("*").order("repo_owner").order("repo_name");
  return {
    recipes: (data as Recipe[]) ?? [],
    syncedRepoCount,
    installationCount,
  };
}

export default async function RecipesPage() {
  await requireAuth();
  const { recipes, syncedRepoCount, installationCount } = await getRecipes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Recipes</h1>
        <p className="text-muted-foreground">
          Allowlisted repo policies, command categories, network domains, and CI wiring for each repository workflow.
        </p>
        {syncedRepoCount != null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            GitHub App inventory synchronized: {syncedRepoCount} repositories across{" "}
            {installationCount ?? 0} installation{installationCount === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No recipes configured.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recipes define test commands, allowed domains, and sandbox settings per repo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeViewer key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
