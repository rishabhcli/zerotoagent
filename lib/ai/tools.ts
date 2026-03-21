import { tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "@vercel/sandbox";
import type { RepoPolicy } from "@/lib/patchpilot/contracts";
import {
  extractDiff,
  listRepoFiles,
  runRecipeCommand,
  searchRepo,
} from "@/lib/sandbox/commands";
import { redactSensitiveText } from "@/lib/patchpilot/redaction";

const MAX_STDOUT = 10_000;
const MAX_STDERR = 5_000;

/**
 * Creates AI SDK tools that operate within a Vercel Sandbox instance.
 * Each tool closes over the sandbox so the model can read/edit files
 * and run commands inside the isolated microVM.
 */
export function createSandboxTools(
  sandbox: Sandbox,
  options: {
    policy: RepoPolicy;
    commands: {
      reproCommand: string;
      testCommand: string;
      buildCommand?: string | null;
    };
  }
) {
  return {
    listFiles: tool({
      description:
        "List repository files. Use this before reading files if you need to discover the project structure.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await listRepoFiles(sandbox, options.policy);
        return {
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, MAX_STDOUT),
          stderr: result.stderr.slice(0, MAX_STDERR),
        };
      },
    }),

    searchRepo: tool({
      description:
        "Search the repository with ripgrep. Use this to find symbols, error messages, or relevant code paths.",
      inputSchema: z.object({
        query: z.string().describe("Ripgrep query string"),
      }),
      execute: async ({ query }) => {
        const result = await searchRepo(sandbox, options.policy, query);
        return {
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, MAX_STDOUT),
          stderr: result.stderr.slice(0, MAX_STDERR),
        };
      },
    }),

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

    runReproduction: tool({
      description:
        "Run the repo's reproduction command. Use this when you want to confirm the failing behavior before or after making changes.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await runRecipeCommand(
          sandbox,
          options.policy,
          "repro",
          options.commands.reproCommand
        );
        return {
          status: result.exitCode === 0 ? "pass" : "fail",
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, MAX_STDOUT),
          stderr: result.stderr.slice(0, MAX_STDERR),
        };
      },
    }),

    runTests: tool({
      description:
        "Run the project's test suite to verify your changes. Call this after making edits to check if the fix works.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await runRecipeCommand(
          sandbox,
          options.policy,
          "test",
          options.commands.testCommand
        );
        return {
          status: result.exitCode === 0 ? ("pass" as const) : ("fail" as const),
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, MAX_STDOUT),
          stderr: result.stderr.slice(0, MAX_STDERR),
        };
      },
    }),

    runBuild: tool({
      description:
        "Run the repo's build command if one is configured. Use this after tests if build integrity matters for the fix.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!options.commands.buildCommand) {
          return { skipped: true, reason: "No build command configured for this repo." };
        }

        const result = await runRecipeCommand(
          sandbox,
          options.policy,
          "build",
          options.commands.buildCommand
        );

        return {
          status: result.exitCode === 0 ? ("pass" as const) : ("fail" as const),
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, MAX_STDOUT),
          stderr: result.stderr.slice(0, MAX_STDERR),
        };
      },
    }),

    collectDiff: tool({
      description:
        "Collect the git diff of all changes you have made. Call this when you are done patching and tests are passing.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await extractDiff(sandbox, options.policy);
        return { diff: redactSensitiveText(result.stdout) };
      },
    }),
  };
}
