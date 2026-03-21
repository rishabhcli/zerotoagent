"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RunActionBar({
  runId,
  canReplay = true,
  hasReceipts = false,
  sentryTraceUrl,
}: {
  runId: string;
  canReplay?: boolean;
  hasReceipts?: boolean;
  sentryTraceUrl?: string | null;
}) {
  const router = useRouter();
  const [isReplaying, setIsReplaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReplay = async () => {
    setIsReplaying(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/replay`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; traceUrl?: string; message?: string }
        | null;

      if (!res.ok || !payload?.traceUrl) {
        setError(payload?.message ?? "Replay failed");
        setIsReplaying(false);
        return;
      }

      router.push(payload.traceUrl);
      router.refresh();
    } catch (replayError) {
      setError(replayError instanceof Error ? replayError.message : "Replay failed");
      setIsReplaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {hasReceipts ? (
          <a
            href={`/api/runs/${runId}/receipts`}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Download Receipts
          </a>
        ) : null}
        {canReplay ? (
          <Button onClick={handleReplay} disabled={isReplaying}>
            {isReplaying ? "Replaying..." : "Replay Verification"}
          </Button>
        ) : null}
        {sentryTraceUrl ? (
          <a
            href={sentryTraceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Open Trace in Sentry
          </a>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
