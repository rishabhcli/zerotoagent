import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAuth } from "@/lib/auth-guard";
import { getDashboardNavItems, getDashboardUser } from "@/lib/dashboard-data";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuth();

  return (
    <DashboardShell
      navItems={getDashboardNavItems(session)}
      user={getDashboardUser(session)}
    >
      {children}
    </DashboardShell>
  );
}
