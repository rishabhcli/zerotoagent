import { Sparkles } from "lucide-react";
import { GitHubSignInButton } from "@/components/home/github-sign-in-button";

export function Navbar({ githubAuthEnabled }: { githubAuthEnabled: boolean }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-6 pt-5 md:px-10 animate-fade-in-down">
      <header className="liquid-glass-nav flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.45),rgba(255,255,255,0.05)_36%,rgba(255,255,255,0)_72%)] opacity-80" />
        <span className="pointer-events-none absolute left-16 top-1/2 h-16 w-24 -translate-y-1/2 rounded-full bg-[conic-gradient(from_120deg_at_30%_30%,rgba(255,255,255,0.42),rgba(255,255,255,0)_68%,rgba(255,255,255,0.24),rgba(255,255,255,0))] opacity-35 blur-sm" />
        <span className="pointer-events-none absolute right-16 top-2 h-10 w-10 rounded-full bg-gradient-to-br from-white/55 via-white/22 to-transparent opacity-85 blur-sm" />
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            PatchPilot
          </span>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#workflow"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
        </nav>

        <GitHubSignInButton enabled={githubAuthEnabled} />
      </header>
    </div>
  );
}
