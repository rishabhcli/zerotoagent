import { resumeHook } from "workflow/api";
import { ApprovalDecisionSchema } from "@/lib/patchpilot/contracts";
import { getAuthSession, getSessionRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import { redactUnknown } from "@/lib/patchpilot/redaction";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const session = await getAuthSession(request.headers);
  const demoRole = request.headers.get("x-patchpilot-role");
  const role = session ? getSessionRole(session) : demoRole;

  if (role !== "approver" && role !== "admin") {
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

  const token = `approval:${runId}`;
  await resumeHook(token, parsed.data);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase
      .from("approvals")
      .update(
        redactUnknown({
          resolved_at: new Date().toISOString(),
          approved: parsed.data.approved,
          comment: parsed.data.comment ?? null,
          resolved_by_user_id:
            session?.user?.id ?? request.headers.get("x-patchpilot-user-id") ?? "demo-approver",
          decision_summary: parsed.data,
        })
      )
      .eq("token", token);
  }

  return Response.json({ ok: true });
}
