import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getRequestSession, sessionHasAnyRole } from "@/lib/auth";

/**
 * Check if the user has an active session. Redirects to /api/auth/signin if not.
 * Returns the session if authenticated.
 *
 * In development, PATCHPILOT_DEMO_ROLE can be used as a local-only demo bypass.
 */
export async function requireAuth() {
  const headersList = await headers();
  const session = await getRequestSession(headersList, { allowDemo: true });

  if (!session) {
    redirect("/");
  }

  return session;
}

/**
 * Require admin role. Returns session or redirects.
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (!session) return null;

  if (!sessionHasAnyRole(session, ["admin"])) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireApprover() {
  const session = await requireAuth();

  if (!session) return null;

  if (!sessionHasAnyRole(session, ["approver", "admin"])) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireOperator() {
  const session = await requireAuth();

  if (!session) return null;

  if (!sessionHasAnyRole(session, ["operator", "approver", "admin"])) {
    redirect("/dashboard");
  }

  return session;
}
