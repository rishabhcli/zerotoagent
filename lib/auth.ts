import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { githubOAuthScopes } from "@/lib/github-auth";

const statement = {
  run: ["start", "view"],
  approval: ["resolve"],
  pr: ["create"],
  policy: ["view", "manage"],
} as const;

const ac = createAccessControl(statement);

export const roles = {
  viewer: ac.newRole({ run: ["view"] }),
  operator: ac.newRole({
    run: ["start", "view"],
  }),
  approver: ac.newRole({
    run: ["start", "view"],
    approval: ["resolve"],
    pr: ["create"],
  }),
  admin: ac.newRole({
    run: ["start", "view"],
    approval: ["resolve"],
    pr: ["create"],
    policy: ["view", "manage"],
  }),
};

export type ReProRole = keyof typeof roles;

type SessionLike =
  | {
      user?: (Record<string, unknown> & {
        id?: string | null;
        email?: string | null;
        name?: string | null;
        image?: string | null;
        role?: string | null;
      }) | null;
    }
  | null
  | undefined;

export type DemoSession = {
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string | null;
    role: ReProRole;
  };
};

type GitHubUserResponse = {
  id: string | number;
  login?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type GitHubEmailResponse = {
  email?: string | null;
  primary?: boolean;
};

export function isAuthConfigured() {
  return Boolean(process.env.POSTGRES_URL && process.env.BETTER_AUTH_SECRET);
}

function getGitHubSocialProviders() {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return undefined;
  }

  return {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: [...githubOAuthScopes],
      redirectURI: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/callback/github`,
      // Fetch email from GitHub API when profile email is private
      async getUserInfo(token: { accessToken?: string }) {
        if (!token.accessToken) return null;
        const [userRes, emailsRes] = await Promise.all([
          fetch("https://api.github.com/user", {
            headers: { 
              Authorization: `Bearer ${token.accessToken}`,
              "User-Agent": "better-auth",
            },
          }),
          fetch("https://api.github.com/user/emails", {
            headers: { 
              Authorization: `Bearer ${token.accessToken}`,
              "User-Agent": "better-auth",
            },
          }),
        ]);
        if (!userRes.ok || !emailsRes.ok) {
          return null;
        }
        const user = (await userRes.json()) as GitHubUserResponse;
        const emails = (await emailsRes.json()) as unknown;
        const primaryEmail = Array.isArray(emails)
          ? (emails as GitHubEmailResponse[]).find((email) => email.primary)?.email ??
            (emails as GitHubEmailResponse[])[0]?.email
          : null;
        return {
          user: {
            id: String(user.id),
            name: user.name ?? user.login ?? undefined,
            email: user.email ?? primaryEmail ?? `${user.id}+${user.login}@users.noreply.github.com`,
            image: user.avatar_url ?? undefined,
            emailVerified: true,
          },
          data: {
            user,
            emails,
          },
        };
      },
    },
  };
}

function createAuth() {
  return betterAuth({
    baseURL:
      process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    // Better Auth needs a pg.Pool instance when using the Supabase pooler.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    database: new (require("pg").Pool)({
      connectionString: process.env.POSTGRES_URL?.replace("?sslmode=require", ""),
      ssl: { rejectUnauthorized: false },
    }),
    socialProviders: getGitHubSocialProviders(),
    plugins: [
      adminPlugin({
        ac,
        roles,
        defaultRole: "viewer",
        adminRoles: ["admin"],
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

export function getAuth(): ReturnType<typeof createAuth> {
  if (!isAuthConfigured()) {
    throw new Error("Auth is not configured");
  }

  if (authInstance) {
    return authInstance;
  }

  authInstance = createAuth();

  return authInstance;
}

export async function getAuthSession(headers: Headers) {
  if (!isAuthConfigured()) {
    return null;
  }

  try {
    return await getAuth().api.getSession({ headers });
  } catch {
    return null;
  }
}

export function getSessionRole(
  session: SessionLike
): ReProRole {
  const role = session?.user?.role;
  if (role === "operator" || role === "approver" || role === "admin" || role === "viewer") {
    return role;
  }
  return "viewer";
}

export function isReProRole(value: unknown): value is ReProRole {
  return value === "viewer" || value === "operator" || value === "approver" || value === "admin";
}

export function isDemoAuthEnabled() {
  return process.env.NODE_ENV !== "production" && isReProRole(process.env.PATCHPILOT_DEMO_ROLE);
}

export function getDemoSession(): DemoSession | null {
  if (!isDemoAuthEnabled()) {
    return null;
  }

  return {
    user: {
      id: "demo-user",
      email: "demo@patchpilot.local",
      role: process.env.PATCHPILOT_DEMO_ROLE as ReProRole,
    },
  };
}

export async function getRequestSession(
  requestHeaders: Headers,
  options: { allowDemo?: boolean } = {}
) {
  const authSession = await getAuthSession(requestHeaders);
  if (authSession) {
    return authSession;
  }

  if (options.allowDemo) {
    return getDemoSession();
  }

  return null;
}

export type RequestSession = NonNullable<Awaited<ReturnType<typeof getRequestSession>>>;

export function sessionHasAnyRole(
  session: SessionLike,
  allowedRoles: readonly ReProRole[]
) {
  return allowedRoles.includes(getSessionRole(session));
}

export function getSessionUserId(session: SessionLike) {
  const userId = session?.user?.id;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}
