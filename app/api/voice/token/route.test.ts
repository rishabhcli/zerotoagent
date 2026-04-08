import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
}));

import { GET } from "./route";

describe("GET /api/voice/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.getRequestSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/voice/token"));

    expect(response.status).toBe(401);
  });

  it("fails closed in production instead of returning the raw provider key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ELEVENLABS_API_KEY", "super-secret");
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "operator" },
    });

    const response = await GET(new Request("http://localhost/api/voice/token"));

    expect(response.status).toBe(503);
  });
});
