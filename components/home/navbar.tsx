import { ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassSurface } from "@/components/ui/glass-surface";
import { GitHubSignInButton } from "@/components/home/github-sign-in-button";

const navItems = [
  { href: "#workflow", label: "Pipeline" },
  { href: "#evidence", label: "Evidence" },
  { href: "#features", label: "Capabilities" },
];

export function Navbar({ githubAuthEnabled }: { githubAuthEnabled: boolean }) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
      <GlassSurface
        variant="nav"
        motionStrength={0.45}
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-white/[0.08] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              RePro
            </p>
            <p className="truncate text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
              Incident to PR
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden md:inline-flex">
            <ShieldCheck className="size-3" />
            approval gated
          </Badge>
          <GitHubSignInButton enabled={githubAuthEnabled} />
        </div>
      </GlassSurface>
    </div>
  );
}
