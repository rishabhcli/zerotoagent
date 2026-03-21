import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center gap-6">
          <Link href="/dashboard" className="font-bold">
            PatchPilot
          </Link>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            alpha
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Runs
            </Link>
            <Link
              href="/dashboard/recipes"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Recipes
            </Link>
            <Link
              href="/dashboard/admin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin
            </Link>
            <Link
              href="/voice"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Voice
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container max-w-screen-2xl py-6">
        {children}
      </main>
    </div>
  );
}
