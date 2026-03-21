import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Github, Shield, Sparkles, Workflow } from "lucide-react";
import { GitHubSignInButton } from "@/components/home/github-sign-in-button";

async function getOptionalSession() {
  if (!process.env.POSTGRES_URL) return null;
  try {
    const requestHeaders = await headers();
    const { getAuthSession } = await import("@/lib/auth");
    return await getAuthSession(requestHeaders);
  } catch {
    return null;
  }
}

export default async function Home() {
  const session = await getOptionalSession();
  const githubAuthEnabled = Boolean(
    process.env.POSTGRES_URL &&
      process.env.BETTER_AUTH_SECRET &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET
  );

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Ambient background glows - reduced for glass clarity */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[120px]" />

      {/* Top bar */}
      <div className="pt-6 px-6 md:px-10 flex justify-center">
        <header className="relative z-10 flex w-full max-w-5xl items-center justify-between px-6 py-4 liquid-glass rounded-full">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full liquid-glass-subtle">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">PatchPilot</span>
          </div>

          <GitHubSignInButton enabled={githubAuthEnabled} />
        </header>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 mt-12">
        <div className="flex max-w-3xl flex-col items-center gap-8 text-center liquid-glass rounded-[32px] p-10 md:p-16">
          <div className="rounded-full liquid-glass-subtle px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Incident-to-PR verified fix agent
          </div>

          <h1 className="text-balance text-5xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
            From incident to
            <span className="text-primary"> verified fix</span>
            <br />in one workflow
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            PatchPilot diagnoses, reproduces, patches, and verifies — then waits for your approval before opening a PR.
          </p>

          {/* Feature row */}
          <div className="mt-4 grid w-full max-w-lg grid-cols-3 gap-4">
            {[
              { icon: Github, label: "Scoped repo access" },
              { icon: Shield, label: "Approval-gated PRs" },
              { icon: Workflow, label: "Full run trace" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2.5 liquid-glass-subtle rounded-[20px] px-4 py-5"
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
