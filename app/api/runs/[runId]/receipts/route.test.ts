import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getRequestSession: vi.fn(),
  getSessionUserId: vi.fn(),
  sessionHasAnyRole: vi.fn(),
}));

vi.mock("@/lib/patchpilot/supabase", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  getSessionUserId: mocks.getSessionUserId,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
}));

import { GET } from "./route";

function createSupabaseMock(storagePath: string | null) {
  const runMaybeSingle = vi.fn().mockResolvedValue({
    data: { created_by_user_id: "user-1" },
  });
  const runEq = vi.fn(() => ({
    maybeSingle: runMaybeSingle,
  }));
  const runSelect = vi.fn(() => ({
    eq: runEq,
  }));

  const receiptMaybeSingle = vi.fn().mockResolvedValue({
    data: storagePath ? { storage_path: storagePath } : null,
  });
  const receiptEq = vi.fn(() => ({
    maybeSingle: receiptMaybeSingle,
  }));
  const receiptSelect = vi.fn(() => ({
    eq: receiptEq,
  }));

  return {
    from: vi.fn((table: string) =>
      table === "runs"
        ? {
            select: runSelect,
          }
        : {
            select: receiptSelect,
          }
    ),
    storage: {
      from: vi.fn(),
    },
  };
}

describe("GET /api/runs/:runId/receipts", () => {
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

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ runId: "run-1" }),
    });

    expect(response.status).toBe(503);
  });

  it("returns 404 when no receipt package exists", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock(null));

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ runId: "run-1" }),
    });

    expect(response.status).toBe(404);
  });
});
