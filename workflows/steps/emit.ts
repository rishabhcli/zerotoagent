import type { RunEventKind } from "@/lib/patchpilot/contracts";
import { notifyThread } from "@/lib/bot-notifier";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import { redactUnknown } from "@/lib/patchpilot/redaction";

export type RunEventType = RunEventKind;

const STATUS_MAP: Partial<Record<RunEventType, string>> = {
  "run.started": "running",
  "approval.requested": "awaiting_approval",
  "run.completed": "completed",
  "run.failed": "failed",
};

export async function emitRunEvent(event: {
  runId: string;
  seq: number;
  type: RunEventType;
  data?: unknown;
  spanId?: string;
  toolName?: string;
}) {
  "use step";

  // Graceful fallback: log to console if Supabase is not configured
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.log(`[run:${event.runId}] seq=${event.seq} ${event.type}`, event.data ?? "");
    return;
  }

  // Insert event
  const { error: insertError } = await supabase.from("run_events").insert({
    run_id: event.runId,
    ts: new Date().toISOString(),
    seq: event.seq,
    type: event.type,
    data: redactUnknown(event.data ?? {}),
    span_id: event.spanId ?? null,
    tool_name: event.toolName ?? null,
  });

  if (insertError) {
    console.error(`[run:${event.runId}] Failed to insert event:`, insertError);
  }

  // Update run status if applicable
  const newStatus = STATUS_MAP[event.type];
  if (newStatus) {
    await supabase
      .from("runs")
      .update({ status: newStatus })
      .eq("id", event.runId);
  }

  // Special handling for approval.resolved — check the data for approved/rejected
  if (event.type === "approval.resolved" && event.data) {
    const decision = event.data as { approved?: boolean };
    await supabase
      .from("runs")
      .update({ status: decision.approved ? "approved" : "rejected" })
      .eq("id", event.runId);
  }

  await notifyThread(event.runId, {
    type: event.type,
    data: (event.data as Record<string, unknown> | undefined) ?? undefined,
  });
}
