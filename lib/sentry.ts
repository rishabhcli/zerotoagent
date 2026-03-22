import * as Sentry from "@sentry/nextjs";

export { Sentry };

function getSentryOrganizationSlug() {
  const explicit = process.env.SENTRY_ORG ?? process.env.NEXT_PUBLIC_SENTRY_ORG;
  if (explicit) return explicit;

  // Try to infer from SENTRY_DSN — format: https://<key>@o<org_id>.ingest...
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    const match = dsn.match(/@o(\d+)\./);
    if (match) return match[1]; // numeric org ID works in Sentry URLs
  }

  return null;
}

export function buildSentryTraceUrl(traceId: string | null | undefined) {
  const organizationSlug = getSentryOrganizationSlug();
  if (!traceId || !organizationSlug) {
    return null;
  }

  return `https://sentry.io/organizations/${organizationSlug}/explore/traces/?query=${encodeURIComponent(
    traceId
  )}`;
}

export function getRunTraceContext(
  span:
    | {
        spanContext?: () => { traceId?: string };
      }
    | null
    | undefined
) {
  const traceId = span?.spanContext?.().traceId ?? null;

  return {
    traceId,
    sentryTraceUrl: buildSentryTraceUrl(traceId),
  };
}

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
