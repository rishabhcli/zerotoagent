import { resumeHook } from "workflow/api";
import { ApprovalDecisionSchema } from "@/lib/patchpilot/contracts";
import { getRequestSession, getSessionUserId, sessionHasAnyRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import { redactUnknown } from "@/lib/patchpilot/redaction";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const session = await getRequestSession(request.headers, { allowDemo: true });

  if (!session) {
    return Response.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  if (!sessionHasAnyRole(session, ["approver", "admin"])) {
    return Response.json(
      { ok: false, message: "Approver or admin role required" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = ApprovalDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Invalid approval payload" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(
      { ok: false, message: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data: approval, error } = await supabase
    .from("approvals")
    .select("token")
    .eq("run_id", runId)
    .is("resolved_at", null)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !approval?.token) {
    return Response.json(
      { ok: false, message: error?.message ?? `No pending approval found for ${runId}` },
      { status: 404 }
    );
  }

  await resumeHook(approval.token, parsed.data);

  await supabase
    .from("approvals")
    .update(
      redactUnknown({
        resolved_at: new Date().toISOString(),
        approved: parsed.data.approved,
        comment: parsed.data.comment ?? null,
        resolved_by_user_id: getSessionUserId(session),
        decision_summary: parsed.data,
      })
    )
    .eq("token", approval.token);

  return Response.json({ ok: true });
}
