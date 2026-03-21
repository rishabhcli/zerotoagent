import { z } from "zod";
import { createArtifactUploadTicket } from "@/lib/patchpilot/artifacts";

const UploadRequestSchema = z.object({
  runId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  source: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = UploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Invalid artifact upload request" },
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
