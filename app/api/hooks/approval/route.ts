import { resumeHook } from "workflow/api";
import { getAuthSession, getSessionRole } from "@/lib/auth";
import { redactUnknown } from "@/lib/patchpilot/redaction";

export async function POST(request: Request) {
  const { token, approved, comment } = await request.json();

  if (!token || typeof approved !== "boolean") {
    return Response.json(
      { ok: false, message: "token and approved (boolean) are required" },
      { status: 400 }
    );
  }

  const internalSecret = process.env.PATCHPILOT_HOOK_SECRET;
  const providedSecret = request.headers.get("x-patchpilot-hook-secret");
  const session = await getAuthSession(request.headers);
  const role = session ? getSessionRole(session) : request.headers.get("x-patchpilot-role");
  const allowedBySecret = Boolean(internalSecret && providedSecret === internalSecret);

  if (!allowedBySecret && role !== "approver" && role !== "admin") {
    return Response.json(
      { ok: false, message: "Approval hook requires an approver/admin or internal hook secret" },
      { status: 403 }
    );
  }

  await resumeHook(token, { approved, comment });

  // Also update the approvals table in Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    await supabase
      .from("approvals")
      .update({
        resolved_at: new Date().toISOString(),
        approved,
        comment: comment ?? null,
        resolved_by_user_id:
          session?.user?.id ?? request.headers.get("x-patchpilot-user-id") ?? null,
        decision_summary: redactUnknown({ approved, comment: comment ?? null }),
      })
      .eq("token", token);
  }

  return Response.json({ ok: true });
}
