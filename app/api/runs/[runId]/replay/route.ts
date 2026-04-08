import { start } from "workflow/api";
import { patchPilotIncidentToPR } from "@/workflows/patchpilot";
import { createReProRunId } from "@/lib/patchpilot/run-id";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import { upsertRunRecordRow } from "@/lib/patchpilot/upsert-run-record";
import type { ReProWorkflowInput } from "@/workflows/patchpilot";
import { getRequestSession, getSessionUserId, sessionHasAnyRole } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const session = await getRequestSession(request.headers, { allowDemo: true });
  if (!session) {
    return Response.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      { ok: false, message: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data: run } = await supabase
    .from("runs")
    .select("created_by_user_id, workflow_input")
    .eq("id", runId)
    .single();

  if (
    run?.created_by_user_id &&
    run.created_by_user_id !== getSessionUserId(session) &&
    !sessionHasAnyRole(session, ["approver", "admin"])
  ) {
    return Response.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  if (!run?.created_by_user_id && !sessionHasAnyRole(session, ["approver", "admin"])) {
    return Response.json(
      { ok: false, message: "Only approvers or admins can replay legacy runs" },
      { status: 403 }
    );
  }

  if (!run?.workflow_input) {
    return Response.json(
      { ok: false, message: `Run ${runId} does not have a replayable workflow input` },
      { status: 404 }
    );
  }

  const replayRunId = createReProRunId();
  const workflowInput = {
    ...(run.workflow_input as ReProWorkflowInput),
    runId: replayRunId,
    mode: "dry_run",
    replayOfRunId: runId,
  } satisfies ReProWorkflowInput;

  await upsertRunRecordRow({
    runId: workflowInput.runId,
    repoOwner: workflowInput.repo.owner,
    repoName: workflowInput.repo.name,
    defaultBranch: workflowInput.repo.defaultBranch,
    createdByUserId: getSessionUserId(session),
    source: workflowInput.source,
    mode: workflowInput.mode,
    environment: workflowInput.environment,
    workflowInput,
    threadContext: workflowInput.threadContext,
    voiceContext: workflowInput.voiceContext,
  });

  const workflowRun = await start(patchPilotIncidentToPR, [workflowInput]);

  return Response.json({
    ok: true,
    runId: replayRunId,
    workflowRunId: workflowRun.runId,
    traceUrl: `/runs/${replayRunId}`,
  });
}
