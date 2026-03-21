import { start } from "workflow/api";
import { patchPilotIncidentToPR } from "@/workflows/patchpilot";
import type { PatchPilotWorkflowInput } from "@/workflows/patchpilot";
import { RunStartPayloadSchema } from "@/lib/patchpilot/contracts";
import { requireRepoPolicy } from "@/lib/patchpilot/policy";
import { createPatchPilotRunId } from "@/lib/patchpilot/run-id";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RunStartPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: "Invalid run payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    await requireRepoPolicy(parsed.data.repo);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 403 }
    );
  }

  const runId = parsed.data.runId ?? createPatchPilotRunId();
  const input: PatchPilotWorkflowInput = {
    ...parsed.data,
    runId,
  };

  const run = await start(patchPilotIncidentToPR, [input]);

  return Response.json({
    ok: true,
    runId,
    workflowRunId: run.runId,
    traceUrl: `/runs/${runId}`,
  });
}
