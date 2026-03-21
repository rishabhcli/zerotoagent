import { generateText, stepCountIs } from "ai";
import { getPrimaryModel } from "@/lib/ai/models";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { createSandboxTools } from "@/lib/ai/tools";
import { getReadToken } from "@/lib/github";
import type { RepoPolicy } from "@/lib/patchpilot/contracts";
import { redactUnknown } from "@/lib/patchpilot/redaction";
import {
  applyInstallNetworkPolicy,
  cleanupSandbox,
  createFromSnapshot,
  createRepoSandbox,
  lockdownEgress,
} from "@/lib/sandbox/client";
import {
  extractDiff,
  installDeps,
  runRecipeCommand,
  type CommandResult,
} from "@/lib/sandbox/commands";

export type SandboxFixResult = {
  reproduced: boolean;
  flaky: boolean;
  patch: {
    unifiedDiff: string;
  };
  tests: {
    status: "pass" | "fail" | "flaky";
    exitCode: number;
    stdout: string;
    stderr: string;
    attempts: CommandResult[];
  };
  evidence: {
    reproduction: CommandResult;
    install: CommandResult;
    build?: CommandResult | null;
    sandboxId: string;
    iterationsUsed: number;
    toolReceipts: unknown[];
    networkPolicy: {
      install: string[] | "allow-all";
      locked: "deny-all";
    };
  };
  remediation: string[];
};

