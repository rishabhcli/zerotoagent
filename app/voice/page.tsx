import { VoiceIntake, type VoiceRepoOption } from "@/components/voice/voice-intake";
import { requireAuth } from "@/lib/auth-guard";

interface RepoOptionRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
}

async function getRepos(): Promise<VoiceRepoOption[]> {
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

  return ((data as RepoOptionRow[]) ?? []).map((repo) => ({
    id: repo.id,
    owner: repo.repo_owner,
    name: repo.repo_name,
    defaultBranch:
      typeof repo.metadata?.defaultBranch === "string"
        ? (repo.metadata.defaultBranch as string)
        : "main",
  }));
}

function getInitialRepoId(repos: VoiceRepoOption[]) {
  const defaultOwner = process.env.NEXT_PUBLIC_PATCHPILOT_DEFAULT_REPO_OWNER;
  const defaultName = process.env.NEXT_PUBLIC_PATCHPILOT_DEFAULT_REPO_NAME;

  if (defaultOwner && defaultName) {
    const preferredRepo = repos.find(
      (repo) => repo.owner === defaultOwner && repo.name === defaultName
    );
    if (preferredRepo) {
      return preferredRepo.id;
    }
  }

  return repos[0]?.id ?? null;
}

export default async function VoicePage() {
  await requireAuth();
  const repos = await getRepos();

  return <VoiceIntake repos={repos} initialRepoId={getInitialRepoId(repos)} />;
}
