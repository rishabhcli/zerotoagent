import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createPostgresState } from "@chat-adapter/state-pg";
import { nanoid } from "nanoid";
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

    // Post acknowledgement
    const ack = await thread.post(
      runStartedCard({
        runId: "...",
        repo: "detecting...",
        summary: text.slice(0, 200),
      })
    );

    // Subscribe for follow-ups
    await thread.subscribe();
    await thread.setState({ status: "idle", incidentSummary: text });

    // Start the workflow
    const runId = nanoid();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      const res = await fetch(`${appUrl}/api/runs/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          repo: {
            owner: "unknown",
            name: "unknown",
            defaultBranch: "main",
          },
          incident: {
            summaryText: text,
            artifacts: [],
          },
          config: {
            testCommand: "npm test",
            maxAgentIterations: 5,
          },
        }),
      });

      if (res.ok) {
        await thread.setState({ runId, status: "running" });

        // Register the thread so the notifier can post updates back
        registerThread(runId, thread.id);

        await ack.edit(
          runStartedCard({
            runId,
            repo: "unknown/unknown",
            summary: text.slice(0, 200),
            traceUrl: `${appUrl}/runs/${runId}`,
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
        `Run \`${s.runId}\` is waiting for approval. Use the Approve/Reject buttons above.`
      );
    } else if (s.status === "done" || s.status === "failed") {
      await thread.post(
        `Run \`${s.runId}\` has ${s.status === "done" ? "completed" : "failed"}. Start a new run by mentioning me again.`
      );
    }
  });

  // Approve button clicked
  bot.onAction("approve", async (event) => {
    const runId = event.value;
    if (!runId || !event.thread) return;

    console.log(`[bot] approve action for run ${runId}`);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await fetch(`${appUrl}/api/hooks/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: `approval:${runId}`,
          approved: true,
          comment: `Approved by ${event.user.userName} via chat`,
        }),
      });

      await event.thread.post("Approved. Creating PR...");
      await event.thread.setState({ status: "running" });
    } catch (err) {
      console.error("[bot] approval failed:", err);
      await event.thread.post(`Approval failed: ${err}`);
    }
  });

  // Reject button clicked
  bot.onAction("reject", async (event) => {
    const runId = event.value;
    if (!runId || !event.thread) return;

    console.log(`[bot] reject action for run ${runId}`);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await fetch(`${appUrl}/api/hooks/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: `approval:${runId}`,
          approved: false,
          comment: `Rejected by ${event.user.userName} via chat`,
        }),
      });

      await event.thread.post("Rejected. Run stopped.");
      await event.thread.setState({ status: "failed" });
    } catch (err) {
      console.error("[bot] rejection failed:", err);
      await event.thread.post(`Rejection failed: ${err}`);
    }
  });
}
