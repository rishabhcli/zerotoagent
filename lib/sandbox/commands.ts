import type { Sandbox } from "@vercel/sandbox";
import type { CommandCategory, RepoPolicy } from "@/lib/patchpilot/contracts";
import { assertCommandAllowed } from "@/lib/patchpilot/policy";
import { redactSensitiveText } from "@/lib/patchpilot/redaction";

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  command: string;
  category: CommandCategory;
};

const legacyPolicy: RepoPolicy = {
  id: "legacy-policy",
  repoOwner: "unknown",
  repoName: "unknown",
  enabled: true,
  packageManager: "pnpm",
  installCommand: "pnpm install",
  reproCommand: null,
  testCommand: "pnpm test",
  buildCommand: null,
  snapshotId: null,
  ciWorkflowName: null,
  allowedOutboundDomains: [],
  allowedCommandCategories: [
    "install",
    "repro",
    "test",
    "build",
    "search",
    "read",
    "write",
    "diff",
  ],
  metadata: {},
};

function getExpectedRecipeCommand(
  policy: RepoPolicy,
  category: Extract<CommandCategory, "install" | "repro" | "test" | "build">
) {
  switch (category) {
    case "install":
      return policy.installCommand;
    case "repro":
      return policy.reproCommand ?? policy.testCommand;
    case "test":
      return policy.testCommand;
    case "build":
      return policy.buildCommand ?? null;
  }
}

function assertRecipeCommandMatchesPolicy(
  policy: RepoPolicy,
  category: Extract<CommandCategory, "install" | "repro" | "test" | "build">,
  command: string
) {
  const expectedCommand = getExpectedRecipeCommand(policy, category);
  if (!expectedCommand) {
    throw new Error(`No ${category} command is configured in repo policy.`);
  }

  if (command !== expectedCommand) {
    throw new Error(
      `Refusing to run ${category} command outside repo policy. Expected "${expectedCommand}".`
    );
  }
}

export async function runShellCommand(
  sandbox: Sandbox,
  command: string,
  category: CommandCategory,
  policy: RepoPolicy
): Promise<CommandResult> {
  assertCommandAllowed(policy, category);
  const start = Date.now();
  const result = await sandbox.runCommand("bash", ["-c", command]);
  const stdout = await result.stdout();
  const stderr = await result.stderr();

  return {
    exitCode: result.exitCode,
    stdout: redactSensitiveText(stdout),
    stderr: redactSensitiveText(stderr),
    durationMs: Date.now() - start,
    command,
    category,
  };
}

export async function installDeps(
  sandbox: Sandbox,
  policy: RepoPolicy,
  installCommand: string
): Promise<CommandResult>;
export async function installDeps(
  sandbox: Sandbox,
  installCommand: string
): Promise<CommandResult>;
export async function installDeps(
  sandbox: Sandbox,
  policyOrCommand: RepoPolicy | string,
  installCommand?: string
): Promise<CommandResult> {
  const policy =
    typeof policyOrCommand === "string" ? legacyPolicy : policyOrCommand;
  const command =
    typeof policyOrCommand === "string" ? policyOrCommand : installCommand;

  if (!command) {
    throw new Error("installDeps requires an install command");
  }

  if (typeof policyOrCommand !== "string") {
    assertRecipeCommandMatchesPolicy(policy, "install", command);
  }

  console.log(`[sandbox:${sandbox.sandboxId}] installing deps: ${command}`);
  return runShellCommand(sandbox, command, "install", policy);
}

export async function runRecipeCommand(
  sandbox: Sandbox,
  policy: RepoPolicy,
  category: Extract<CommandCategory, "repro" | "test" | "build">,
  command: string
): Promise<CommandResult> {
  assertRecipeCommandMatchesPolicy(policy, category, command);
  console.log(`[sandbox:${sandbox.sandboxId}] running ${category}: ${command}`);
  return runShellCommand(sandbox, command, category, policy);
}

export async function runTestCommand(
  sandbox: Sandbox,
  policy: RepoPolicy,
  command: string
): Promise<CommandResult>;
export async function runTestCommand(
  sandbox: Sandbox,
  command: string
): Promise<CommandResult>;
export async function runTestCommand(
  sandbox: Sandbox,
  policyOrCommand: RepoPolicy | string,
  command?: string
): Promise<CommandResult> {
  const policy =
    typeof policyOrCommand === "string" ? legacyPolicy : policyOrCommand;
  const testCommand =
    typeof policyOrCommand === "string" ? policyOrCommand : command;

  if (!testCommand) {
    throw new Error("runTestCommand requires a command");
  }

  return runRecipeCommand(sandbox, policy, "test", testCommand);
}

export async function searchRepo(
  sandbox: Sandbox,
  policy: RepoPolicy,
  query: string
): Promise<CommandResult> {
  const command = `rg -n --hidden --glob '!node_modules' ${JSON.stringify(query)} .`;
  return runShellCommand(sandbox, command, "search", policy);
}

export async function listRepoFiles(
  sandbox: Sandbox,
  policy: RepoPolicy
): Promise<CommandResult> {
  return runShellCommand(sandbox, "rg --files .", "read", policy);
}

export async function extractDiff(
  sandbox: Sandbox,
  policy: RepoPolicy
): Promise<CommandResult>;
export async function extractDiff(
  sandbox: Sandbox
): Promise<CommandResult>;
export async function extractDiff(
  sandbox: Sandbox,
  policy: RepoPolicy = legacyPolicy
): Promise<CommandResult> {
  return runShellCommand(sandbox, "git diff --no-ext-diff", "diff", policy);
}
