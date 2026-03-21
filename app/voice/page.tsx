"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioCapture } from "@/lib/voice/audio-capture";
import { RealtimeSTTClient } from "@/lib/voice/stt-client";
import { createPatchPilotRunId } from "@/lib/patchpilot/run-id";

type VoiceState = "idle" | "listening" | "stopped" | "sending" | "done" | "error";

export default function VoicePage() {
  const [state, setState] = useState<VoiceState>("idle");
  const [partialText, setPartialText] = useState("");
  const [committedTexts, setCommittedTexts] = useState<string[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoOwner, setRepoOwner] = useState(process.env.NEXT_PUBLIC_PATCHPILOT_DEFAULT_REPO_OWNER ?? "demo");
  const [repoName, setRepoName] = useState(process.env.NEXT_PUBLIC_PATCHPILOT_DEFAULT_REPO_NAME ?? "shop-api");
  const [repoBranch, setRepoBranch] = useState(process.env.NEXT_PUBLIC_PATCHPILOT_DEFAULT_REPO_BRANCH ?? "main");
  const [environment, setEnvironment] = useState("staging");

  const captureRef = useRef<AudioCapture | null>(null);
  const sttRef = useRef<RealtimeSTTClient | null>(null);

  const startListening = useCallback(async () => {
    setError(null);
    setPartialText("");
    setCommittedTexts([]);

    try {
      // Fetch token from server
      const tokenRes = await fetch("/api/voice/token");
      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        setError(err.error ?? "Voice not available");
        setState("error");
        return;
      }
      const { token } = await tokenRes.json();

      // Set up STT client
      const stt = new RealtimeSTTClient({
        token,
        onPartial: (text) => setPartialText(text),
        onCommit: (text) => {
          setCommittedTexts((prev) => [...prev, text]);
          setPartialText("");
        },
        onError: (err) => console.error("[voice] STT error:", err),
      });
      stt.connect();
      sttRef.current = stt;

      // Set up audio capture
      const capture = new AudioCapture();
      capture.onChunk = (base64) => stt.sendAudio(base64);
      await capture.start();
      captureRef.current = capture;

      setState("listening");
    } catch (err) {
      console.error("[voice] start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setState("error");
    }
  }, []);

  const stopListening = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    sttRef.current?.disconnect();
    sttRef.current = null;
    setState("stopped");
  }, []);

  const sendToWorkflow = useCallback(async () => {
    const fullTranscript = committedTexts.join(" ").trim();
    if (!fullTranscript) return;

    setState("sending");

    try {
      const newRunId = createPatchPilotRunId();
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: newRunId,
          source: "voice",
          mode: "apply_verify",
          environment,
          repo: { owner: repoOwner, name: repoName, defaultBranch: repoBranch },
          incident: { summaryText: fullTranscript, artifacts: [] },
          voiceContext: { transcript: fullTranscript, language: "en", persona: "neutral" },
          config: { maxAgentIterations: 5 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRunId(data.runId);
        setState("done");
      } else {
        const err = await res.text();
        setError(`Failed to start run: ${err}`);
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setState("error");
    }
  }, [committedTexts, environment, repoBranch, repoName, repoOwner]);

  const fullTranscript = committedTexts.join(" ");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Call PatchPilot</CardTitle>
          <p className="text-muted-foreground">
            Speak the incident while selecting the repo scope PatchPilot should verify against. Voice is browser-only in v1; every meaningful action still appears in the web run trace.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Repo owner</span>
              <input
                value={repoOwner}
                onChange={(event) => setRepoOwner(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none transition focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Repo name</span>
              <input
                value={repoName}
                onChange={(event) => setRepoName(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none transition focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Branch</span>
              <input
                value={repoBranch}
                onChange={(event) => setRepoBranch(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none transition focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Environment</span>
              <input
                value={environment}
                onChange={(event) => setEnvironment(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none transition focus:border-primary"
              />
            </label>
          </div>

          {/* Mic button */}
          <div className="flex justify-center">
            {state === "idle" || state === "error" ? (
              <Button size="lg" onClick={startListening}>
                Start Recording
              </Button>
            ) : state === "listening" ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={stopListening}
                className="animate-pulse"
              >
                Stop Recording
              </Button>
            ) : null}
          </div>

          {/* Transcript display */}
          {(fullTranscript || partialText) && (
            <div className="rounded-lg border bg-muted/50 p-4 min-h-[120px]">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Transcript
              </p>
              <p className="text-foreground">
                {fullTranscript}
                {partialText && (
                  <span className="text-muted-foreground italic">
                    {fullTranscript ? " " : ""}
                    {partialText}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Send button */}
          {state === "stopped" && fullTranscript && (
            <div className="flex justify-center">
              <Button size="lg" onClick={sendToWorkflow}>
                Send to PatchPilot
              </Button>
            </div>
          )}

          {/* Sending state */}
          {state === "sending" && (
            <p className="text-center text-muted-foreground">
              Starting workflow...
            </p>
          )}

          {/* Done state */}
          {state === "done" && runId && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
              <p className="font-medium">Run started</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run ID: <code className="font-mono">{runId}</code>
              </p>
              <Link
                href={`/runs/${runId}`}
                className="mt-2 inline-block text-sm text-primary underline"
              >
                View Run Trace
              </Link>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
