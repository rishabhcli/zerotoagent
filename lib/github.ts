import { App } from "@octokit/app";

function getApp() {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
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
