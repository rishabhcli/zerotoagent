import { createHook, FatalError, sleep } from "workflow";
import { computeObservabilityCoverage, computePatchConfidence, computeReproducibilityScore } from "@/lib/patchpilot/scoring";
import type { RunStartPayload } from "@/lib/patchpilot/contracts";
import { requireRepoPolicy } from "@/lib/patchpilot/policy";
import { emitRunEvent } from "./steps/emit";
import { parseIncidentStep } from "./steps/parse";
import { extractFilesStep } from "./steps/files";
import { sandboxFixStep } from "./steps/sandbox-fix";
import { createPrStep } from "./steps/pr";
import { checkCiRunStep } from "./steps/ci";
import { finalizeReceiptsStep } from "./steps/receipts";
import {
  createApprovalRecord,
  createRunRecord,
  recordRunStep,
  resolveApprovalRecord,
  storeArtifacts,
  storeCiRun,
  storePatch,
  storePrRecord,
  updateRunRecord,
} from "./steps/db";

export type PatchPilotWorkflowInput = RunStartPayload & { runId: string };

function buildPatchSummary(diff: string) {
  const fileCount = diff.split("\n").filter((line) => line.startsWith("+++ b/")).length;
  return fileCount === 0
    ? "No patch was generated."
    : `Patch updates ${fileCount} file(s) with a verified minimal fix.`;
}

function buildOutcomeSummary(input: {
  repo: PatchPilotWorkflowInput["repo"];
  mode: PatchPilotWorkflowInput["mode"];
  status: "completed" | "failed" | "rejected" | "blocked";
  patchSummary: string;
}) {
  const actionSummary =
    input.mode === "dry_run"
      ? "Dry run completed without opening a pull request."
      : input.status === "completed"
        ? "Verified fix completed and PR flow finished."
        : input.status === "rejected"
          ? "Human approval rejected PR creation."
          : input.status === "blocked"
            ? "Run stopped safely before PR creation."
            : "Run failed before completion.";

  return `${actionSummary} Repo: ${input.repo.owner}/${input.repo.name}. ${input.patchSummary}`;
}

