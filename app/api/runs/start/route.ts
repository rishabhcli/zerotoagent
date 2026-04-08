import { start } from "workflow/api";
import { patchPilotIncidentToPR } from "@/workflows/patchpilot";
import type { ReProWorkflowInput } from "@/workflows/patchpilot";
import { RunStartPayloadSchema } from "@/lib/patchpilot/contracts";
import { requireRepoPolicy } from "@/lib/patchpilot/policy";
import { createReProRunId } from "@/lib/patchpilot/run-id";
import { upsertRunRecordRow } from "@/lib/patchpilot/upsert-run-record";
import { getRequestSession, getSessionUserId, sessionHasAnyRole } from "@/lib/auth";

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

  const runId = parsed.data.runId ?? createReProRunId();
  const sanitizedConfig = {
    maxAgentIterations: parsed.data.config.maxAgentIterations,
  };
  const input: ReProWorkflowInput = {
    ...parsed.data,
    runId,
    config: sanitizedConfig,
  };

  await upsertRunRecordRow({
    runId,
    repoOwner: input.repo.owner,
    repoName: input.repo.name,
    defaultBranch: input.repo.defaultBranch,
    createdByUserId: getSessionUserId(session),
    source: input.source,
    mode: input.mode,
    environment: input.environment,
    workflowInput: input,
    threadContext: input.threadContext,
    voiceContext: input.voiceContext,
  });

  const run = await start(patchPilotIncidentToPR, [input]);

  return Response.json({
    ok: true,
    runId,
    workflowRunId: run.runId,
    traceUrl: `/runs/${runId}`,
  });
}
