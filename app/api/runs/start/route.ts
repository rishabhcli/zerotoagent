import { start } from "workflow/api";
import { nanoid } from "nanoid";
import { patchPilotIncidentToPR } from "@/workflows/patchpilot";
import type { PatchPilotWorkflowInput } from "@/workflows/patchpilot";

export async function POST(request: Request) {
  const body = await request.json();

  const runId = body.runId ?? nanoid();
  const input: PatchPilotWorkflowInput = {
    runId,
    repo: body.repo,
    incident: body.incident,
    config: {
      testCommand: body.config?.testCommand ?? "npm test",
      buildCommand: body.config?.buildCommand,
      packageManager: body.config?.packageManager,
      maxAgentIterations: body.config?.maxAgentIterations ?? 5,
    },
  };

  const run = await start(patchPilotIncidentToPR, [input]);

  return Response.json({
    ok: true,
    runId,
    workflowRunId: run.runId,
  });
}
