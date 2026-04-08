import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  createReProRunId: vi.fn(),
  upsertRunRecordRow: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getRequestSession: vi.fn(),
  getSessionUserId: vi.fn(),
  sessionHasAnyRole: vi.fn(),
}));

vi.mock("workflow/api", () => ({
  start: mocks.start,
}));

vi.mock("@/workflows/patchpilot", () => ({
  patchPilotIncidentToPR: {},
}));

vi.mock("@/lib/patchpilot/run-id", () => ({
  createReProRunId: mocks.createReProRunId,
}));

vi.mock("@/lib/patchpilot/upsert-run-record", () => ({
  upsertRunRecordRow: mocks.upsertRunRecordRow,
}));

vi.mock("@/lib/patchpilot/supabase", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  getSessionUserId: mocks.getSessionUserId,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
}));

import { POST } from "./route";

function createSupabaseMock(workflowInput: unknown) {
  const single = vi.fn().mockResolvedValue({
    data: { created_by_user_id: "user-1", workflow_input: workflowInput },
  });
  const eq = vi.fn(() => ({
    single,
  }));
  const select = vi.fn(() => ({
    eq,
  }));

  return {
    from: vi.fn(() => ({
      select,
    })),
  };
}

describe("POST /api/runs/:runId/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "operator" },
    });
    mocks.getSessionUserId.mockReturnValue("user-1");
    mocks.sessionHasAnyRole.mockReturnValue(false);
  });

  it("returns 503 when Supabase is unavailable", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ runId: "run-1" }),
    });

    expect(response.status).toBe(503);
  });

  it("returns 404 when a run has no replayable workflow input", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock(null));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ runId: "run-1" }),
    });

    expect(response.status).toBe(404);
  });
});
