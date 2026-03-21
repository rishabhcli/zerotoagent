"use client";

import { useState, useEffect, useRef } from "react";

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
  info: "text-indigo-400",
  dim: "text-muted-foreground/80",
  success: "text-emerald-400",
  error: "text-red-400",
  added: "text-emerald-400/90 font-mono text-[13px]",
  primary: "text-primary font-medium",
};

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { rootMargin: "-80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [hasStarted]);

  return (
    <section ref={sectionRef} className="relative z-10 mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <div className="mb-12 text-center animate-fade-in-up">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
          Live Demo
        </p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Watch it work
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl liquid-glass border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-white/10" />
            <span className="size-3 rounded-full bg-white/10" />
            <span className="size-3 rounded-full bg-white/10" />
          </div>
          <span className="ml-2 text-xs text-muted-foreground/60 font-mono">
            terminal
          </span>
        </div>

        {/* Terminal body */}
        <div className="h-[380px] overflow-y-auto p-5 font-mono text-sm leading-7">
          {lines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className={`${colorMap[line.type]} animate-slide-in-left`}
            >
              {line.text}
            </div>
          ))}
          {visibleLines > 0 && visibleLines < lines.length && (
            <span className="inline-block h-4 w-2 animate-pulse bg-primary/60 rounded-sm" />
          )}
        </div>
      </div>
    </section>
  );
}
