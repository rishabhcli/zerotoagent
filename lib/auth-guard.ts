import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Check if the user has an active session. Redirects to /api/auth/signin if not.
 * Returns the session if authenticated.
 *
 * In development without POSTGRES_URL, skips auth to allow local testing.
 */
export async function requireAuth() {
  // Skip auth in dev if database is not configured
  if (!process.env.POSTGRES_URL) {
    return null;
  }

  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      redirect("/api/auth/signin");
    }

    return session;
  } catch {
    // Auth system not ready — allow access in dev, block in prod
    if (process.env.NODE_ENV === "production") {
      redirect("/api/auth/signin");
    }
    return null;
  }
}

/**
 * Require admin role. Returns session or redirects.
 */
export async function requireAdmin() {
  const session = await requireAuth();

  // In dev without DB, allow all access
  if (!session) return null;

  // Check role — Better Auth admin plugin stores role on user
  const user = session.user as { role?: string };
  if (user.role !== "admin" && user.role !== "maintainer") {
    redirect("/dashboard");
  }

  return session;
}
