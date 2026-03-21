import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createPostgresState } from "@chat-adapter/state-pg";
import {
  runStartedCard,
} from "@/lib/receipts/slack";
import { registerThread } from "@/lib/bot-notifier";

interface ThreadState {
  runId?: string;
  status?: "idle" | "running" | "awaiting_approval" | "done" | "failed";
  repo?: string;
  incidentSummary?: string;
}

function extractRepoHint(text: string) {
  const repoMatch =
    text.match(/repo\s*:\s*([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\s*\(([^)]+)\))?/i) ??
    text.match(/\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\b/);

  if (repoMatch) {
    return {
      owner: repoMatch[1],
      name: repoMatch[2],
      defaultBranch: repoMatch[3] ?? "main",
    };
  }

  const simpleMatch = text.match(/repo\s*:\s*([A-Za-z0-9_.-]+)(?:\s*\(([^)]+)\))?/i);
  if (simpleMatch) {
    return {
      owner: process.env.PATCHPILOT_DEFAULT_REPO_OWNER ?? "demo",
      name: simpleMatch[1],
      defaultBranch: simpleMatch[2] ?? "main",
    };
  }

  return {
    owner: process.env.PATCHPILOT_DEFAULT_REPO_OWNER ?? "demo",
    name: process.env.PATCHPILOT_DEFAULT_REPO_NAME ?? "shop-api",
    defaultBranch: process.env.PATCHPILOT_DEFAULT_REPO_BRANCH ?? "main",
  };
}

// Lazy initialization to avoid adapter validation errors during build.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _bot: any = null;

export function getBot(): Chat {
  if (_bot) return _bot;

  const adapters = {
    slack: createSlackAdapter(),
    github: createGitHubAdapter(),
  };

  _bot = new Chat({
    userName: "patchpilot",
    adapters,
    state: createPostgresState(),
  });

  registerHandlers(_bot);

  // Register as singleton if the method exists (for notifier access)
  if (typeof _bot.registerSingleton === "function") {
    _bot.registerSingleton();
  }

  return _bot;
}

// --- Event Handlers ---
function registerHandlers(bot: Chat) {
  // When someone @mentions the bot with incident info
  bot.onNewMention(async (thread, message) => {
    const text = message.text;
    console.log(`[bot] new mention from ${message.author.userName}: ${text.slice(0, 100)}`);
    const repo = extractRepoHint(text);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Post acknowledgement
    const ack = await thread.post(
      runStartedCard({
        runId: "pending",
        repo: `${repo.owner}/${repo.name}`,
        summary: text.slice(0, 200),
        mode: "apply verify",
        environment: "staging",
        nextSteps: [
          "Extract key signals from the incident evidence",
          "Reproduce the failure in a safe sandbox",
          "Draft a patch and verify with tests",
          "Request approver confirmation before opening a PR",
        ],
      })
    );

    // Subscribe for follow-ups
    await thread.subscribe();
    await thread.setState({ status: "idle", incidentSummary: text });

    // Start the workflow
    try {
      const res = await fetch(`${appUrl}/api/runs/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: thread.id.startsWith("github:") ? "github" : "slack",
          mode: "apply_verify",
          environment: "staging",
          repo,
          incident: {
            summaryText: text,
            artifacts: [],
          },
          config: {
            maxAgentIterations: 5,
          },
          threadContext: {
            platform: thread.id.startsWith("github:") ? "github" : "slack",
            threadId: thread.id,
          },
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const runId = payload.runId as string;
        await thread.setState({ runId, status: "running" });

        // Register the thread so the notifier can post updates back
        registerThread(runId, thread.id);

        await ack.edit(
          runStartedCard({
            runId,
            repo: `${repo.owner}/${repo.name}`,
            summary: text.slice(0, 200),
            mode: "apply verify",
            environment: "staging",
            nextSteps: [
              "Evidence extraction",
              "Sandbox reproduction",
              "Patch and verification",
              "Approval before PR",
            ],
            traceUrl: `${appUrl}${payload.traceUrl ?? `/runs/${runId}`}`,
          })
        );
      } else {
        const err = await res.text();
        await thread.post(`Failed to start run: ${err}`);
        await thread.setState({ status: "failed" });
      }
    } catch (err) {
      console.error("[bot] failed to start run:", err);
      await thread.post(`Error starting run: ${err}`);
      await thread.setState({ status: "failed" });
    }
  });

  // Follow-up messages in active threads
  bot.onSubscribedMessage(async (thread, message) => {
    const state = await thread.state;
    if (!state) return;

    const s = state as ThreadState;
    if (s.status === "running") {
      await thread.post(
        `Run \`${s.runId}\` is still in progress. I'll update you when there's news.`
      );
    } else if (s.status === "awaiting_approval") {
      await thread.post(
        `Run \`${s.runId}\` is waiting for approval. Open the web approval console from the latest receipt card.`
      );
    } else if (s.status === "done" || s.status === "failed") {
      await thread.post(
        `Run \`${s.runId}\` has ${s.status === "done" ? "completed" : "failed"}. Start a new run by mentioning me again.`
      );
    }
  });
}
