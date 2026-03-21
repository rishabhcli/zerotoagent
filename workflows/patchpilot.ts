import { createHook, FatalError } from "workflow";
import { emitRunEvent } from "./steps/emit";
import { parseIncidentStep } from "./steps/parse";
import { extractFilesStep } from "./steps/files";
import { sandboxFixStep } from "./steps/sandbox-fix";
import { createPrStep } from "./steps/pr";
import { createRunRecord, storePatch, createApprovalRecord } from "./steps/db";

export type PatchPilotWorkflowInput = {
  runId: string;
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    installationId?: number;
  };
  incident: {
    summaryText: string;
    artifacts: Array<{
      kind: "log" | "screenshot" | "pdf" | "other";
      ref: string;
      mimeType?: string;
    }>;
  };
  config: {
    testCommand: string;
    buildCommand?: string;
    packageManager?: "pnpm" | "npm" | "yarn";
    maxAgentIterations: number;
  };
};

export async function patchPilotIncidentToPR(
  input: PatchPilotWorkflowInput
) {
  "use workflow";

  const { runId, repo, incident, config } = input;
  let seq = 1;

  console.log(`[run:${runId}] workflow started for ${repo.owner}/${repo.name}`);

  try {
    // 1. Create run record (in a step — Supabase client uses setInterval which is banned in workflows)
    await createRunRecord({
      runId,
      repoOwner: repo.owner,
      repoName: repo.name,
      defaultBranch: repo.defaultBranch,
    });

    await emitRunEvent({ runId, seq: seq++, type: "run.started", data: { repo, incident: { summaryText: incident.summaryText, artifactCount: incident.artifacts.length } } });

    // 2. Parse incident
    console.log(`[run:${runId}] parsing incident...`);
    const parsed = await parseIncidentStep(input);
    await emitRunEvent({ runId, seq: seq++, type: "incident.parsed", data: parsed });

    // 3. Extract likely files
    console.log(`[run:${runId}] extracting files...`);
    const focus = await extractFilesStep({
      runId,
      repo,
      parsedIncident: {
        suspectedRootCause: parsed.suspectedRootCause,
        likelyComponents: parsed.likelyComponents,
        reproductionRecipe: parsed.reproductionRecipe,
      },
    });
    await emitRunEvent({ runId, seq: seq++, type: "repo.focus", data: focus });

    // 4. Sandbox fix
    console.log(`[run:${runId}] running sandbox fix...`);
    const fix = await sandboxFixStep({
      runId,
      repo,
      parsed: {
        normalizedSummary: parsed.normalizedSummary,
        suspectedRootCause: parsed.suspectedRootCause,
      },
      focus: focus.candidates,
      config: {
        testCommand: config.testCommand,
        packageManager: config.packageManager,
        maxAgentIterations: config.maxAgentIterations,
      },
    });
    await emitRunEvent({ runId, seq: seq++, type: "verification.done", data: { tests: fix.tests } });

    // 5. Gate: tests must be green
    if (fix.tests.status !== "pass") {
      await emitRunEvent({ runId, seq: seq++, type: "run.failed", data: { reason: "Verification failed: tests did not pass", tests: fix.tests } });
      throw new FatalError(`Verification failed: tests exited with code ${fix.tests.exitCode}`);
    }

    // 6. Store patch (in a step)
    await storePatch({ runId, unifiedDiff: fix.patch.unifiedDiff });

    // 7. Request approval — workflow suspends here
    console.log(`[run:${runId}] requesting approval...`);
    await emitRunEvent({ runId, seq: seq++, type: "approval.requested", data: { patch: fix.patch, tests: fix.tests } });

    const approvalToken = `approval:${runId}`;

    // Record the pending approval (in a step)
    await createApprovalRecord({ runId, token: approvalToken });

    const hook = createHook<{ approved: boolean; comment?: string }>({
      token: approvalToken,
    });

    // This PAUSES the workflow — no compute cost until resumed
    const decision = await hook;

    console.log(`[run:${runId}] approval decision: ${decision.approved ? "approved" : "rejected"}`);
    await emitRunEvent({ runId, seq: seq++, type: "approval.resolved", data: decision });

    // 8. Gate: must be approved
    if (!decision.approved) {
      console.log(`[run:${runId}] rejected, ending workflow`);
      return { runId, status: "rejected" as const, reason: decision.comment };
    }

    // 9. Create PR
    console.log(`[run:${runId}] creating PR...`);
    const branchName = `patchpilot/${runId}`;
    const pr = await createPrStep({
      runId,
      repo: {
        owner: repo.owner,
        name: repo.name,
        baseBranch: repo.defaultBranch,
        installationId: repo.installationId,
      },
      branchName,
      title: `fix: ${parsed.normalizedSummary.slice(0, 60)}`,
      body: [
        `## Root cause`,
        parsed.suspectedRootCause,
        "",
        `## Verification`,
        `- Tests: ${fix.tests.status === "pass" ? "passed" : "failed"}`,
        `- Test command: \`${config.testCommand}\``,
        "",
        `## Evidence`,
        "```",
        fix.tests.stdout.slice(0, 500),
        "```",
        "",
        `---`,
        `Run ID: \`${runId}\``,
      ].join("\n"),
      patch: fix.patch,
      evidence: {
        testCommand: config.testCommand,
        testLogsExcerpt: fix.tests.stdout.slice(0, 1000),
      },
    });
    await emitRunEvent({ runId, seq: seq++, type: "pr.created", data: pr });

    console.log(`[run:${runId}] workflow completed — PR: ${pr.prUrl}`);
    return { runId, status: "completed" as const, pr };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[run:${runId}] workflow failed:`, message);

    try {
      await emitRunEvent({ runId, seq: seq++, type: "run.failed", data: { error: message } });
    } catch {
      // Don't mask the original error
    }

    throw error;
  }
}
