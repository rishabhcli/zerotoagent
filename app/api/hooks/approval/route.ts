import { resumeHook } from "workflow/api";
import { z } from "zod";
import { getRequestSession, getSessionUserId, sessionHasAnyRole } from "@/lib/auth";
import { ApprovalDecisionSchema } from "@/lib/patchpilot/contracts";
import { redactUnknown } from "@/lib/patchpilot/redaction";

const ApprovalHookPayloadSchema = ApprovalDecisionSchema.extend({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ApprovalHookPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Invalid approval hook payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, approved, comment } = parsed.data;
  const internalSecret = process.env.PATCHPILOT_HOOK_SECRET;
  const providedSecret = request.headers.get("x-patchpilot-hook-secret");
  const session = await getRequestSession(request.headers, { allowDemo: true });
  const allowedBySecret = Boolean(internalSecret && providedSecret === internalSecret);

  if (!allowedBySecret && !sessionHasAnyRole(session, ["approver", "admin"])) {
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
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    await supabase
      .from("approvals")
      .update({
        resolved_at: new Date().toISOString(),
        approved,
        comment: comment ?? null,
        resolved_by_user_id: allowedBySecret ? null : getSessionUserId(session),
        decision_summary: redactUnknown({ approved, comment: comment ?? null }),
      })
      .eq("token", token);
  }

  return Response.json({ ok: true });
}
