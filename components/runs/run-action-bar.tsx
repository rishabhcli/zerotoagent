"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";

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
    <GlassSurface
      variant="quiet-panel"
      motionStrength={0.22}
      className="flex flex-col gap-3 p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        {hasReceipts ? (
          <a
            href={`/api/runs/${runId}/receipts`}
            className="block focus:outline-none"
          >
            <GlassSurface
              variant="pill"
              motionStrength={0.3}
              className="inline-flex px-4 py-2 text-sm font-medium text-foreground"
            >
              <span>Download Receipts</span>
            </GlassSurface>
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
            className="block focus:outline-none"
          >
            <GlassSurface
              variant="pill"
              motionStrength={0.3}
              className="inline-flex px-4 py-2 text-sm font-medium text-foreground"
            >
              <span>Open Trace in Sentry</span>
            </GlassSurface>
          </a>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </GlassSurface>
  );
}
