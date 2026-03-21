"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CircleStop,
  LoaderCircle,
  Mic,
  RotateCcw,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPatchPilotRunId } from "@/lib/patchpilot/run-id";
import { cn } from "@/lib/utils";
import { AudioCapture } from "@/lib/voice/audio-capture";
import { RealtimeSTTClient } from "@/lib/voice/stt-client";

type VoiceState = "idle" | "listening" | "review" | "sending";

export interface VoiceRepoOption {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
}

function getRepoLabel(repo: VoiceRepoOption) {
  return `${repo.owner}/${repo.name}`;
}

function buildTranscript(committedTexts: string[], partialText: string) {
  return [...committedTexts, partialText]
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .join(" ");
}

function getResponseMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

export function VoiceIntake({
  repos,
  initialRepoId,
  defaultEnvironment = "staging",
}: {
  repos: VoiceRepoOption[];
  initialRepoId?: string | null;
  defaultEnvironment?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>("idle");
  const [partialText, setPartialText] = useState("");
  const [committedTexts, setCommittedTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [repoId, setRepoId] = useState(initialRepoId ?? repos[0]?.id ?? "");
  const [environment, setEnvironment] = useState(defaultEnvironment);
  const [branchOverride, setBranchOverride] = useState("");

  const captureRef = useRef<AudioCapture | null>(null);
  const sttRef = useRef<RealtimeSTTClient | null>(null);

  const selectedRepo = useMemo(
    () => repos.find((repo) => repo.id === repoId) ?? repos[0] ?? null,
    [repoId, repos]
  );
  const effectiveBranch = branchOverride.trim() || selectedRepo?.defaultBranch || "main";
  const fullTranscript = useMemo(
    () => buildTranscript(committedTexts, partialText),
    [committedTexts, partialText]
  );

  const resetCapture = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    sttRef.current?.disconnect();
    sttRef.current = null;
  }, []);

  useEffect(() => () => resetCapture(), [resetCapture]);

  const resetTranscript = useCallback(() => {
    setPartialText("");
    setCommittedTexts([]);
    setError(null);
  }, []);

  const startListening = useCallback(async () => {
    if (!selectedRepo) {
      setError("No allowlisted repos are configured yet.");
      return;
    }

    resetCapture();
    resetTranscript();

    try {
      const tokenRes = await fetch("/api/voice/token");
      const tokenPayload = await tokenRes.json().catch(() => null);
      if (!tokenRes.ok || !tokenPayload || typeof tokenPayload.token !== "string") {
        setError(getResponseMessage(tokenPayload, "Voice not available"));
        setState("idle");
        return;
      }

      const stt = new RealtimeSTTClient({
        token: tokenPayload.token,
        onPartial: (text) => setPartialText(text),
        onCommit: (text) => {
          setCommittedTexts((previous) => [...previous, text]);
          setPartialText("");
        },
        onError: (sttError) => {
          console.error("[voice] STT error:", sttError);
          setError("Transcription dropped. Record again.");
        },
      });
      stt.connect();
      sttRef.current = stt;

      const capture = new AudioCapture();
      capture.onChunk = (base64) => stt.sendAudio(base64);
      await capture.start();
      captureRef.current = capture;

      setState("listening");
    } catch (startError) {
      resetCapture();
      console.error("[voice] start error:", startError);
      setError(
        startError instanceof Error ? startError.message : "Failed to start recording"
      );
      setState("idle");
    }
  }, [resetCapture, resetTranscript, selectedRepo]);

  const stopListening = useCallback(() => {
    resetCapture();

    if (buildTranscript(committedTexts, partialText)) {
      setState("review");
      return;
    }

    setState("idle");
    setError("No speech captured. Try again.");
  }, [committedTexts, partialText, resetCapture]);

  const recordAgain = useCallback(() => {
    resetCapture();
    resetTranscript();
    setState("idle");
  }, [resetCapture, resetTranscript]);

  const sendToWorkflow = useCallback(async () => {
    if (!selectedRepo) {
      setError("Choose an allowlisted repo first.");
      return;
    }

    const transcript = buildTranscript(committedTexts, partialText);
    if (!transcript) {
      setError("Say the incident first.");
      return;
    }

    setError(null);
    setState("sending");

    try {
      const runId = createPatchPilotRunId();
      const response = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          source: "voice",
          mode: "apply_verify",
          environment,
          repo: {
            owner: selectedRepo.owner,
            name: selectedRepo.name,
            defaultBranch: effectiveBranch,
          },
          incident: { summaryText: transcript, artifacts: [] },
          voiceContext: {
            transcript,
            language: "en",
            persona: "neutral",
          },
          config: { maxAgentIterations: 5 },
        }),
      });

      const payload = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("traceUrl" in payload) ||
        typeof payload.traceUrl !== "string"
      ) {
        throw new Error(getResponseMessage(payload, "Failed to start run"));
      }

      startTransition(() => {
        router.push(payload.traceUrl);
        router.refresh();
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to start run"
      );
      setState("review");
    }
  }, [
    committedTexts,
    effectiveBranch,
    environment,
    partialText,
    router,
    selectedRepo,
  ]);

  if (repos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-xl liquid-glass !rounded-[32px] border-0">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
              Voice Mode
            </Badge>
            <CardTitle className="text-3xl">Call PatchPilot</CardTitle>
            <CardDescription className="text-base">
              Voice intake needs at least one allowlisted repo before it can start a run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-background/40 p-5 text-sm text-muted-foreground">
              Add a repo policy first, then come back here and the microphone flow will be ready immediately.
            </div>
            <Link href="/dashboard/recipes">
              <Button>Open Repo Policies</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-5xl liquid-glass !rounded-[32px] border-0">
        <CardHeader className="space-y-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="w-fit border-primary/20 bg-primary/5 text-primary"
              >
                Voice Mode
              </Badge>
              <div className="space-y-2">
                <CardTitle className="text-3xl sm:text-4xl">
                  Call PatchPilot
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7">
                  Describe the incident out loud. PatchPilot uses the transcript as the
                  run brief, verifies it against the selected repo, and takes you
                  straight into the trace.
                </CardDescription>
              </div>
            </div>

            {selectedRepo ? (
              <div className="min-w-[240px] rounded-[28px] border border-border/60 bg-background/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Active Target
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {getRepoLabel(selectedRepo)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Branch {effectiveBranch} · {environment}
                </p>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Run against</p>
              <p className="text-xs text-muted-foreground">
                Only allowlisted repos are available in voice mode.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {repos.map((repo) => {
                const isSelected = repo.id === selectedRepo?.id;
                return (
                  <Button
                    key={repo.id}
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "rounded-full px-4 py-5",
                      !isSelected && "bg-background/50"
                    )}
                    onClick={() => setRepoId(repo.id)}
                    disabled={state === "listening" || state === "sending"}
                  >
                    {getRepoLabel(repo)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="rounded-[30px] border border-border/60 bg-background/30 p-6">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="rounded-full border border-primary/20 bg-primary/5 p-4 shadow-[0_0_60px_rgba(var(--primary),0.16)]">
                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      "h-28 w-28 rounded-full shadow-[0_18px_50px_rgba(var(--primary),0.24)]",
                      state === "listening" && "animate-pulse"
                    )}
                    variant={state === "listening" ? "destructive" : "default"}
                    onClick={state === "listening" ? stopListening : startListening}
                    disabled={state === "sending"}
                  >
                    {state === "sending" ? (
                      <LoaderCircle className="size-9 animate-spin" />
                    ) : state === "listening" ? (
                      <CircleStop className="size-9" />
                    ) : (
                      <Mic className="size-9" />
                    )}
                  </Button>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-xl font-semibold">
                    {state === "listening"
                      ? "Listening live"
                      : state === "review"
                        ? "Transcript ready"
                        : state === "sending"
                          ? "Starting your run"
                          : "Tap to start talking"}
                  </p>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    {state === "listening"
                      ? "Describe the incident, symptoms, and any suspected root cause. Tap again when you’re done."
                      : state === "review"
                        ? "No extra title or summary needed. Launch the run or record a cleaner take."
                        : state === "sending"
                          ? "PatchPilot is turning the transcript into an incident run and opening the trace."
                          : "Voice mode is now record-first. Choose the repo once, then speak naturally."}
                  </p>
                </div>

                {state === "review" ? (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button type="button" size="lg" onClick={sendToWorkflow}>
                      Launch Run
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={recordAgain}
                    >
                      Record Again
                      <RotateCcw className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[30px] border border-border/60 bg-background/30 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Live transcript</p>
                  <p className="text-xs text-muted-foreground">
                    Your spoken incident becomes the run summary automatically.
                  </p>
                </div>
                {fullTranscript ? (
                  <Badge variant="secondary">{committedTexts.length} committed</Badge>
                ) : null}
              </div>

              <div
                aria-live="polite"
                className="mt-4 min-h-[260px] rounded-[24px] border border-border/60 bg-background/50 p-5"
              >
                {fullTranscript ? (
                  <p className="text-[15px] leading-7 text-foreground">
                    {committedTexts.join(" ")}
                    {partialText ? (
                      <span className="text-muted-foreground italic">
                        {committedTexts.length > 0 ? " " : ""}
                        {partialText}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">
                    Start recording and PatchPilot will capture the incident here. You
                    do not need to prefill a title, repo owner, repo name, or a second
                    summary before using voice mode.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-[24px] border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-medium">What happens next</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  PatchPilot verifies against {selectedRepo ? getRepoLabel(selectedRepo) : "the selected repo"}
                  , uses {effectiveBranch} as the branch target, and opens the full run
                  trace as soon as the workflow starts.
                </p>
              </div>
            </section>
          </div>

          <Accordion className="rounded-[24px] border border-border/60 bg-background/20 px-4">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="py-4 hover:no-underline">
                Advanced target options
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Environment</span>
                    <input
                      value={environment}
                      onChange={(event) => setEnvironment(event.target.value)}
                      className="rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                      placeholder="staging"
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Branch override</span>
                    <input
                      value={branchOverride}
                      onChange={(event) => setBranchOverride(event.target.value)}
                      className="rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                      placeholder={selectedRepo?.defaultBranch ?? "main"}
                    />
                  </label>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Leave branch override empty to use the repo default branch.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {error ? (
            <div
              role="alert"
              className="rounded-[24px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              Voice is browser-only in v1, but every meaningful action still lands in
              the same web run trace.
            </p>
            <Link href="/dashboard" className="text-primary underline underline-offset-4">
              Back to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
