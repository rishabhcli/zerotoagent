import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  sessionHasAnyRole: vi.fn(),
  syncGitHubInstallationRecipes: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
}));

vi.mock("@/lib/patchpilot/repo-sync", () => ({
  syncGitHubInstallationRecipes: mocks.syncGitHubInstallationRecipes,
}));

import { POST } from "./route";

describe("POST /api/admin/recipes/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin sessions", async () => {
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "operator" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/admin/recipes/sync", {
      method: "POST",
    }));

    expect(response.status).toBe(403);
    expect(mocks.syncGitHubInstallationRecipes).not.toHaveBeenCalled();
  });

  it("returns the sync summary for admins", async () => {
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(true);
    mocks.syncGitHubInstallationRecipes.mockResolvedValue({
      synced: true,
      discoveredRepoCount: 3,
      installationCount: 1,
      repositories: ["acme/api", "acme/web", "acme/worker"],
    });

    const response = await POST(new Request("http://localhost/api/admin/recipes/sync", {
      method: "POST",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: {
        synced: true,
        discoveredRepoCount: 3,
        installationCount: 1,
        repositories: ["acme/api", "acme/web", "acme/worker"],
      },
    });
  });
});
