import { start } from "workflow/api";
import { headers } from "next/headers";
import { patchPilotIncidentToPR } from "@/workflows/patchpilot";
import type { ReProWorkflowInput } from "@/workflows/patchpilot";
import { RunStartPayloadSchema } from "@/lib/patchpilot/contracts";
import { requireRepoPolicy } from "@/lib/patchpilot/policy";
import { syncGitHubInstallationRecipes } from "@/lib/patchpilot/repo-sync";
import { createReProRunId } from "@/lib/patchpilot/run-id";
import { upsertRunRecordRow } from "@/lib/patchpilot/upsert-run-record";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  // Lightweight auth: allow demo role or proper session
  const headersList = await headers();
  const demoRole = headersList.get("x-patchpilot-role") ?? process.env.PATCHPILOT_DEMO_ROLE;
  const session = await getAuthSession(headersList);

  if (!session && !demoRole) {
    return Response.json(
      { ok: false, message: "Authentication required" },
      { status: 401 }
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
    await syncGitHubInstallationRecipes();
  } catch (error) {
    console.error("[api/runs/start] failed to sync GitHub repositories", error);
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
  const input: ReProWorkflowInput = {
    ...parsed.data,
    runId,
  };

  await upsertRunRecordRow({
    runId,
    repoOwner: input.repo.owner,
    repoName: input.repo.name,
    defaultBranch: input.repo.defaultBranch,
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
