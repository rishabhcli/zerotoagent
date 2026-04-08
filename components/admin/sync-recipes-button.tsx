"use client";

import { useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SyncState = "idle" | "syncing" | "done" | "error";

type SyncSummary = {
  synced: boolean;
  discoveredRepoCount: number;
  installationCount: number;
  repositories: string[];
  reason?: "missing_configuration" | "no_installations";
};

function getSummaryMessage(summary: SyncSummary) {
  if (!summary.synced) {
    if (summary.reason === "missing_configuration") {
      return "Sync skipped because GitHub App or Supabase configuration is missing.";
    }

    if (summary.reason === "no_installations") {
      return "Sync completed, but no GitHub App installations were found.";
    }

    return "Sync completed with no repository changes.";
  }

  return `Synchronized ${summary.discoveredRepoCount} repositories across ${summary.installationCount} installation${summary.installationCount === 1 ? "" : "s"}.`;
}

export function SyncRecipesButton() {
  const [state, setState] = useState<SyncState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setState("syncing");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/recipes/sync", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; summary?: SyncSummary; message?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.summary) {
        throw new Error(payload?.message ?? "Failed to synchronize GitHub inventory");
      }

      setState("done");
      setMessage(getSummaryMessage(payload.summary));
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Failed to synchronize GitHub inventory");
    }
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={handleSync} disabled={state === "syncing"} variant="outline">
        {state === "syncing" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Sync GitHub Inventory
      </Button>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
