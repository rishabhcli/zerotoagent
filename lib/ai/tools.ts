import { tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "@vercel/sandbox";

const MAX_STDOUT = 10_000;
const MAX_STDERR = 5_000;

/**
 * Creates AI SDK tools that operate within a Vercel Sandbox instance.
 * Each tool closes over the sandbox so the model can read/edit files
 * and run commands inside the isolated microVM.
 */
export function createSandboxTools(sandbox: Sandbox) {
  return {
    readFile: tool({
      description:
        "Read the contents of a file in the repository. Returns the file content as a string, or an error if the file does not exist.",
      inputSchema: z.object({
        path: z.string().describe("File path relative to the repo root"),
      }),
      execute: async ({ path }) => {
        const buffer = await sandbox.readFileToBuffer({ path });
        if (!buffer) {
          return { error: `File not found: ${path}` };
        }
        const content = buffer.toString("utf-8");
        return {
          content: content.length > 50_000 ? content.slice(0, 50_000) + "\n... (truncated)" : content,
        };
      },
    }),

    editFile: tool({
      description:
        "Write new contents to a file. Provide the COMPLETE new file contents — this overwrites the entire file. Creates the file if it does not exist.",
      inputSchema: z.object({
        path: z.string().describe("File path relative to the repo root"),
        content: z.string().describe("The complete new file contents"),
      }),
      execute: async ({ path, content }) => {
        await sandbox.writeFiles([{ path, content: Buffer.from(content) }]);
        return { success: true, path };
      },
    }),

    runCommand: tool({
      description:
        "Run a shell command in the repository working directory. Use for inspecting project structure (ls, find), searching code (grep), checking types (tsc --noEmit), or any other diagnostic command.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to run"),
      }),
      execute: async ({ command }) => {
        const result = await sandbox.runCommand("bash", ["-c", command]);
        const stdout = await result.stdout();
        const stderr = await result.stderr();
        return {
          exitCode: result.exitCode,
          stdout: stdout.slice(0, MAX_STDOUT),
          stderr: stderr.slice(0, MAX_STDERR),
        };
      },
    }),

    runTests: tool({
      description:
        "Run the project's test suite to verify your changes. Call this after making edits to check if the fix works.",
      inputSchema: z.object({
        testCommand: z
          .string()
          .describe("The test command to run, e.g. 'pnpm test' or 'npm test'"),
      }),
      execute: async ({ testCommand }) => {
        const result = await sandbox.runCommand("bash", ["-c", testCommand]);
        const exitCode = result.exitCode;
        const stdout = await result.stdout();
        const stderr = await result.stderr();
        return {
          status: exitCode === 0 ? ("pass" as const) : ("fail" as const),
          exitCode,
          stdout: stdout.slice(0, MAX_STDOUT),
          stderr: stderr.slice(0, MAX_STDERR),
        };
      },
    }),

    collectDiff: tool({
      description:
        "Collect the git diff of all changes you have made. Call this when you are done patching and tests are passing.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await sandbox.runCommand("git", ["diff"]);
        const diff = await result.stdout();
        return { diff };
      },
    }),
  };
}
