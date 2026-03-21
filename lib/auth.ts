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
        if (!token.accessToken) return null as any;
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
        const user = await userRes.json();
        const emails = await emailsRes.json();
        const primaryEmail = Array.isArray(emails)
          ? emails.find((e: { primary?: boolean }) => e.primary)?.email ?? emails[0]?.email
          : null;
        return {
          user: {
            id: String(user.id),
            name: user.name ?? user.login,
            email: user.email ?? primaryEmail ?? `${user.id}+${user.login}@users.noreply.github.com`,
            image: user.avatar_url,
            emailVerified: true,
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
  session:
    | {
        user?: (Record<string, unknown> & { role?: string | null }) | null;
      }
    | null
    | undefined
): ReProRole {
  const role = session?.user?.role;
  if (role === "operator" || role === "approver" || role === "admin" || role === "viewer") {
    return role;
  }
  return "viewer";
}
