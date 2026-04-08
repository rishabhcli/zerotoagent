import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  syncGitHubInstallationRecipes: vi.fn(),
  requireRepoPolicy: vi.fn(),
  createReProRunId: vi.fn(),
  upsertRunRecordRow: vi.fn(),
  getRequestSession: vi.fn(),
  sessionHasAnyRole: vi.fn(),
  getSessionUserId: vi.fn(),
}));

vi.mock("workflow/api", () => ({
  start: mocks.start,
}));

vi.mock("@/workflows/patchpilot", () => ({
  patchPilotIncidentToPR: {},
}));

vi.mock("@/lib/patchpilot/repo-sync", () => ({
  syncGitHubInstallationRecipes: mocks.syncGitHubInstallationRecipes,
}));

vi.mock("@/lib/patchpilot/policy", () => ({
  requireRepoPolicy: mocks.requireRepoPolicy,
}));

vi.mock("@/lib/patchpilot/run-id", () => ({
  createReProRunId: mocks.createReProRunId,
}));

vi.mock("@/lib/patchpilot/upsert-run-record", () => ({
  upsertRunRecordRow: mocks.upsertRunRecordRow,
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
  getSessionUserId: mocks.getSessionUserId,
}));

import { POST } from "./route";

describe("POST /api/runs/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "operator" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(true);
    mocks.getSessionUserId.mockReturnValue("user-1");
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nope: true }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.syncGitHubInstallationRecipes).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("creates a run and starts the workflow for a valid payload", async () => {
    mocks.createReProRunId.mockReturnValue("PP-2026-04-08-abc123");
    mocks.requireRepoPolicy.mockResolvedValue(undefined);
    mocks.syncGitHubInstallationRecipes.mockResolvedValue(undefined);
    mocks.upsertRunRecordRow.mockResolvedValue(undefined);
    mocks.start.mockResolvedValue({ runId: "workflow-123" });

    const response = await POST(
      new Request("http://localhost/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "web",
          mode: "dry_run",
          environment: "staging",
          repo: {
            owner: "acme",
            name: "api",
            defaultBranch: "main",
          },
          incident: {
            summaryText: "api is failing",
            artifacts: [],
          },
          config: {
            installCommand: "echo nope",
            maxAgentIterations: 4,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      runId: "PP-2026-04-08-abc123",
      workflowRunId: "workflow-123",
      traceUrl: "/runs/PP-2026-04-08-abc123",
    });
    expect(mocks.upsertRunRecordRow).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "PP-2026-04-08-abc123",
        createdByUserId: "user-1",
        workflowInput: expect.objectContaining({
          config: { maxAgentIterations: 4 },
        }),
      })
    );
    expect(mocks.start).toHaveBeenCalledWith(
      expect.anything(),
      [
        expect.objectContaining({
          config: { maxAgentIterations: 4 },
        }),
      ]
    );
  });
});
