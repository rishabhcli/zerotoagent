"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import {
  Activity,
  Plus,
  BookOpen,
  Shield,
  Mic,
  LogOut,
  Sparkles,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Runs", icon: Activity },
  { href: "/dashboard/new", label: "New Run", icon: Plus },
  { href: "/dashboard/recipes", label: "Recipes", icon: BookOpen },
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
  { href: "/voice", label: "Voice", icon: Mic },
];

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: NavItem & { isActive: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-[16px] transition-all duration-200 group ${
        isActive
          ? "liquid-glass-active text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}

function UserSection({
  name,
  email,
  image,
  role,
}: {
  name: string;
  email: string;
  image?: string | null;
  role: string;
}) {
  return (
    <div className="mt-auto pt-6 border-t border-white/[0.08]">
      <div className="flex items-center gap-3 px-2 mb-4">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-10 h-10 rounded-full border border-white/[0.1]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-white/[0.1] flex items-center justify-center text-sm font-bold text-primary">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground capitalize">{role}</p>
        </div>
      </div>
      <button
        onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
        className="flex w-full items-center gap-3 px-4 py-2.5 rounded-[14px] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="liquid-glass px-2 py-2 flex items-center gap-1">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`p-3 rounded-[14px] transition-all ${
                isActive
                  ? "liquid-glass-active"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Mock user for now - in production this would come from props or context
  const user = {
    name: "User",
    email: "user@example.com",
    role: "operator",
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] liquid-glass rounded-r-[24px] flex-col z-50">
        {/* Logo */}
        <div className="p-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[14px] bg-primary/20 border border-white/[0.1]">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-gradient">
                PatchPilot
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                ALPHA
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4">
          <UserSection {...user} />
        </div>
      </aside>

      {/* Mobile Tab Bar */}
      <MobileTabBar pathname={pathname} />

      {/* Main Content */}
      <main className="flex-1 md:ml-[260px] min-h-screen">
        <div className="container max-w-screen-2xl py-6 px-4 md:px-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}
