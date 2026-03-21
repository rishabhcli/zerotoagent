import * as Sentry from "@sentry/nextjs";

export { Sentry };

export function traceToolCall<T>(
  toolName: string,
  runId: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `patchpilot.tool.${toolName}`,
      op: "ai.tool",
      attributes: { "patchpilot.run_id": runId },
    },
    fn
  );
}
