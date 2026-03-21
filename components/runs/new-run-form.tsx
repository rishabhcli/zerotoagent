"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { createReProRunId } from "@/lib/patchpilot/run-id";

interface RepoOption {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  enabled: boolean;
}

interface UploadTicket {
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
  kind: string;
  source: string;
}

export function NewRunForm({
  repos,
}: {
  repos: RepoOption[];
}) {
  const router = useRouter();
  const [repoId, setRepoId] = useState(repos[0]?.id ?? "");
  const [summaryText, setSummaryText] = useState("");
  const [mode, setMode] = useState<"dry_run" | "apply_verify">("apply_verify");
  const [environment, setEnvironment] = useState("staging");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "starting">("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedRepo = useMemo(
    () => repos.find((repo) => repo.id === repoId) ?? repos[0],
    [repoId, repos]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRepo) {
      setError("Choose an allowlisted repo first.");
      return;
    }

    if (!summaryText.trim()) {
      setError("Incident summary is required.");
      return;
    }

    setError(null);

    try {
      const runId = createReProRunId();
      const artifacts: Array<{
        kind: "log" | "screenshot" | "pdf" | "audio" | "other";
        filename: string;
        mimeType: string;
        storagePath: string;
        sizeBytes: number;
        source: string;
      }> = [];

      const selectedFiles = files ? Array.from(files) : [];
      if (selectedFiles.length > 0) {
        setStatus("uploading");

        for (const file of selectedFiles) {
          const ticketRes = await fetch("/api/artifacts/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId,
              filename: file.name,
              mimeType: file.type || "application/octet-stream",
              source: "web",
            }),
          });
          const ticketPayload = (await ticketRes.json()) as
            | { ok?: boolean; ticket?: UploadTicket; message?: string }
            | undefined;

          if (!ticketRes.ok || !ticketPayload?.ticket) {
            throw new Error(ticketPayload?.message ?? "Failed to create upload ticket");
          }

          const uploadRes = await fetch(ticketPayload.ticket.signedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "x-upsert": "true",
            },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          artifacts.push({
            kind: ticketPayload.ticket.kind as "log" | "screenshot" | "pdf" | "audio" | "other",
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            storagePath: ticketPayload.ticket.path,
            sizeBytes: file.size,
            source: "web",
          });
        }
      }

      setStatus("starting");
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          source: "web",
          mode,
          environment,
          repo: {
            owner: selectedRepo.owner,
            name: selectedRepo.name,
            defaultBranch: selectedRepo.defaultBranch,
          },
          incident: {
            summaryText,
            artifacts,
          },
          config: {
            maxAgentIterations: 5,
          },
        }),
      });

      const payload = (await res.json()) as
        | { ok?: boolean; traceUrl?: string; message?: string }
        | undefined;

      if (!res.ok || !payload?.traceUrl) {
        throw new Error(payload?.message ?? "Failed to start run");
      }

      router.push(payload.traceUrl);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to start run");
      setStatus("idle");
    }
  };

  return (
    <GlassSurface
      variant="hero-panel"
      motionStrength={0.35}
      className="p-6 md:p-8"
    >
      <form onSubmit={handleSubmit} className="grid gap-6">
        <GlassSurface
          variant="quiet-panel"
          motionStrength={0.24}
          className="p-5"
        >
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="incident-summary">
              Incident summary
            </label>
            <textarea
              id="incident-summary"
              value={summaryText}
              onChange={(event) => setSummaryText(event.target.value)}
              rows={7}
              className="glass-input w-full px-4 py-3 text-sm"
              placeholder="Describe the incident, attach any evidence, and tell RePro what environment to validate against."
            />
          </div>
        </GlassSurface>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassSurface
            variant="quiet-panel"
            motionStrength={0.22}
            className="p-4"
          >
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Repo scope</span>
              <select
                value={repoId}
                onChange={(event) => setRepoId(event.target.value)}
                className="glass-input px-3 py-2"
              >
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.owner}/{repo.name} ({repo.defaultBranch})
                  </option>
                ))}
              </select>
            </label>
          </GlassSurface>

          <GlassSurface
            variant="quiet-panel"
            motionStrength={0.22}
            className="p-4"
          >
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Mode</span>
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "dry_run" | "apply_verify")
                }
                className="glass-input px-3 py-2"
              >
                <option value="apply_verify">Apply + Verify</option>
                <option value="dry_run">Dry Run</option>
              </select>
            </label>
          </GlassSurface>

          <GlassSurface
            variant="quiet-panel"
            motionStrength={0.22}
            className="p-4"
          >
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Environment</span>
              <input
                value={environment}
                onChange={(event) => setEnvironment(event.target.value)}
                className="glass-input px-3 py-2"
                placeholder="staging"
              />
            </label>
          </GlassSurface>
        </div>

        <GlassSurface
          variant="quiet-panel"
          motionStrength={0.22}
          className="p-5"
        >
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Evidence uploads</span>
            <input
              type="file"
              multiple
              onChange={(event) => setFiles(event.target.files)}
              className="glass-input rounded-[1.2rem] border-dashed px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white/[0.08] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
            />
            <span className="text-muted-foreground">
              Supported for v1: screenshots, logs, PDFs, and audio notes.
            </span>
          </label>
        </GlassSurface>

        {selectedRepo ? (
          <GlassSurface
            variant="quiet-panel"
            motionStrength={0.2}
            className="p-4 text-sm text-muted-foreground"
          >
            <p className="font-medium text-foreground">Policy preview</p>
            <p className="mt-1 leading-6">
              RePro will operate only inside the allowlisted repo and open
              a PR only after sandbox verification and approver confirmation.
            </p>
          </GlassSurface>
        ) : null}

        {error ? (
          <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            {status === "idle"
              ? "Ready"
              : status === "uploading"
                ? "Uploading evidence"
                : "Starting workflow"}
          </p>
          <Button type="submit" size="lg" disabled={status !== "idle"}>
            {status === "idle" ? "Start verified run" : "Working..."}
          </Button>
        </div>
      </form>
    </GlassSurface>
  );
}