export async function patchPilotIncidentToPR(input: PatchPilotWorkflowInput) {
  "use workflow";

  const { runId, repo, incident, config } = input;
  let seq = 1;
  let ciSummary: string | null = null;
  let ciUrl: string | null = null;
  let ciPassed: boolean | null = null;
  const totalTrackedSteps = 11;
  let completedReceiptSteps = 0;

  await createRunRecord({
    runId,
    repoOwner: repo.owner,
    repoName: repo.name,
    defaultBranch: repo.defaultBranch,
    source: input.source,
    mode: input.mode,
    environment: input.environment,
    workflowInput: input,
    threadContext: input.threadContext,
    voiceContext: input.voiceContext,
  });

  await storeArtifacts({
    runId,
    artifacts: incident.artifacts.map((artifact) => ({
      kind: artifact.kind,
      storagePath: artifact.storagePath,
      mimeType: artifact.mimeType,
      filename: artifact.filename,
      source: artifact.source,
      sizeBytes: artifact.sizeBytes,
      summary: artifact.summary,
    })),
  });

  await emitRunEvent({
    runId,
    seq: seq++,
    type: "run.started",
    data: {
      source: input.source,
      mode: input.mode,
      environment: input.environment,
      repo,
      artifactCount: incident.artifacts.length,
    },
  });

  await recordRunStep({
    runId,
    stepType: "intake",
    status: "completed",
    title: "Ingest",
    summary: `Captured ${incident.artifacts.length} artifact(s) and queued a ${input.mode} run from ${input.source}.`,
    evidence: { environment: input.environment, repo },
    nextAction: "Parse evidence",
    durationMs: 1,
  });
  completedReceiptSteps += 1;
  await emitRunEvent({
    runId,
    seq: seq++,
    type: "intake.completed",
    data: { artifactCount: incident.artifacts.length, source: input.source },
  });

  try {
    const policyStartedAt = Date.now();
    await recordRunStep({
      runId,
      stepType: "resolve_repo_policy",
      status: "running",
      title: "Resolve Repo Policy",
      summary: `Loading repo allowlist and execution policy for ${repo.owner}/${repo.name}.`,
    });

    const policy = await requireRepoPolicy(repo);
    await updateRunRecord({ runId, policySnapshot: policy });
    await recordRunStep({
      runId,
      stepType: "resolve_repo_policy",
      status: "completed",
      title: "Resolve Repo Policy",
      summary: `Repo policy loaded. Allowed domains: ${policy.allowedOutboundDomains.join(", ") || "none"}.`,
      evidence: {
        allowedCommandCategories: policy.allowedCommandCategories,
        allowedOutboundDomains: policy.allowedOutboundDomains,
        ciWorkflowName: policy.ciWorkflowName ?? null,
      },
      nextAction: "Parse evidence",
      durationMs: Date.now() - policyStartedAt,
    });
    completedReceiptSteps += 1;
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "repo.policy_resolved",
      data: {
        allowedCommandCategories: policy.allowedCommandCategories,
        allowedOutboundDomains: policy.allowedOutboundDomains,
        enabled: policy.enabled,
      },
    });

    const parseStartedAt = Date.now();
    await recordRunStep({
      runId,
      stepType: "parse_evidence",
      status: "running",
      title: "Parse Evidence",
      summary: "Analyzing incident evidence with Gemini.",
    });
    const parsed = await parseIncidentStep(input);
    await recordRunStep({
      runId,
      stepType: "parse_evidence",
      status: "completed",
      title: "Parse Evidence",
      summary: parsed.suspectedRootCause,
      decision: {
        recentChangeThatMatters: parsed.recentChangeThatMatters,
        confidenceDrivers: parsed.confidenceDrivers,
      },
      evidence: {
        likelyComponents: parsed.likelyComponents,
        knownUnknowns: parsed.knownUnknowns,
        requestsForMissingInformation: parsed.requestsForMissingInformation,
      },
      nextAction: "Identify suspect files",
      durationMs: Date.now() - parseStartedAt,
    });
    completedReceiptSteps += 1;
    await emitRunEvent({ runId, seq: seq++, type: "incident.parsed", data: parsed });

    const focusStartedAt = Date.now();
    const focus = await extractFilesStep({
      runId,
      repo,
      parsedIncident: {
        suspectedRootCause: parsed.suspectedRootCause,
        likelyComponents: parsed.likelyComponents,
        reproductionRecipe: parsed.reproductionRecipe,
      },
    });
    await recordRunStep({
      runId,
      stepType: "patch",
      status: "completed",
      title: "Plan Patch",
      summary: `Identified ${focus.candidates.length} suspect file(s).`,
      evidence: {
        candidates: focus.candidates,
        searchNotes: focus.searchNotes,
      },
      nextAction: "Set up sandbox",
      durationMs: Date.now() - focusStartedAt,
    });
    completedReceiptSteps += 1;
    await emitRunEvent({ runId, seq: seq++, type: "repo.focus", data: focus });

    const sandboxStartedAt = Date.now();
    await recordRunStep({
      runId,
      stepType: "sandbox_setup",
      status: "running",
      title: "Sandbox Setup",
      summary: "Cloning repo into Vercel Sandbox and applying network policy.",
    });

    const fix = await sandboxFixStep({
      runId,
      repo,
      parsed: {
        normalizedSummary: parsed.normalizedSummary,
        suspectedRootCause: parsed.suspectedRootCause,
        knownUnknowns: parsed.knownUnknowns,
        requestsForMissingInformation: parsed.requestsForMissingInformation,
      },
      focus: focus.candidates,
      policy,
      config: {
        installCommand: config.installCommand,
        reproCommand: config.reproCommand,
        testCommand: config.testCommand,
        buildCommand: config.buildCommand,
        maxAgentIterations: config.maxAgentIterations,
      },
    });

    await recordRunStep({
      runId,
      stepType: "sandbox_setup",
      status: "completed",
      title: "Sandbox Setup",
      summary: `Sandbox ${fix.evidence.sandboxId} prepared and dependency install completed.`,
      evidence: {
        sandboxId: fix.evidence.sandboxId,
        install: fix.evidence.install,
        networkPolicy: fix.evidence.networkPolicy,
      },
      nextAction: "Reproduce and verify",
      durationMs: Date.now() - sandboxStartedAt,
    });
    completedReceiptSteps += 1;
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "sandbox.created",
      data: {
        sandboxId: fix.evidence.sandboxId,
        networkPolicy: fix.evidence.networkPolicy,
      },
    });

    await emitRunEvent({
      runId,
      seq: seq++,
      type: "reproduction.completed",
      data: {
        reproduced: fix.reproduced,
        reproduction: fix.evidence.reproduction,
      },
    });

    await recordRunStep({
      runId,
      stepType: "reproduce",
      status: fix.reproduced ? "completed" : "blocked",
      title: "Reproduce",
      summary: fix.reproduced
        ? "Failing behavior reproduced in the sandbox."
        : "Could not reproduce the issue in the sandbox.",
      evidence: {
        reproduction: fix.evidence.reproduction,
        remediation: fix.remediation,
      },
      nextAction: fix.reproduced ? "Generate patch" : "Collect more evidence",
    });
    completedReceiptSteps += 1;

    if (!fix.reproduced) {
      const reproducibility = computeReproducibilityScore({
        reproduced: false,
        replayCount: 1,
        successfulReplays: 0,
        flaky: false,
      });
      const confidence = computePatchConfidence({
        reproduced: false,
        testsPassed: false,
        flaky: false,
        diffLineCount: 0,
        ciPassed: null,
        missingInfoCount: parsed.requestsForMissingInformation.length,
      });
      const observabilityCoverage = computeObservabilityCoverage(totalTrackedSteps, completedReceiptSteps);
      const patchSummary = "No patch was created because the issue could not be reproduced.";
      const outcomeSummary = buildOutcomeSummary({
        repo,
        mode: input.mode,
        status: "blocked",
        patchSummary,
      });
      await updateRunRecord({
        runId,
        status: "blocked",
        outcomeSummary,
        confidenceScore: confidence.score,
        reproducibilityScore: reproducibility.score,
        observabilityCoverage,
      });
      await finalizeReceiptsStep({
        runId,
        workflowInput: input,
        summary: outcomeSummary,
        patchSummary,
        status: "blocked",
        confidence,
        reproducibility,
        observabilityCoverage,
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "receipts.created",
        data: { status: "blocked" },
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "run.failed",
        data: {
          reason: "Issue was not reproducible in sandbox",
          remediation: fix.remediation,
        },
      });
      return { runId, status: "blocked" as const };
    }

    await recordRunStep({
      runId,
      stepType: "verify",
      status:
        fix.tests.status === "pass"
          ? "completed"
          : fix.tests.status === "flaky"
            ? "blocked"
            : "failed",
      title: "Verify",
      summary:
        fix.tests.status === "pass"
          ? "Verification passed in the sandbox."
          : fix.tests.status === "flaky"
            ? "Verification was inconsistent across retries."
            : "Verification failed in the sandbox.",
      evidence: {
        attempts: fix.tests.attempts,
        build: fix.evidence.build,
        remediation: fix.remediation,
      },
      nextAction:
        fix.tests.status === "pass" ? "Persist patch and request approval" : "Stop before PR creation",
    });
    completedReceiptSteps += 1;

    if (fix.patch.unifiedDiff) {
      await storePatch({ runId, unifiedDiff: fix.patch.unifiedDiff });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "patch.generated",
        data: { diffLength: fix.patch.unifiedDiff.split("\n").length },
      });
    }

    await emitRunEvent({
      runId,
      seq: seq++,
      type: "verification.completed",
      data: {
        status: fix.tests.status,
        attempts: fix.tests.attempts.length,
        build: fix.evidence.build,
      },
    });

    if (fix.tests.status === "flaky") {
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "verification.flaky_detected",
        data: {
          attempts: fix.tests.attempts,
          remediation: fix.remediation,
        },
      });
    }

    if (fix.tests.status !== "pass") {
      const reproducibility = computeReproducibilityScore({
        reproduced: true,
        replayCount: fix.tests.attempts.length,
        successfulReplays: fix.tests.attempts.filter((attempt) => attempt.exitCode === 0).length,
        flaky: fix.flaky,
      });
      const confidence = computePatchConfidence({
        reproduced: true,
        testsPassed: false,
        flaky: fix.flaky,
        diffLineCount: fix.patch.unifiedDiff.split("\n").length,
        ciPassed: null,
        missingInfoCount: parsed.requestsForMissingInformation.length,
      });
      const observabilityCoverage = computeObservabilityCoverage(totalTrackedSteps, completedReceiptSteps);
      const patchSummary = buildPatchSummary(fix.patch.unifiedDiff);
      const blockedStatus = fix.tests.status === "flaky" ? "blocked" : "failed";
      const outcomeSummary = buildOutcomeSummary({
        repo,
        mode: input.mode,
        status: blockedStatus,
        patchSummary,
      });
      await updateRunRecord({
        runId,
        status: blockedStatus,
        outcomeSummary,
        confidenceScore: confidence.score,
        reproducibilityScore: reproducibility.score,
        observabilityCoverage,
      });
      await finalizeReceiptsStep({
        runId,
        workflowInput: input,
        summary: outcomeSummary,
        patchSummary,
        status: blockedStatus,
        confidence,
        reproducibility,
        observabilityCoverage,
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "receipts.created",
        data: { status: blockedStatus },
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "run.failed",
        data: {
          reason:
            fix.tests.status === "flaky"
              ? "Verification was flaky and the PR gate remained closed"
              : "Verification failed after patching",
          remediation: fix.remediation,
        },
      });
      return { runId, status: blockedStatus };
    }

    const patchSummary = buildPatchSummary(fix.patch.unifiedDiff);
    const reproducibility = computeReproducibilityScore({
      reproduced: true,
      replayCount: fix.tests.attempts.length,
      successfulReplays: fix.tests.attempts.filter((attempt) => attempt.exitCode === 0).length,
      flaky: false,
    });

    if (input.mode === "dry_run") {
      const confidence = computePatchConfidence({
        reproduced: true,
        testsPassed: true,
        flaky: false,
        diffLineCount: fix.patch.unifiedDiff.split("\n").length,
        ciPassed: null,
        missingInfoCount: parsed.requestsForMissingInformation.length,
      });
      const observabilityCoverage = computeObservabilityCoverage(totalTrackedSteps, completedReceiptSteps);
      const outcomeSummary = buildOutcomeSummary({
        repo,
        mode: input.mode,
        status: "completed",
        patchSummary,
      });

      await updateRunRecord({
        runId,
        status: "completed",
        outcomeSummary,
        confidenceScore: confidence.score,
        reproducibilityScore: reproducibility.score,
        observabilityCoverage,
      });
      await finalizeReceiptsStep({
        runId,
        workflowInput: input,
        summary: outcomeSummary,
        patchSummary,
        status: "completed",
        confidence,
        reproducibility,
        observabilityCoverage,
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "receipts.created",
        data: { status: "completed", mode: "dry_run" },
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "run.completed",
        data: { mode: "dry_run" },
      });
      return { runId, status: "completed" as const };
    }

    const approvalToken = `approval:${runId}`;
    await recordRunStep({
      runId,
      stepType: "approval",
      status: "running",
      title: "Approval",
      summary: "Awaiting approver confirmation before opening a PR.",
      evidence: {
        patchSummary,
        tests: fix.tests,
      },
      nextAction: "Approve or reject PR creation",
    });
    await createApprovalRecord({
      runId,
      token: approvalToken,
      requestedAction: "open_pr",
      requiredRole: "approver",
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "approval.requested",
      data: {
        token: approvalToken,
        patchSummary,
        tests: fix.tests,
      },
    });

    const approvalHook = createHook<{ approved: boolean; comment?: string }>({
      token: approvalToken,
    });
    const decision = await approvalHook;
    await resolveApprovalRecord({
      token: approvalToken,
      approved: decision.approved,
      comment: decision.comment ?? null,
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "approval.resolved",
      data: decision,
    });
    await recordRunStep({
      runId,
      stepType: "approval",
      status: decision.approved ? "completed" : "blocked",
      title: "Approval",
      summary: decision.approved ? "PR creation approved." : "PR creation rejected.",
      decision,
      nextAction: decision.approved ? "Create PR" : "Finalize receipts",
    });
    completedReceiptSteps += 1;

    if (!decision.approved) {
      const confidence = computePatchConfidence({
        reproduced: true,
        testsPassed: true,
        flaky: false,
        diffLineCount: fix.patch.unifiedDiff.split("\n").length,
        ciPassed: null,
        missingInfoCount: parsed.requestsForMissingInformation.length,
      });
      const observabilityCoverage = computeObservabilityCoverage(totalTrackedSteps, completedReceiptSteps);
      const outcomeSummary = buildOutcomeSummary({
        repo,
        mode: input.mode,
        status: "rejected",
        patchSummary,
      });
      await updateRunRecord({
        runId,
        status: "rejected",
        outcomeSummary,
        confidenceScore: confidence.score,
        reproducibilityScore: reproducibility.score,
        observabilityCoverage,
      });
      await finalizeReceiptsStep({
        runId,
        workflowInput: input,
        summary: outcomeSummary,
        patchSummary,
        status: "rejected",
        confidence,
        reproducibility,
        observabilityCoverage,
      });
      await emitRunEvent({
        runId,
        seq: seq++,
        type: "receipts.created",
        data: { status: "rejected" },
      });
      return { runId, status: "rejected" as const };
    }

    await recordRunStep({
      runId,
      stepType: "pr_create",
      status: "running",
      title: "Open PR",
      summary: "Creating pull request through the GitHub App.",
    });
    const branchName = `patchpilot/${runId}`;
    const pr = await createPrStep({
      runId,
      repo: {
        owner: repo.owner,
        name: repo.name,
        baseBranch: repo.defaultBranch,
        installationId: policy.installationId ?? repo.installationId ?? undefined,
      },
      branchName,
      title: `fix: ${parsed.normalizedSummary.slice(0, 60)}`,
      body: [
        `## Root Cause`,
        parsed.suspectedRootCause,
        ``,
        `## Why this patch`,
        patchSummary,
        ``,
        `## Verification`,
        `- Sandbox repro: reproduced before patch`,
        `- Tests: ${fix.tests.attempts.length} run(s), stable pass`,
        fix.evidence.build ? `- Build: ${fix.evidence.build.exitCode === 0 ? "passed" : "failed"}` : null,
        ``,
        `## Known Unknowns`,
        ...(parsed.knownUnknowns.length > 0 ? parsed.knownUnknowns : ["None identified"]),
        ``,
        `Run ID: \`${runId}\``,
      ]
        .filter(Boolean)
        .join("\n"),
      patch: fix.patch,
      evidence: {
        testCommand: config.testCommand ?? policy.testCommand,
        testLogsExcerpt: fix.tests.stdout.slice(0, 1000),
      },
    });
    await storePrRecord({
      runId,
      repoOwner: repo.owner,
      repoName: repo.name,
      prNumber: pr.prNumber,
      prUrl: pr.prUrl,
      headBranch: branchName,
      summary: patchSummary,
    });
    await recordRunStep({
      runId,
      stepType: "pr_create",
      status: "completed",
      title: "Open PR",
      summary: `Opened PR #${pr.prNumber}.`,
      evidence: pr,
      nextAction: "Wait for CI",
    });
    completedReceiptSteps += 1;
    await emitRunEvent({ runId, seq: seq++, type: "pr.created", data: pr });

    await recordRunStep({
      runId,
      stepType: "ci_watch",
      status: "running",
      title: "Watch CI",
      summary: "Checking GitHub Actions status for the PR branch.",
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "ci.started",
      data: {
        workflowName: policy.ciWorkflowName ?? null,
        branchName,
      },
    });

    let ciResult = await checkCiRunStep({
      runId,
      repo: {
        owner: repo.owner,
        name: repo.name,
        installationId: policy.installationId ?? repo.installationId ?? undefined,
      },
      branchName,
      workflowName: policy.ciWorkflowName ?? null,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (ciResult.status === "completed" || ciResult.status === "not_configured") {
        break;
      }
      await sleep("10s");
      ciResult = await checkCiRunStep({
        runId,
        repo: {
          owner: repo.owner,
          name: repo.name,
          installationId: policy.installationId ?? repo.installationId ?? undefined,
        },
        branchName,
        workflowName: policy.ciWorkflowName ?? null,
      });
    }

    ciSummary = ciResult.summary ?? null;
    ciUrl = ciResult.url ?? null;
    ciPassed = ciResult.status === "completed" ? ciResult.conclusion === "success" : null;
    await storeCiRun({
      runId,
      workflowName: policy.ciWorkflowName ?? null,
      workflowRunId: ciResult.workflowRunId ?? null,
      status: ciResult.status,
      conclusion: ciResult.conclusion ?? null,
      url: ciResult.url ?? null,
      summary: ciResult.summary ?? null,
      completedAt:
        ciResult.status === "completed" || ciResult.status === "not_configured"
          ? new Date().toISOString()
          : null,
      metadata: ciResult,
    });
    await recordRunStep({
      runId,
      stepType: "ci_watch",
      status:
        ciResult.status === "completed"
          ? "completed"
          : ciResult.status === "not_configured"
            ? "skipped"
            : "blocked",
      title: "Watch CI",
      summary: ciResult.summary ?? "CI status unavailable.",
      evidence: ciResult,
      nextAction: "Finalize receipts",
    });
    completedReceiptSteps += 1;
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "ci.completed",
      data: ciResult,
    });

    const confidence = computePatchConfidence({
      reproduced: true,
      testsPassed: true,
      flaky: false,
      diffLineCount: fix.patch.unifiedDiff.split("\n").length,
      ciPassed,
      missingInfoCount: parsed.requestsForMissingInformation.length,
    });
    const observabilityCoverage = computeObservabilityCoverage(totalTrackedSteps, completedReceiptSteps);
    const outcomeSummary = buildOutcomeSummary({
      repo,
      mode: input.mode,
      status: "completed",
      patchSummary,
    });
    await updateRunRecord({
      runId,
      status: "completed",
      outcomeSummary,
      confidenceScore: confidence.score,
      reproducibilityScore: reproducibility.score,
      observabilityCoverage,
    });
    await finalizeReceiptsStep({
      runId,
      workflowInput: input,
      summary: `${outcomeSummary} ${ciSummary ?? ""}`.trim(),
      patchSummary,
      status: "completed",
      confidence,
      reproducibility,
      observabilityCoverage,
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "receipts.created",
      data: { ciUrl, ciSummary },
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "run.completed",
      data: {
        prUrl: pr.prUrl,
        ciUrl,
        ciSummary,
      },
    });

    return {
      runId,
      status: "completed" as const,
      pr,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const patchSummary = "Patch flow ended before a PR could be created.";
    const outcomeSummary = buildOutcomeSummary({
      repo,
      mode: input.mode,
      status: "failed",
      patchSummary,
    });

    await updateRunRecord({
      runId,
      status: "failed",
      outcomeSummary: `${outcomeSummary} ${message}`.trim(),
    });
    const confidence = computePatchConfidence({
      reproduced: false,
      testsPassed: false,
      flaky: false,
      diffLineCount: 0,
      ciPassed: null,
      missingInfoCount: 0,
    });
    const reproducibility = computeReproducibilityScore({
      reproduced: false,
      replayCount: 0,
      successfulReplays: 0,
      flaky: false,
    });
    const observabilityCoverage = computeObservabilityCoverage(totalTrackedSteps, completedReceiptSteps);
    await finalizeReceiptsStep({
      runId,
      workflowInput: input,
      summary: `${outcomeSummary} ${message}`.trim(),
      patchSummary,
      status: "failed",
      confidence,
      reproducibility,
      observabilityCoverage,
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "receipts.created",
      data: { status: "failed" },
    });
    await emitRunEvent({
      runId,
      seq: seq++,
      type: "run.failed",
      data: {
        error: message,
      },
    });

    throw new FatalError(message);
  }
}
