import type { Sandbox } from "@vercel/sandbox";

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function runShellCommand(
  sandbox: Sandbox,
  command: string
): Promise<CommandResult> {
  const start = Date.now();
  const result = await sandbox.runCommand("bash", ["-c", command]);
  const stdout = await result.stdout();
  const stderr = await result.stderr();

  return {
    exitCode: result.exitCode,
    stdout,
    stderr,
    durationMs: Date.now() - start,
  };
}

export async function installDeps(
  sandbox: Sandbox,
  packageManager: string = "pnpm"
): Promise<CommandResult> {
  const commands: Record<string, string> = {
    pnpm: "pnpm install --frozen-lockfile || pnpm install",
    npm: "npm ci || npm install",
    yarn: "yarn install --frozen-lockfile",
  };
  const cmd = commands[packageManager] ?? commands.pnpm;
  console.log(`[sandbox:${sandbox.sandboxId}] installing deps: ${cmd}`);
  return runShellCommand(sandbox, cmd);
}

export async function runTestCommand(
  sandbox: Sandbox,
  testCommand: string
): Promise<CommandResult> {
  console.log(`[sandbox:${sandbox.sandboxId}] running tests: ${testCommand}`);
  return runShellCommand(sandbox, testCommand);
}

export async function extractDiff(sandbox: Sandbox): Promise<string> {
  const result = await sandbox.runCommand("git", ["diff"]);
  return result.stdout();
}
