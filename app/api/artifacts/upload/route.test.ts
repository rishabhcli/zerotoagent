import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createArtifactUploadTicket: vi.fn(),
  getRequestSession: vi.fn(),
  sessionHasAnyRole: vi.fn(),
}));

vi.mock("@/lib/patchpilot/artifacts", () => ({
  createArtifactUploadTicket: mocks.createArtifactUploadTicket,
}));

vi.mock("@/lib/auth", () => ({
  getRequestSession: mocks.getRequestSession,
  sessionHasAnyRole: mocks.sessionHasAnyRole,
}));

import { POST } from "./route";

describe("POST /api/artifacts/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSession.mockResolvedValue({
      user: { id: "user-1", role: "operator" },
    });
    mocks.sessionHasAnyRole.mockReturnValue(true);
  });

  it("rejects malformed upload requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/artifacts/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "" }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createArtifactUploadTicket).not.toHaveBeenCalled();
  });

  it("returns a signed upload ticket for valid requests", async () => {
    mocks.createArtifactUploadTicket.mockResolvedValue({
      bucket: "patchpilot-artifacts",
      path: "PP-2026-04-08-abc123/log.txt",
      signedUrl: "https://example.com/upload",
      token: "token-123",
      kind: "log",
      source: "web",
    });

    const response = await POST(
      new Request("http://localhost/api/artifacts/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: "PP-2026-04-08-abc123",
          filename: "log.txt",
          mimeType: "text/plain",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      ticket: {
        bucket: "patchpilot-artifacts",
        path: "PP-2026-04-08-abc123/log.txt",
        signedUrl: "https://example.com/upload",
        token: "token-123",
        kind: "log",
        source: "web",
      },
    });
  });
});
