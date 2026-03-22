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
  { text: "$ repro run --repo acme/api --issue 1842", type: "command" as const, delay: 0 },
  { text: "◐ Parsing incident #1842...", type: "info" as const, delay: 700 },
  { text: "  Root cause: null pointer in UserService.getProfile()", type: "dim" as const, delay: 1200 },
  { text: "  Affected: src/services/user.ts, src/middleware/auth.ts", type: "dim" as const, delay: 1500 },
  { text: "✓ Incident parsed", type: "success" as const, delay: 1900 },
  { text: "◐ Creating sandbox sbx_a4Kx9...", type: "info" as const, delay: 2400 },
  { text: "  Cloning acme/api@main into isolated runner", type: "dim" as const, delay: 2900 },
  { text: "  Installing deps and seeding test DB", type: "dim" as const, delay: 3200 },
  { text: "✓ Sandbox ready", type: "success" as const, delay: 3700 },
  { text: "◐ Reproducing failure in sandbox...", type: "info" as const, delay: 4100 },
  { text: "  ✗ GET /api/user/profile → 500 (NullPointerException)", type: "error" as const, delay: 4600 },
  { text: "✓ Failure reproduced", type: "success" as const, delay: 5000 },
  { text: "◐ Generating patch...", type: "info" as const, delay: 5400 },
  { text: "  + if (!user) return res.status(404).json({ error: 'Not found' })", type: "added" as const, delay: 5900 },
  { text: "✓ Patch applied in sandbox", type: "success" as const, delay: 6300 },
  { text: "◐ Running verification in sandbox...", type: "info" as const, delay: 6700 },
  { text: "  Tests: 47 passed, 0 failed", type: "dim" as const, delay: 7300 },
  { text: "✓ All checks passed", type: "success" as const, delay: 7600 },
  { text: "⏸ Awaiting approval...", type: "primary" as const, delay: 8100 },
  { text: "✓ Approved by @alice", type: "success" as const, delay: 9200 },
  { text: "◐ Creating pull request...", type: "info" as const, delay: 9700 },
  { text: "  Branch: repro/fix-1842-null-user pushed", type: "dim" as const, delay: 10200 },
  { text: "  PR #1843 opened → acme/api", type: "dim" as const, delay: 10500 },
  { text: "✓ PR created and CI triggered", type: "success" as const, delay: 10900 },
  { text: "✓ CI passed · run complete", type: "success" as const, delay: 11800 },
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
    title: "Sandboxed isolation",
    copy: "Every reproduction and fix runs in a disposable sandbox. Your infra stays untouched.",
    detail: "sandbox.created",
  },
  {
    icon: FileArchive,
    title: "Approval gate",
    copy: "Workflow pauses with full evidence attached. No PR is pushed without human sign-off.",
    detail: "approval.resolved",
  },
  {
    icon: GitPullRequest,
    title: "PR push + CI",
    copy: "After approval, the branch is pushed, PR opened, and CI runs on your repo.",
    detail: "pr.created",
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
        <p className="section-kicker">Observability</p>
        <h2 className="display-section text-foreground">
          Every step is visible. Nothing is hidden.
        </h2>
        <p className="body-lead max-w-2xl">
          Watch the sandbox spin up, the fix get verified, and the PR get pushed — all in one trace.
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
