import {
  isGitHubAppConfigured,
  listInstalledRepositories,
  type InstalledGitHubRepository,
} from "@/lib/github";
import {
  isSupabaseConfigured,
  requireSupabaseAdmin,
} from "@/lib/patchpilot/supabase";

const DEFAULT_ALLOWED_COMMAND_CATEGORIES = [
  "install",
  "repro",
  "test",
  "build",
  "search",
  "read",
  "write",
  "diff",
] as const;

export interface ExistingRecipeRecord {
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  package_manager: "pnpm" | "npm" | "yarn";
  install_command: string;
  test_command: string;
  build_command: string | null;
  repro_command: string | null;
  allowed_domains: unknown;
  allowed_command_categories: unknown;
  snapshot_id: string | null;
  ci_workflow_name: string | null;
  metadata: Record<string, unknown> | null;
  installation_id: number | null;
}

export interface SyncedRecipeRecord {
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  package_manager: "pnpm" | "npm" | "yarn";
  install_command: string;
  test_command: string;
  build_command: string | null;
  repro_command: string | null;
  allowed_domains: string[];
  allowed_command_categories: string[];
  snapshot_id: string | null;
  ci_workflow_name: string | null;
  metadata: Record<string, unknown>;
  installation_id: number;
}

export interface RecipeSyncSummary {
  synced: boolean;
  discoveredRepoCount: number;
  installationCount: number;
  repositories: string[];
  reason?: "missing_configuration" | "no_installations";
}

function normalizeStringArray(
  value: unknown,
  fallback: readonly string[] = []
): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function buildGitHubMetadata(
  existingMetadata: Record<string, unknown>,
  repository: InstalledGitHubRepository,
  syncedAt: string
) {
  const existingGitHubAppMetadata = normalizeMetadata(existingMetadata.githubApp);

  return {
    ...existingMetadata,
    defaultBranch: repository.defaultBranch,
    githubApp: {
      ...existingGitHubAppMetadata,
      syncedAt,
      installationId: repository.installationId,
      fullName: repository.fullName,
      isPrivate: repository.isPrivate,
    },
  };
}

export function mergeInstalledRepositoriesIntoRecipes(input: {
  existingRecipes: ExistingRecipeRecord[];
  installedRepositories: InstalledGitHubRepository[];
  syncedAt: string;
}): SyncedRecipeRecord[] {
  const existingByFullName = new Map(
    input.existingRecipes.map((recipe) => [
      `${recipe.repo_owner}/${recipe.repo_name}`,
      recipe,
    ])
  );

  return input.installedRepositories.map((repository) => {
    const existing = existingByFullName.get(repository.fullName);
    const metadata = normalizeMetadata(existing?.metadata);

    return {
      repo_owner: repository.owner,
      repo_name: repository.name,
      enabled: existing?.enabled ?? true,
      package_manager: existing?.package_manager ?? "pnpm",
      install_command: existing?.install_command ?? "pnpm install",
      test_command: existing?.test_command ?? "pnpm test",
      build_command: existing?.build_command ?? null,
      repro_command: existing?.repro_command ?? null,
      allowed_domains: normalizeStringArray(existing?.allowed_domains),
      allowed_command_categories: normalizeStringArray(
        existing?.allowed_command_categories,
        DEFAULT_ALLOWED_COMMAND_CATEGORIES
      ),
      snapshot_id: existing?.snapshot_id ?? null,
      ci_workflow_name: existing?.ci_workflow_name ?? null,
      metadata: buildGitHubMetadata(metadata, repository, input.syncedAt),
      installation_id: repository.installationId,
    };
  });
}

export async function syncGitHubInstallationRecipes(): Promise<RecipeSyncSummary> {
  if (!isSupabaseConfigured() || !isGitHubAppConfigured()) {
    return {
      synced: false,
      discoveredRepoCount: 0,
      installationCount: 0,
      repositories: [],
      reason: "missing_configuration",
    };
  }

  const installedRepositories = await listInstalledRepositories();
  if (installedRepositories.length === 0) {
    return {
      synced: false,
      discoveredRepoCount: 0,
      installationCount: 0,
      repositories: [],
      reason: "no_installations",
    };
  }

  const supabase = requireSupabaseAdmin();
  const { data: existingRecipes, error: existingRecipesError } = await supabase
    .from("recipes")
    .select(
      [
        "repo_owner",
        "repo_name",
        "enabled",
        "package_manager",
        "install_command",
        "test_command",
        "build_command",
        "repro_command",
        "allowed_domains",
        "allowed_command_categories",
        "snapshot_id",
        "ci_workflow_name",
        "metadata",
        "installation_id",
      ].join(", ")
    );

  if (existingRecipesError) {
    throw new Error(
      `Failed to load existing recipes for sync: ${existingRecipesError.message}`
    );
  }

  const existingRecipeRows = ((existingRecipes ?? []) as unknown) as ExistingRecipeRecord[];
  const syncedRecipes = mergeInstalledRepositoriesIntoRecipes({
    existingRecipes: existingRecipeRows,
    installedRepositories,
    syncedAt: new Date().toISOString(),
  });

  const { error: upsertError } = await supabase
    .from("recipes")
    .upsert(syncedRecipes, { onConflict: "repo_owner,repo_name" });

  if (upsertError) {
    throw new Error(`Failed to sync GitHub repositories into recipes: ${upsertError.message}`);
  }

  return {
    synced: true,
    discoveredRepoCount: installedRepositories.length,
    installationCount: new Set(
      installedRepositories.map((repository) => repository.installationId)
    ).size,
    repositories: installedRepositories.map((repository) => repository.fullName),
  };
}
