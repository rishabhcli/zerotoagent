import {
  Lock,
  Zap,
  Eye,
  GitBranch,
  Shield,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant triage",
    description:
      "AI parses stack traces, logs, and issue context to pinpoint root cause in seconds.",
  },
  {
    icon: Lock,
    title: "Sandboxed execution",
    description:
      "Every reproduction and fix runs in an isolated environment. Your infra stays untouched.",
  },
  {
    icon: Eye,
    title: "Full observability",
    description:
      "Every step emits structured events. Inspect the full trace from diagnosis to PR.",
  },
  {
    icon: Shield,
    title: "Approval-gated",
    description:
      "No PR is opened without your explicit sign-off. You stay in control.",
  },
  {
    icon: GitBranch,
    title: "Repo-scoped policies",
    description:
      "Define which repositories PatchPilot can operate on with fine-grained access rules.",
  },
  {
    icon: Clock,
    title: "Median fix time: 4 min",
    description:
      "From incident to verified patch in minutes, not hours. Ship fixes while you sleep.",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="mb-16 text-center animate-fade-in-up">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
          Why PatchPilot
        </p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Built for production teams
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-3xl liquid-glass p-7 transition-all duration-300 hover:bg-white/[0.12] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-fade-in-up"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/[0.08] transition-colors group-hover:bg-primary/20">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
