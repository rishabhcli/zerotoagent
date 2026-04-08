import { z } from "zod";
import { createArtifactUploadTicket } from "@/lib/patchpilot/artifacts";
import { getRequestSession, sessionHasAnyRole } from "@/lib/auth";
import { isReProRunId } from "@/lib/patchpilot/run-id";

const UploadRequestSchema = z.object({
  runId: z.string().min(1).refine(isReProRunId, "Invalid run ID"),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  source: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers, { allowDemo: true });
  if (!session) {
    return Response.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  if (!sessionHasAnyRole(session, ["operator", "approver", "admin"])) {
    return Response.json(
      { ok: false, message: "Operator, approver, or admin role required" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = UploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: "Invalid artifact upload request",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const ticket = await createArtifactUploadTicket(parsed.data);
    return Response.json({ ok: true, ticket });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
