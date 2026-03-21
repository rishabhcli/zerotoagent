import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GitPullRequest,
  Radar,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassSurface } from "@/components/ui/glass-surface";

const runMoments = [
  {
    icon: Radar,
    label: "Incident parsed",
    detail: "Stack trace and repo scope normalized.",
    status: "00:12",
  },
  {
    icon: Waypoints,
    label: "Sandbox reproduced",
    detail: "The 500 was recreated in an isolated runner.",
    status: "00:47",
  },
  {
    icon: FileCheck2,
    label: "Patch verified",
    detail: "Checks passed and receipts were attached.",
    status: "03:21",
  },
  {
    icon: GitPullRequest,
    label: "Approval waiting",
    detail: "The PR stays closed until approval.",
    status: "pending",
  },
];

const proofStrip = [
  {
    label: "Approval gate",
    value: "Human required",
    description: "No PR without approval.",
  },
  {
    label: "Evidence bundle",
    value: "Artifacts + diff",
    description: "Logs, diff, CI, and receipts together.",
  },
  {
    label: "Repo policy",
    value: "Allowlisted only",
    description: "Runs stay inside approved repos.",
  },
  {
    label: "Median fix time",
    value: "4 min",
    description: "When the path is clear.",
  },
];

const heroFacts = [
  { label: "Traceable", value: "100%" },
  { label: "Confidence", value: "91/100" },
  { label: "Coverage", value: "82%" },
];

export function HeroSection() {
  return (
    <section className="home-section pt-28 md:pt-36 lg:pt-40">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-2 pr-3">
              <Sparkles className="size-3" />
              liquid command center
            </Badge>
            <span className="section-kicker">Approval-gated incident resolution</span>
          </div>

          <div className="space-y-5">
            <h1 className="display-hero max-w-5xl text-foreground">
              Turn urgent incidents into{" "}
              <span className="hero-gradient-text">
                approved, verified fixes.
              </span>
            </h1>
            <p className="body-lead max-w-2xl">
              RePro reads the incident, reproduces the failure, verifies the
              fix, and stops at approval with receipts attached.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#workflow" className="block w-fit focus:outline-none">
              <GlassSurface
                variant="button"
                motionStrength={0.9}
                className="inline-flex px-5 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                <span className="flex items-center gap-2">
                  See flow
                  <ArrowRight className="size-4" />
                </span>
              </GlassSurface>
            </a>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-fit focus:outline-none"
              aria-label="View the GitHub repository"
            >
              <GlassSurface
                variant="pill"
                motionStrength={0.7}
                className="inline-flex px-5 py-3.5 text-sm font-medium text-foreground"
              >
                <span className="flex items-center gap-2">
                  View GitHub
                  <ArrowRight className="size-4" />
                </span>
              </GlassSurface>
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {heroFacts.map((fact) => (
              <GlassSurface
                key={fact.label}
                variant="quiet-panel"
                motionStrength={0.6}
                className="p-4"
              >
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                  {fact.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {fact.value}
                </p>
              </GlassSurface>
            ))}
          </div>
        </div>

        <div className="relative">
          <GlassSurface
            variant="hero-panel"
            motionStrength={1.1}
            className="min-h-[34rem] p-6 md:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Live run state</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Run `r_8xK2m` is paused for approval.
                </h2>
              </div>
              <Badge className="gap-2 pr-3">
                <ShieldCheck className="size-3" />
                policy locked
              </Badge>
            </div>

            <div className="mt-7 space-y-4">
              {runMoments.map((moment, index) => {
                const Icon = moment.icon;
                return (
                  <div
                    key={moment.label}
                    className="flex items-start gap-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/[0.07] text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium text-foreground">
                          {moment.label}
                        </p>
                        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          {moment.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {moment.detail}
                      </p>
                    </div>
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-emerald-300">
                      {index < 3 ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <Clock3 className="size-3.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <GlassSurface
                variant="quiet-panel"
                motionStrength={0.55}
                className="p-4"
              >
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                  Patch confidence
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  91/100
                </p>
              </GlassSurface>
              <GlassSurface
                variant="quiet-panel"
                motionStrength={0.55}
                className="p-4"
              >
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                  Verification
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  47 passed
                </p>
              </GlassSurface>
              <GlassSurface
                variant="quiet-panel"
                motionStrength={0.55}
                className="p-4"
              >
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                  Diff footprint
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  +18 / -4
                </p>
              </GlassSurface>
            </div>
          </GlassSurface>

          <GlassSurface
            variant="card"
            motionStrength={0.75}
            className="absolute -bottom-8 right-4 hidden max-w-[16rem] p-4 lg:block"
          >
            <p className="section-kicker">Receipt package</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>run.started</span>
                <CheckCircle2 className="size-4 text-emerald-300" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>verification.completed</span>
                <CheckCircle2 className="size-4 text-emerald-300" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>approval.requested</span>
                <Clock3 className="size-4 text-primary" />
              </div>
            </div>
          </GlassSurface>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {proofStrip.map((item) => (
          <GlassSurface
            key={item.label}
            variant="quiet-panel"
            motionStrength={0.65}
            className="p-4"
          >
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {item.description}
            </p>
          </GlassSurface>
        ))}
      </div>
    </section>
  );
}
