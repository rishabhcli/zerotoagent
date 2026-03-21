"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileArchive,
  GitPullRequest,
  LockKeyhole,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassSurface } from "@/components/ui/glass-surface";

const lines = [
  { text: "$ patchpilot run --repo acme/api --issue 1842", type: "command" as const, delay: 0 },
  { text: "◐ Parsing incident #1842...", type: "info" as const, delay: 800 },
  { text: "  Root cause: null pointer in UserService.getProfile()", type: "dim" as const, delay: 1400 },
  { text: "  Affected files: src/services/user.ts, src/middleware/auth.ts", type: "dim" as const, delay: 1800 },
  { text: "✓ Incident parsed", type: "success" as const, delay: 2200 },
  { text: "◐ Reproducing failure in sandbox...", type: "info" as const, delay: 2800 },
  { text: "  ✗ GET /api/user/profile → 500 (NullPointerException)", type: "error" as const, delay: 3400 },
  { text: "✓ Failure reproduced", type: "success" as const, delay: 3900 },
  { text: "◐ Generating patch...", type: "info" as const, delay: 4400 },
  { text: "  + if (!user) return res.status(404).json({ error: 'Not found' })", type: "added" as const, delay: 5000 },
  { text: "✓ Patch applied", type: "success" as const, delay: 5500 },
  { text: "◐ Running verification suite...", type: "info" as const, delay: 6000 },
  { text: "  Tests: 47 passed, 0 failed", type: "dim" as const, delay: 6800 },
  { text: "✓ All checks passed", type: "success" as const, delay: 7200 },
  { text: "⏸ Awaiting approval → https://patchpilot.dev/runs/r_8xK2m", type: "primary" as const, delay: 7800 },
];

const colorMap: Record<string, string> = {
  command: "text-foreground font-semibold",
  info: "text-sky-300",
  dim: "text-muted-foreground/80",
  success: "text-emerald-300",
  error: "text-rose-300",
  added: "text-emerald-300/90 font-mono text-[13px]",
  primary: "text-primary font-medium",
};

const evidencePanels = [
  {
    icon: LockKeyhole,
    title: "Approval console",
    copy: "Approver required before PR creation.",
    detail: "approval.requested",
  },
  {
    icon: FileArchive,
    title: "Receipt package",
    copy: "Trace, diff, and receipts stay bundled.",
    detail: "receipts.created",
  },
  {
    icon: GitPullRequest,
    title: "Policy-aware output",
    copy: "Repo guardrails stay visible to the handoff.",
    detail: "repo.policy_resolved",
  },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { rootMargin: "-80px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    lines.forEach((line, index) => {
      timers.push(setTimeout(() => setVisibleLines(index + 1), line.delay));
    });

    return () => timers.forEach(clearTimeout);
  }, [hasStarted]);

  return (
    <section id="evidence" ref={sectionRef} className="home-section">
      <div className="mb-12 max-w-3xl space-y-4">
        <p className="section-kicker">Evidence band</p>
        <h2 className="display-section text-foreground">
          The run stays legible while it moves.
        </h2>
        <p className="body-lead max-w-2xl">
          Terminal on one side. Approval and receipts on the other.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <GlassSurface
          variant="hero-panel"
          motionStrength={0.95}
          className="overflow-hidden p-0"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-white/[0.14]" />
                <span className="size-2.5 rounded-full bg-white/[0.14]" />
                <span className="size-2.5 rounded-full bg-white/[0.14]" />
              </div>
              <span className="ml-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                run trace
              </span>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              <ScrollText className="size-3" />
              live replay
            </Badge>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-h-[24rem] p-5 font-mono text-sm leading-7">
              {lines.slice(0, visibleLines).map((line, index) => (
                <div
                  key={index}
                  className={`${colorMap[line.type]} animate-slide-in-left`}
                >
                  {line.text}
                </div>
              ))}
              {visibleLines > 0 && visibleLines < lines.length && (
                <span className="mt-2 inline-block h-4 w-2 rounded-sm bg-primary/60 animate-pulse" />
              )}
            </div>

            <div className="border-l border-white/[0.08] bg-black/10 px-4 py-5">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                run snapshot
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    confidence
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    91/100
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    verification
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    47 checks
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    gate state
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-300" />
                    Ready for approver review
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassSurface>

        <div className="grid gap-4">
          {evidencePanels.map((panel, index) => {
            const Icon = panel.icon;

            return (
              <GlassSurface
                key={panel.title}
                variant={index === 0 ? "card" : "quiet-panel"}
                motionStrength={0.72}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-[1.1rem] bg-white/[0.08] text-primary">
                    <Icon className="size-4" />
                  </div>
                  <Badge variant="outline">{panel.detail}</Badge>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                  {panel.title}
                </h3>
                <p className="mt-3 text-sm leading-5 text-muted-foreground">
                  {panel.copy}
                </p>
              </GlassSurface>
            );
          })}
        </div>
      </div>
    </section>
  );
}
