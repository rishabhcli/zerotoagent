import type { RunEventType } from "@/workflows/steps/emit";
import {
  stepProgressCard,
  approvalRequestCard,
  finalReceiptCard,
  runFailedCard,
} from "@/lib/receipts/slack";

// In-memory mapping of runId → threadId for the current process.
// Populated by the bot when a run is started from chat.
// This avoids a DB round-trip for the common case where the notifier
// runs in the same process as the bot that started the run.
const threadMap = new Map<string, string>();

/** Register a runId → threadId mapping (called by the bot on run start). */
export function registerThread(runId: string, threadId: string) {
  threadMap.set(runId, threadId);
}

/**
 * Posts workflow event updates to the originating chat thread.
 * Fire-and-forget — failures are logged but never block the workflow.
 */
export async function notifyThread(
  runId: string,
  event: { type: RunEventType; data?: Record<string, unknown> }
): Promise<void> {
  try {
    const threadId = threadMap.get(runId);
    if (!threadId) {
      // Run wasn't started from chat (e.g., started via API/dashboard) — skip
      return;
    }

    const message = buildMessage(runId, event);
    if (!message) return;

    // Resolve the thread from the Chat SDK and post the card
    const { getBot } = await import("@/lib/bot");
    const bot = getBot();

    // The Chat SDK state adapter tracks subscribed threads.
    // We post via the bot's adapter — the threadId format tells us which platform.
    // Format: "slack:C123:1234567890.123" or "github:owner/repo:123"
    const adapterName = threadId.split(":")[0];
    const adapter = bot.getAdapter(adapterName);

    if (adapter) {
      // Use adapter.postToThread if available, otherwise fall back to logging
      // The Chat SDK thread resolution requires the full thread object,
      // which we get via the state adapter's subscription tracking.
      console.log(`[notifier] run:${runId} event:${event.type} → posting to ${adapterName} thread`);

      // For Slack/GitHub, the adapter can resolve threads from their encoded IDs
      // and post messages. The exact API depends on the adapter implementation.
      // For now, we use a simple approach: post via the raw adapter API.
      try {
        // The bot's thread cache may have this thread from the initial subscription
        const channel = bot.channel(threadId);
        if (channel) {
          await channel.post(message);
          console.log(`[notifier] run:${runId} event:${event.type} — posted successfully`);
        }
      } catch (postErr) {
        console.warn(`[notifier] failed to post to channel ${threadId}:`, postErr);
      }
    } else {
      console.log(`[notifier] run:${runId} event:${event.type} — adapter ${adapterName} not found`);
    }
  } catch (err) {
    console.warn(`[notifier] failed to notify thread for run ${runId}:`, err);
  }
}

function buildMessage(
  runId: string,
  event: { type: RunEventType; data?: Record<string, unknown> }
) {
  const { type, data } = event;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const traceUrl = `${appUrl}/runs/${runId}`;
  const approvalUrl = `${traceUrl}#approval-console`;
  const receiptUrl = `${appUrl}/api/runs/${runId}/receipts`;

  switch (type) {
    case "incident.parsed":
      return stepProgressCard({
        runId,
        stepName: "Evidence Extracted",
        description:
          (data?.suspectedRootCause as string) ??
          (data?.normalizedSummary as string) ??
          "Evidence parsed and triage updated.",
      });

    case "repo.policy_resolved":
      return stepProgressCard({
        runId,
        stepName: "Policy Resolved",
        description: `Repo allowlist and sandbox policy loaded successfully.`,
      });

    case "repo.focus":
      return stepProgressCard({
        runId,
        stepName: "Files Identified",
        description: `Found ${((data?.candidates as unknown[]) ?? []).length} suspect files`,
      });

    case "reproduction.completed":
      return stepProgressCard({
        runId,
        stepName: "Reproduction Attempt",
        description:
          data?.reproduced === true
            ? "Issue reproduced in the sandbox."
            : "Issue was not reproducible in the sandbox.",
      });

    case "verification.completed": {
      const status = data?.status as string | undefined;
      return stepProgressCard({
        runId,
        stepName: "Verification Complete",
        description:
          status === "pass"
            ? "Sandbox verification passed."
            : status === "flaky"
              ? "Verification was flaky across retries."
              : "Sandbox verification failed.",
      });
    }

    case "approval.requested":
      return approvalRequestCard({
        runId,
        prTitle: `Open PR for run ${runId}`,
        patchSummary:
          (data?.patchSummary as string) ?? "Verified patch is ready for approval.",
        diffstat: typeof data?.diffstat === "string" ? (data.diffstat as string) : undefined,
        testSummary:
          typeof data?.tests === "object" && data?.tests !== null
            ? `${((data.tests as { attempts?: unknown[] }).attempts ?? []).length || 1} verification run(s) completed`
            : "Sandbox verification passed",
        requiredRole: "Approver",
        approvalUrl,
        traceUrl,
      });

    case "approval.resolved":
      return stepProgressCard({
        runId,
        stepName: "Approval",
        description:
          data?.approved === true
            ? "An approver authorized PR creation."
            : "PR creation was rejected and the run stopped safely.",
      });

    case "pr.created":
      return finalReceiptCard({
        runId,
        prUrl: (data?.prUrl as string) ?? "#",
        prNumber: (data?.prNumber as number) ?? 0,
        summary: "Verified fix applied and PR opened.",
        receiptUrl,
        traceUrl,
      });

    case "ci.completed":
      return stepProgressCard({
        runId,
        stepName: "CI Status",
        description: (data?.summary as string) ?? "CI status updated.",
      });

    case "receipts.created":
      return stepProgressCard({
        runId,
        stepName: "Receipts Ready",
        description: "Receipt bundle is available for download from the run trace.",
      });

    case "run.completed":
      return finalReceiptCard({
        runId,
        prUrl: (data?.prUrl as string) ?? undefined,
        summary: "Run completed with full receipts and audit trail.",
        receiptUrl,
        traceUrl,
      });

    case "run.failed":
      return runFailedCard({
        runId,
        reason: (data?.error as string) ?? (data?.reason as string) ?? "Unknown error",
        remediation: Array.isArray(data?.remediation)
          ? (data?.remediation as string[])
          : undefined,
        traceUrl,
      });

    default:
      return null;
  }
}
