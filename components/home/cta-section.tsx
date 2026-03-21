import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-4xl px-6 py-24 md:py-32">
      <div className="relative overflow-hidden rounded-[32px] liquid-glass p-12 md:p-16 text-center animate-fade-in-up">
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />

        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Ready to ship fixes faster?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            Connect your GitHub repos and let PatchPilot handle the rest.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <button
              type="button"
              className="group flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
