import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-20 md:pt-44 md:pb-28">
      {/* Animated badge */}
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="relative flex items-center gap-2 rounded-full liquid-glass-subtle px-5 py-2 text-xs font-medium text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Autonomous incident resolution
        </div>
      </div>

      {/* Headline */}
      <h1
        className="max-w-4xl text-center text-5xl font-semibold leading-[1.08] tracking-tight md:text-7xl lg:text-8xl animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <span className="block">From incident to</span>
        <span className="relative inline-block">
          <span className="hero-gradient-text">verified fix</span>
          <span className="absolute -bottom-2 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-primary via-indigo-400 to-purple-400 animate-scale-x-in" />
        </span>
      </h1>

      {/* Subheadline */}
      <p
        className="mt-8 max-w-xl text-center text-lg leading-relaxed text-muted-foreground md:text-xl animate-fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        PatchPilot diagnoses, reproduces, patches, and verifies&mdash;then
        waits for your approval before opening a PR.
      </p>

      {/* CTA buttons */}
      <div
        className="mt-10 flex items-center gap-4 animate-fade-in-up"
        style={{ animationDelay: "0.55s" }}
      >
        <a
          href="#workflow"
          className="group relative flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="size-4" />
          See how it works
          <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full liquid-glass-subtle px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/[0.1] hover:scale-[1.02] active:scale-[0.98]"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
