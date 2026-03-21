import { App } from "@octokit/app";

export interface InstalledGitHubRepository {
  installationId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export function isGitHubAppConfigured() {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY);
}

function getApp() {
  if (!isGitHubAppConfigured()) {
    throw new Error("GITHUB_APP_ID and GITHUB_PRIVATE_KEY are required");
  }
  return new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
  });
}

export type InstallationOctokit = Awaited<ReturnType<App["getInstallationOctokit"]>>;

export async function getInstallationOctokit(installationId: number): Promise<InstallationOctokit> {
  const app = getApp();
  return app.getInstallationOctokit(installationId);
}

async function listInstallationIds(): Promise<number[]> {
  const configuredInstallationId = Number(process.env.GITHUB_INSTALLATION_ID);
  if (Number.isInteger(configuredInstallationId) && configuredInstallationId > 0) {
    return [configuredInstallationId];
  }

  const app = getApp();
  const installationIds: number[] = [];
  let page = 1;

  while (true) {
    const response = await app.octokit.request("GET /app/installations", {
      per_page: 100,
      page,
    });
    const batch = response.data
      .map((installation) => installation.id)
      .filter((installationId): installationId is number => typeof installationId === "number");

    installationIds.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return installationIds;
}

export async function listRepositoriesForInstallation(
  installationId: number
): Promise<InstalledGitHubRepository[]> {
  const octokit = await getInstallationOctokit(installationId);
  const repositories: InstalledGitHubRepository[] = [];
  let page = 1;

  while (true) {
    const response = await octokit.request("GET /installation/repositories", {
      per_page: 100,
      page,
    });

    const batch = response.data.repositories.map((repository) => ({
      installationId,
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      defaultBranch: repository.default_branch || "main",
      isPrivate: repository.private,
    }));

    repositories.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return repositories;
}

export async function listInstalledRepositories(): Promise<InstalledGitHubRepository[]> {
  const installationIds = await listInstallationIds();
  const repositoriesByFullName = new Map<string, InstalledGitHubRepository>();

  for (const repositories of await Promise.all(
    installationIds.map((installationId) => listRepositoriesForInstallation(installationId))
  )) {
    for (const repository of repositories) {
      repositoriesByFullName.set(repository.fullName, repository);
    }
  }

  return Array.from(repositoriesByFullName.values()).sort((left, right) =>
    left.fullName.localeCompare(right.fullName)
  );
}

export async function getReadToken(installationId: number): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);
  const response = await octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      installation_id: installationId,
      permissions: { contents: "read", metadata: "read" },
    }
  );
  return response.data.token;
}

export async function getWriteToken(installationId: number): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);
  const response = await octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      installation_id: installationId,
      permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    }
  );
  return response.data.token;
}
