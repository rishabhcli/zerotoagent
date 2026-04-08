import { VoiceIntake, type VoiceRepoOption } from "@/components/voice/voice-intake";
import { requireOperator } from "@/lib/auth-guard";
import { getEnabledRepoOptions } from "@/lib/dashboard-data";

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
  await requireOperator();
  const repos = (await getEnabledRepoOptions()) as VoiceRepoOption[];

  return <VoiceIntake repos={repos} initialRepoId={getInitialRepoId(repos)} />;
}
