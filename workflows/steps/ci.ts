import { getReadToken } from "@/lib/github";

type GitHubWorkflowRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
};

export async function checkCiRunStep(input: {
  runId: string;
  repo: {
    owner: string;
    name: string;
    installationId?: number;
  };
  branchName: string;
  workflowName?: string | null;
}) {
  "use step";

  if (!input.repo.installationId) {
    return {
      status: "not_configured" as const,
      conclusion: null,
      url: null,
      summary: "No GitHub App installation is configured for this repo.",
    };
  }

  const token = await getReadToken(input.repo.installationId);
  const apiBase = `https://api.github.com/repos/${input.repo.owner}/${input.repo.name}`;
  const url = new URL(`${apiBase}/actions/runs`);
  url.searchParams.set("branch", input.branchName);
  url.searchParams.set("per_page", "20");

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to query GitHub Actions runs: ${response.status} ${await response.text()}`
    );
  }

  const payload = (await response.json()) as { workflow_runs?: GitHubWorkflowRun[] };
  const runs =
    payload.workflow_runs?.filter((run) =>
      input.workflowName ? run.name === input.workflowName : true
    ) ?? [];

  const latest = runs[0];
  if (!latest) {
    return {
      status: "not_found" as const,
      conclusion: null,
      url: null,
      summary: input.workflowName
        ? `No GitHub Actions run found yet for workflow "${input.workflowName}".`
        : "No GitHub Actions run found yet for this branch.",
    };
  }

  return {
    status: latest.status,
    conclusion: latest.conclusion,
    url: latest.html_url,
    workflowRunId: String(latest.id),
    summary:
      latest.status === "completed"
        ? `GitHub Actions finished with ${latest.conclusion ?? "no conclusion"}.`
        : `GitHub Actions is ${latest.status}.`,
  };
}
