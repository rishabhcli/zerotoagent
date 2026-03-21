import {
  AudioLines,
  Eye,
  Lock,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassSurface } from "@/components/ui/glass-surface";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Eye,
    title: "Evidence, not vibes",
    description:
      "Artifacts, diff, approval state, and CI stay in one trace.",
    detail: "run events • artifacts • receipts",
    className: "lg:col-span-2 lg:row-span-2",
    variant: "hero-panel" as const,
  },
  {
    icon: Lock,
    title: "Sandboxed execution",
    description: "Reproduce and verify before any PR exists.",
    detail: "sandbox.created",
    className: "",
    variant: "card" as const,
  },
  {
    icon: Shield,
    title: "Repo-scoped policy",
    description: "Allowed repos, domains, and commands stay visible.",
    detail: "repo.policy_resolved",
    className: "",
    variant: "quiet-panel" as const,
  },
  {
    icon: AudioLines,
    title: "Voice to trace handoff",
    description: "Voice intake lands in the same run model.",
    detail: "voice • web trace",
    className: "lg:col-span-2",
    variant: "card" as const,
  },
  {
    icon: Zap,
    title: "Fast when it’s obvious",
    description: "Clear incidents move in minutes.",
    detail: "median 4 min",
    className: "",
    variant: "quiet-panel" as const,
  },
  {
    icon: Sparkles,
    title: "Human approval before output",
    description: "Automation works. People release the code.",
    detail: "approval.requested",
    className: "",
    variant: "quiet-panel" as const,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="home-section">
      <div className="mb-12 max-w-3xl space-y-4">
        <p className="section-kicker">Capabilities</p>
        <h2 className="display-section text-foreground">
          Calm surfaces. Clear proof.
        </h2>
        <p className="body-lead max-w-2xl">
          The landing page and app shell now share one material language.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <GlassSurface
              key={feature.title}
              variant={feature.variant}
              motionStrength={feature.variant === "hero-panel" ? 0.95 : 0.68}
              className={cn("p-5 md:p-6", feature.className)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-12 items-center justify-center rounded-[1.15rem] bg-white/[0.08] text-primary">
                  <Icon className="size-5" />
                </div>
                <Badge variant="outline">{feature.detail}</Badge>
              </div>

              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 max-w-[34rem] text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </GlassSurface>
          );
        })}
      </div>
    </section>
  );
}
