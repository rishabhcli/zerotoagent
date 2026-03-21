import type { RepoScope, RepoPolicy } from "@/lib/patchpilot/contracts";
import { RepoPolicySchema } from "@/lib/patchpilot/contracts";
import { requireSupabaseAdmin } from "@/lib/patchpilot/supabase";

function normalizeStringArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    const normalized = value.filter((entry): entry is string => typeof entry === "string");
    return normalized.length > 0 ? normalized : fallback;
  }

  return fallback;
}

export async function getRepoPolicy(repo: RepoScope): Promise<RepoPolicy | null> {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("repo_owner", repo.owner)
    .eq("repo_name", repo.name)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load repo policy: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return RepoPolicySchema.parse({
    id: data.id,
    repoOwner: data.repo_owner,
    repoName: data.repo_name,
    enabled: data.enabled ?? true,
    installationId: data.installation_id ?? repo.installationId ?? null,
    packageManager: data.package_manager,
    installCommand: data.install_command,
    reproCommand: data.repro_command ?? null,
    testCommand: data.test_command,
    buildCommand: data.build_command ?? null,
    snapshotId: data.snapshot_id ?? null,
    ciWorkflowName: data.ci_workflow_name ?? null,
    allowedOutboundDomains: normalizeStringArray(data.allowed_domains),
    allowedCommandCategories: normalizeStringArray(data.allowed_command_categories, [
      "install",
      "repro",
      "test",
      "build",
      "search",
      "read",
      "write",
      "diff",
    ]),
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
  });
}

export async function requireRepoPolicy(repo: RepoScope) {
  const policy = await getRepoPolicy(repo);
  if (!policy) {
    throw new Error(
      `Repo ${repo.owner}/${repo.name} is not allowlisted. Ask an admin to add a recipe first.`
    );
  }

  if (!policy.enabled) {
    throw new Error(`Repo ${repo.owner}/${repo.name} is disabled by policy.`);
  }

  return policy;
}

export function assertCommandAllowed(
  policy: RepoPolicy,
  category: RepoPolicy["allowedCommandCategories"][number]
) {
  if (!policy.allowedCommandCategories.includes(category)) {
    throw new Error(`Command category "${category}" is blocked by repo policy.`);
  }
}
