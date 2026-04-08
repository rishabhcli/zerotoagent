"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  LogOut,
  Mic,
  Plus,
  Shield,
  Sparkles,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import type { DashboardNavItem, DashboardUser } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const navIcons = {
  activity: Activity,
  "book-open": BookOpen,
  mic: Mic,
  plus: Plus,
  shield: Shield,
} as const;

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavItem({
  href,
  label,
  icon,
  isActive,
}: DashboardNavItem & { isActive: boolean }) {
  const Icon = navIcons[icon];

  return (
    <Link href={href} prefetch={false} className="block focus:outline-none">
      <GlassSurface
        variant={isActive ? "pill" : "quiet-panel"}
        motionStrength={0.4}
        className="px-3 py-2.5"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-white/[0.08]",
              isActive
                ? "bg-white/[0.1] text-primary"
                : "bg-white/[0.04] text-muted-foreground"
            )}
          >
            <Icon className="size-4" />
          </div>
          <p
            className={cn(
              "text-sm font-medium",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </p>
        </div>
      </GlassSurface>
    </Link>
  );
}

function UserSection({ name, email, image, role }: DashboardUser) {
  return (
    <GlassSurface variant="quiet-panel" motionStrength={0.32} className="p-4">
      <div className="flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt={name}
            className="size-11 rounded-full border border-white/[0.12]"
          />
        ) : (
          <div className="flex size-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.08] text-sm font-semibold text-primary">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span>role</span>
        <span className="font-medium text-foreground">{role}</span>
      </div>

      <Button
        variant="ghost"
        className="mt-4 w-full justify-start"
        onClick={() =>
          signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.href = "/";
              },
            },
          })
        }
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </GlassSurface>
  );
}

function MobileTabBar({
  pathname,
  navItems,
}: {
  pathname: string;
  navItems: DashboardNavItem[];
}) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4 md:hidden">
      <GlassSurface
        variant="nav"
        motionStrength={0.35}
        className="mx-auto flex max-w-sm items-center justify-between gap-2 px-2 py-2"
      >
        {navItems.map(({ href, icon, label }) => {
          const Icon = navIcons[icon];
          const isActive = isNavItemActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="block focus:outline-none"
            >
              <GlassSurface
                variant={isActive ? "pill" : "quiet-panel"}
                motionStrength={0.28}
                className="px-2 py-2"
              >
                <div className="flex items-center gap-2 px-1">
                  <Icon
                    className={cn(
                      "size-4",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              </GlassSurface>
            </Link>
          );
        })}
      </GlassSurface>
    </div>
  );
}

export function DashboardShell({
  children,
  navItems,
  user,
}: Readonly<{
  children: React.ReactNode;
  navItems: DashboardNavItem[];
  user: DashboardUser;
}>) {
  const pathname = usePathname();

  return (
    <div className="page-shell">
      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-[284px] md:block">
        <GlassSurface
          variant="hero-panel"
          motionStrength={0.4}
          className="flex h-full flex-col p-4"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-white/[0.08] text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                RePro
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                {...item}
                isActive={isNavItemActive(pathname, item.href)}
              />
            ))}
          </div>

          <div className="mt-auto pt-4">
            <UserSection {...user} />
          </div>
        </GlassSurface>
      </aside>

      <MobileTabBar pathname={pathname} navItems={navItems} />

      <main className="min-h-screen pb-28 md:pl-[316px] md:pb-8">
        <div className="content-shell pt-4 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
