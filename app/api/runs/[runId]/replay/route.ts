import { start } from "workflow/api";
import { patchPilotIncidentToPR } from "@/workflows/patchpilot";
import { createPatchPilotRunId } from "@/lib/patchpilot/run-id";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import type { PatchPilotWorkflowInput } from "@/workflows/patchpilot";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      { ok: false, message: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data: run } = await supabase
    .from("runs")
    .select("workflow_input")
    .eq("id", runId)
    .single();

  if (!run?.workflow_input) {
    return Response.json(
      { ok: false, message: `Run ${runId} does not have a replayable workflow input` },
      { status: 404 }
    );
  }

  const replayRunId = createPatchPilotRunId();
  const workflowInput = {
    ...(run.workflow_input as PatchPilotWorkflowInput),
    runId: replayRunId,
    mode: "dry_run",
    replayOfRunId: runId,
  } satisfies PatchPilotWorkflowInput;

  const workflowRun = await start(patchPilotIncidentToPR, [workflowInput]);

  return Response.json({
    ok: true,
    runId: replayRunId,
    workflowRunId: workflowRun.runId,
    traceUrl: `/runs/${replayRunId}`,
  });
}
