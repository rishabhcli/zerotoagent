import { Navbar } from "@/components/home/navbar";
import { HeroSection } from "@/components/home/hero-section";
import { WorkflowSection } from "@/components/home/workflow-section";
import { TerminalDemo } from "@/components/home/terminal-demo";
import { FeaturesSection } from "@/components/home/features-section";
import { CtaSection } from "@/components/home/cta-section";
import { FloatingOrbs } from "@/components/home/floating-orbs";

export default async function Home() {
  const githubAuthEnabled = Boolean(
    process.env.POSTGRES_URL &&
      process.env.BETTER_AUTH_SECRET &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <FloatingOrbs />
      <Navbar githubAuthEnabled={githubAuthEnabled} />
      <HeroSection />
      <WorkflowSection />
      <TerminalDemo />
      <div id="features">
        <FeaturesSection />
      </div>
      <CtaSection />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-xs text-muted-foreground/60">
        <p>Built with PatchPilot &middot; Incident-to-PR verified fix agent</p>
      </footer>
    </main>
  );
}