export async function sandboxFixStep(input: {
  runId: string;
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    installationId?: number;
  };
  parsed: {
    normalizedSummary: string;
    suspectedRootCause: string;
    knownUnknowns: string[];
    requestsForMissingInformation: string[];
  };
  focus: Array<{ path: string; reason: string; confidence: number }>;
  policy: RepoPolicy;
  config: {
    installCommand?: string;
    reproCommand?: string;
    testCommand?: string;
    buildCommand?: string;
    maxAgentIterations: number;
  };
}) {
  "use step";

  const { runId, repo, parsed, focus, config, policy } = input;
  let sandbox: Awaited<ReturnType<typeof createRepoSandbox>> | undefined;

  try {
    const readToken = repo.installationId ? await getReadToken(repo.installationId) : undefined;
    sandbox = policy.snapshotId
      ? await createFromSnapshot(policy.snapshotId)
      : await createRepoSandbox({
          repoUrl: `https://github.com/${repo.owner}/${repo.name}.git`,
          password: readToken,
          runtime: "node24",
        });

    const installCommand = config.installCommand ?? policy.installCommand;
    const reproCommand = config.reproCommand ?? policy.reproCommand ?? config.testCommand ?? policy.testCommand;
    const testCommand = config.testCommand ?? policy.testCommand;
    const buildCommand = config.buildCommand ?? policy.buildCommand ?? undefined;

    const networkInstallState = await applyInstallNetworkPolicy(sandbox, policy);
    const installResult = await installDeps(sandbox, policy, installCommand);
    const networkLockedState = await lockdownEgress(sandbox);

    if (installResult.exitCode !== 0) {
      throw new Error(
        `Sandbox dependency installation failed with exit code ${installResult.exitCode}.`
      );
    }

    const reproduction = await runRecipeCommand(sandbox, policy, "repro", reproCommand);
    const reproduced = reproduction.exitCode !== 0;

    if (!reproduced) {
      return {
        reproduced: false,
        flaky: false,
        patch: { unifiedDiff: "" },
        tests: {
          status: "fail",
          exitCode: reproduction.exitCode,
          stdout: reproduction.stdout,
          stderr: reproduction.stderr,
          attempts: [reproduction],
        },
        evidence: {
          reproduction,
          install: installResult,
          build: null,
          sandboxId: sandbox.sandboxId,
          iterationsUsed: 0,
          toolReceipts: [],
          networkPolicy: {
            install: networkInstallState,
            locked: networkLockedState,
          },
        },
        remediation: [
          "Upload additional logs or a request ID",
          "Choose a more specific environment profile",
          "Run PatchPilot replay after adding a repro command in the repo policy",
        ],
      };
    }

    const tools = createSandboxTools(sandbox, {
      policy,
      commands: {
        reproCommand,
        testCommand,
        buildCommand,
      },
    });

    const focusFilesList = focus
      .map((file) => `- ${file.path} (${file.reason}, confidence ${file.confidence})`)
      .join("\n");

    const prompt = [
      `You are fixing a bug in ${repo.owner}/${repo.name}.`,
      ``,
      `Summary: ${parsed.normalizedSummary}`,
      `Likely root cause: ${parsed.suspectedRootCause}`,
      `Known unknowns: ${parsed.knownUnknowns.join("; ") || "none"}`,
      `Missing information requests: ${parsed.requestsForMissingInformation.join("; ") || "none"}`,
      ``,
      `Suspect files:`,
      focusFilesList || "- none identified yet; search the repo",
      ``,
      `The reproduction command \`${reproCommand}\` failed before the fix.`,
      `stderr excerpt:`,
      "```",
      reproduction.stderr.slice(0, 3000),
      "```",
      `stdout excerpt:`,
      "```",
      reproduction.stdout.slice(0, 3000),
      "```",
      ``,
      `Use only the provided tools. Make the smallest safe patch possible.`,
      `Run tests before collecting the diff. Run the build if it is relevant.`,
      `Do not bypass policy or edit unrelated files.`,
    ].join("\n");

    const agentResult = await generateText({
      model: getPrimaryModel(),
      system: SYSTEM_PROMPTS.patchPlanning,
      prompt,
      tools,
      stopWhen: stepCountIs(config.maxAgentIterations * 6),
      providerOptions: {
        google: { thinkingConfig: { thinkingLevel: "high" } },
      },
      experimental_include: {
        requestBody: false,
        responseBody: false,
      },
    });

    const diffResult = await extractDiff(sandbox, policy);
    const verificationAttempts: CommandResult[] = [];

    verificationAttempts.push(await runRecipeCommand(sandbox, policy, "test", testCommand));
    if (verificationAttempts[0].exitCode !== 0) {
      verificationAttempts.push(await runRecipeCommand(sandbox, policy, "test", testCommand));
      verificationAttempts.push(await runRecipeCommand(sandbox, policy, "test", testCommand));
    }

    const successfulAttempts = verificationAttempts.filter((attempt) => attempt.exitCode === 0);
    const flaky =
      successfulAttempts.length > 0 && successfulAttempts.length < verificationAttempts.length;
    const finalAttempt = verificationAttempts[verificationAttempts.length - 1];

    let buildResult: CommandResult | null = null;
    if (!flaky && successfulAttempts.length === verificationAttempts.length && buildCommand) {
      buildResult = await runRecipeCommand(sandbox, policy, "build", buildCommand);
    }

    const status: SandboxFixResult["tests"]["status"] = flaky
      ? "flaky"
      : finalAttempt.exitCode === 0 && (!buildResult || buildResult.exitCode === 0)
        ? "pass"
        : "fail";

    return {
      reproduced: true,
      flaky,
      patch: {
        unifiedDiff: diffResult.stdout,
      },
      tests: {
        status,
        exitCode:
          status === "pass"
            ? 0
            : buildResult && buildResult.exitCode !== 0
              ? buildResult.exitCode
              : finalAttempt.exitCode,
        stdout: buildResult?.stdout ?? finalAttempt.stdout,
        stderr: buildResult?.stderr ?? finalAttempt.stderr,
        attempts: verificationAttempts,
      },
      evidence: {
        reproduction,
        install: installResult,
        build: buildResult,
        sandboxId: sandbox.sandboxId,
        iterationsUsed: agentResult.steps?.length ?? 0,
        toolReceipts: redactUnknown(agentResult.steps ?? []),
        networkPolicy: {
          install: networkInstallState,
          locked: networkLockedState,
        },
      },
      remediation:
        status === "pass"
          ? []
          : flaky
            ? [
                "Verification was unstable across retries.",
                "Quarantine or investigate the flaky tests before approving a PR.",
              ]
            : [
                "Review the failing verification logs.",
                "Retry with a smaller patch or a more specific reproduction command.",
              ],
    };
  } finally {
    if (sandbox) {
      await cleanupSandbox(sandbox);
    }
  }
}
