import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassSurface } from "@/components/ui/glass-surface";
import { GitHubSignInButton } from "@/components/home/github-sign-in-button";

export function CtaSection({
  githubAuthEnabled,
}: {
  githubAuthEnabled: boolean;
}) {
  return (
    <section className="home-section home-section-tight">
      <GlassSurface
        variant="hero-panel"
        motionStrength={0.82}
        className="overflow-hidden p-8 md:p-12"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <div className="space-y-5">
            <Badge variant="outline" className="gap-2 pr-3">
              <ShieldCheck className="size-3" />
              Approval before output
            </Badge>
            <h2 className="display-section max-w-3xl text-foreground">
              Connect the repo. Keep the gate. Ship with receipts.
            </h2>
            <p className="body-lead max-w-2xl">
              RePro handles intake to verification. Your team keeps the final
              decision.
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-sm sm:justify-self-end">
            <GitHubSignInButton enabled={githubAuthEnabled} />

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block focus:outline-none"
              aria-label="Star RePro on GitHub"
            >
              <GlassSurface
                variant="pill"
                motionStrength={0.66}
                className="inline-flex px-5 py-3.5 text-sm font-medium text-foreground"
              >
                <span className="flex items-center gap-2">
                  Star on GitHub
                  <ArrowRight className="size-4" />
                </span>
              </GlassSurface>
            </a>
          </div>
        </div>
      </GlassSurface>
    </section>
  );
}
