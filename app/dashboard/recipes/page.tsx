import { Card, CardContent } from "@/components/ui/card";
import { RecipeViewer } from "@/components/recipes/recipe-viewer";
import { requireAdmin } from "@/lib/auth-guard";
import { getRecipePolicies } from "@/lib/dashboard-data";

export default async function RecipesPage() {
  await requireAdmin();
  const recipes = await getRecipePolicies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Recipes</h1>
        <p className="text-muted-foreground">
          Allowlisted repo policies, command categories, network domains, and CI wiring for each repository workflow.
        </p>
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
