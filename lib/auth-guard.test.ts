import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  getRequestSession: vi.fn(),
  sessionHasAnyRole: vi.fn(
    (session: { user?: { role?: string } } | null | undefined, allowedRoles: string[]) =>
      Boolean(session?.user?.role && allowedRoles.includes(session.user.role))
  ),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
}));

import { requireAdmin, requireAuth, requireOperator } from "./auth-guard";

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the session supplied by the shared request auth helper", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getRequestSession.mockResolvedValue({
      user: {
        id: "demo-user",
        email: "demo@patchpilot.local",
        role: "admin",
      },
    });

    await expect(requireAuth()).resolves.toEqual({
      user: {
        id: "demo-user",
        email: "demo@patchpilot.local",
        role: "admin",
      },
    });
  });

  it("redirects to the landing page when no session is available", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getRequestSession.mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("redirect:/");
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin sessions to the dashboard", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "viewer" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(false);

    await expect(requireAdmin()).rejects.toThrow("redirect:/dashboard");
  });
});

describe("requireOperator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects viewers to the dashboard", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "viewer" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(false);

    await expect(requireOperator()).rejects.toThrow("redirect:/dashboard");
  });

  it("allows operator-capable sessions through", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "operator" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(true);

    await expect(requireOperator()).resolves.toEqual({
      user: { id: "user-1", role: "operator" },
    });
  });
});
