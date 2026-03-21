import { Navbar } from "@/components/home/navbar";
import { HeroSection } from "@/components/home/hero-section";
import { WorkflowSection } from "@/components/home/workflow-section";
import { TerminalDemo } from "@/components/home/terminal-demo";
import { FeaturesSection } from "@/components/home/features-section";
import { CtaSection } from "@/components/home/cta-section";

export default async function Home() {
  const githubAuthEnabled = Boolean(
    process.env.POSTGRES_URL &&
      process.env.BETTER_AUTH_SECRET &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET
  );

  return (
    <main id="top" className="page-shell overflow-hidden">
      <Navbar githubAuthEnabled={githubAuthEnabled} />
      <HeroSection />
      <WorkflowSection />
      <TerminalDemo />
      <FeaturesSection />
      <CtaSection githubAuthEnabled={githubAuthEnabled} />

      <footer className="content-shell pb-10 pt-4 text-xs text-muted-foreground/70">
        <div className="border-t border-white/[0.08] pt-6 text-center">
          Built with RePro · Incident-to-PR verified fix agent
        </div>
      </footer>
    </main>
  );
}
