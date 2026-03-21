import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthSession, getSessionRole, type ReProRole } from "@/lib/auth";

type DemoSession = {
  user: {
    id: string;
    email?: string;
    role: ReProRole;
  };
};

async function getDemoOrAuthSession() {
  const headersList = await headers();
  const authSession = await getAuthSession(headersList);
  if (authSession) {
    return authSession;
  }

  const demoRoleHeader = headersList.get("x-patchpilot-role");
  const demoRoleEnv = process.env.PATCHPILOT_DEMO_ROLE;
  const demoRole = demoRoleHeader ?? demoRoleEnv;

  if (
    demoRole === "viewer" ||
    demoRole === "operator" ||
    demoRole === "approver" ||
    demoRole === "admin"
  ) {
    return {
      user: {
        id: headersList.get("x-patchpilot-user-id") ?? "demo-user",
        email: "demo@patchpilot.local",
        role: demoRole,
      },
    } satisfies DemoSession;
  }

  return null;
}

/**
 * Check if the user has an active session. Redirects to /api/auth/signin if not.
 * Returns the session if authenticated.
 *
 * In development without POSTGRES_URL, skips auth to allow local testing.
 */
export async function requireAuth() {
  const session = await getDemoOrAuthSession();

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

  if (getSessionRole(session) !== "admin") {
    redirect("/dashboard");
  }

  return session;
}

export async function requireApprover() {
  const session = await requireAuth();

  if (!session) return null;

  const role = getSessionRole(session);
  if (role !== "approver" && role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}
