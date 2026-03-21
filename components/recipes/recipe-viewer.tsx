import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface Recipe {
  id: string;
  repo_owner: string;
  repo_name: string;
  test_command: string;
  install_command: string;
  build_command: string | null;
  package_manager: string;
  allowed_domains: string[];
  snapshot_id: string | null;
}

export function RecipeViewer({ recipe }: { recipe: Recipe }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-mono">
          {recipe.repo_owner}/{recipe.repo_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Package Manager</p>
            <p className="font-mono">{recipe.package_manager}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Test Command</p>
            <p className="font-mono">{recipe.test_command}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Install Command</p>
            <p className="font-mono">{recipe.install_command}</p>
          </div>
          {recipe.build_command && (
            <div>
              <p className="text-muted-foreground">Build Command</p>
              <p className="font-mono">{recipe.build_command}</p>
            </div>
          )}
        </div>

        {recipe.allowed_domains.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Allowed Domains</p>
              <div className="flex flex-wrap gap-1">
                {recipe.allowed_domains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="font-mono text-xs">
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {recipe.snapshot_id && (
          <>
            <Separator />
            <div className="text-sm">
              <p className="text-muted-foreground">Snapshot</p>
              <p className="font-mono text-xs">{recipe.snapshot_id}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
