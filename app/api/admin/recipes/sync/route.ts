import { getRequestSession, sessionHasAnyRole } from "@/lib/auth";
import { syncGitHubInstallationRecipes } from "@/lib/patchpilot/repo-sync";

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers, { allowDemo: true });
  if (!session) {
    return Response.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  if (!sessionHasAnyRole(session, ["admin"])) {
    return Response.json({ ok: false, message: "Admin role required" }, { status: 403 });
  }

  try {
    const summary = await syncGitHubInstallationRecipes();
    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
