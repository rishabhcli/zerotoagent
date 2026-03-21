import {
  Bug,
  GitPullRequest,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Search,
    title: "Diagnose",
    description: "Normalize the incident into one run.",
    footer: "incident.parsed",
    accent: "from-sky-400/60 via-sky-300/25 to-transparent",
  },
  {
    icon: Bug,
    title: "Reproduce",
    description: "Replay the failure in a sandbox.",
    footer: "reproduction.completed",
    accent: "from-amber-300/60 via-orange-300/20 to-transparent",
  },
  {
    icon: Wrench,
    title: "Patch",
    description: "Generate the smallest useful diff.",
    footer: "patch.generated",
    accent: "from-indigo-300/55 via-primary/20 to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    description: "Run checks and surface the result.",
    footer: "verification.completed",
    accent: "from-emerald-300/60 via-emerald-300/18 to-transparent",
  },
  {
    icon: GitPullRequest,
    title: "Approve",
    description: "Pause until a human decides.",
    footer: "approval.requested",
    accent: "from-rose-300/60 via-pink-300/18 to-transparent",
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="home-section">
      <div className="mb-12 max-w-3xl space-y-4">
        <p className="section-kicker">Pipeline</p>
        <h2 className="display-section text-foreground">
          One flow from signal to gate.
        </h2>
        <p className="body-lead max-w-2xl">
          Evidence first. Patch second. Human approval before output.
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute left-12 right-12 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/[0.16] to-transparent lg:block" />

        <div className="grid gap-4 lg:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <GlassSurface
                key={step.title}
                variant="card"
                motionStrength={0.78}
                className={cn(
                  "relative flex h-full flex-col gap-5 p-5",
                  "lg:after:absolute lg:after:right-[-18px] lg:after:top-1/2 lg:after:h-px lg:after:w-9 lg:after:-translate-y-1/2 lg:after:bg-gradient-to-r lg:after:from-white/[0.18] lg:after:to-transparent",
                  index === steps.length - 1 && "lg:after:hidden",
                  index % 2 === 1 ? "lg:translate-y-8" : "lg:-translate-y-1"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-28 rounded-t-[inherit] bg-gradient-to-b",
                    step.accent
                  )}
                />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-[1.2rem] bg-white/[0.08] text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>

                <div className="relative z-10">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                <div className="relative z-10 mt-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {step.footer}
                </div>
              </GlassSurface>
            );
          })}
        </div>
      </div>
    </section>
  );
}
