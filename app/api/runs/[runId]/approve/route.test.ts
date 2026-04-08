import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resumeHook: vi.fn(),
  getRequestSession: vi.fn(),
  sessionHasAnyRole: vi.fn(),
  getSessionUserId: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("workflow/api", () => ({
  resumeHook: mocks.resumeHook,
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
  getSessionUserId: mocks.getSessionUserId,
}));

vi.mock("@/lib/patchpilot/supabase", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import { POST } from "./route";

function createSupabaseMock() {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { token: "approval-random-token" },
    error: null,
  });
  const limit = vi.fn(() => ({
    maybeSingle,
  }));
  const order = vi.fn(() => ({
    limit,
  }));
  const isForSelect = vi.fn(() => ({
    order,
  }));
  const eqForSelect = vi.fn(() => ({
    is: isForSelect,
  }));
  const select = vi.fn(() => ({
    eq: eqForSelect,
  }));
  const eqForUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn(() => ({
    eq: eqForUpdate,
  }));

  return {
    from: vi.fn(() => ({
      select,
      update,
    })),
  };
}

describe("POST /api/runs/:runId/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests that are not made by approvers", async () => {
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "viewer" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/runs/run-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }),
      { params: Promise.resolve({ runId: "run-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.resumeHook).not.toHaveBeenCalled();
  });

  it("resolves approval decisions for approvers", async () => {
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "approver" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(true);
    mocks.getSessionUserId.mockReturnValue("user-1");
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock());
    mocks.resumeHook.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/runs/run-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true, comment: "ship it" }),
      }),
      { params: Promise.resolve({ runId: "run-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.resumeHook).toHaveBeenCalledWith("approval-random-token", {
      approved: true,
      comment: "ship it",
    });
  });
});
