import Link from "next/link";
import { headers } from "next/headers";
import { getAuthSession, getSessionRole } from "@/lib/auth";
import { UserMenu } from "@/components/dashboard/user-menu";

async function getUser() {
  try {
    const h = await headers();
    const session = await getAuthSession(h);
    if (!session?.user) return null;
    const user = session.user as { id: string; name?: string; email?: string; image?: string; role?: string };
    return {
      name: user.name ?? user.email ?? "User",
      email: user.email ?? "",
      image: user.image ?? null,
      role: getSessionRole(session),
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-4 z-50 mx-4 md:mx-auto max-w-5xl glass rounded-full px-6 py-2 mb-8 transition-all duration-300">
        <div className="flex h-12 items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-bold text-xl tracking-tight text-gradient">
              PatchPilot
            </Link>
            <span className="rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] uppercase font-bold text-primary">
              ALPHA
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-all">
              Runs
            </Link>
            <Link href="/dashboard/recipes" className="text-muted-foreground hover:text-foreground transition-all">
              Recipes
            </Link>
            <Link href="/dashboard/admin" className="text-muted-foreground hover:text-foreground transition-all">
              Admin
            </Link>
            <Link href="/voice" className="text-muted-foreground hover:text-foreground transition-all">
              Voice
            </Link>
            {user ? (
              <UserMenu
                name={user.name}
                email={user.email}
                image={user.image}
                role={user.role}
              />
            ) : (
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-all">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 container max-w-screen-2xl py-6">
        {children}
      </main>
    </div>
  );
}
