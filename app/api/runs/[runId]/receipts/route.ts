import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import { getRequestSession, getSessionUserId, sessionHasAnyRole } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const session = await getRequestSession(request.headers, { allowDemo: true });
  if (!session) {
    return Response.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      { ok: false, message: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data: run } = await supabase
    .from("runs")
    .select("created_by_user_id")
    .eq("id", runId)
    .maybeSingle();

  if (
    run?.created_by_user_id &&
    run.created_by_user_id !== getSessionUserId(session) &&
    !sessionHasAnyRole(session, ["approver", "admin"])
  ) {
    return Response.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  if (!run?.created_by_user_id && !sessionHasAnyRole(session, ["approver", "admin"])) {
    return Response.json(
      { ok: false, message: "Only approvers or admins can download legacy receipts" },
      { status: 403 }
    );
  }

  const { data } = await supabase
    .from("receipt_packages")
    .select("storage_path")
    .eq("run_id", runId)
    .maybeSingle();

  if (!data?.storage_path) {
    return Response.json(
      { ok: false, message: `No receipt package found for ${runId}` },
      { status: 404 }
    );
  }

  const signed = await supabase.storage
    .from("patchpilot-receipts")
    .createSignedUrl(data.storage_path, 60 * 10);

  if (signed.error || !signed.data) {
    return Response.json(
      { ok: false, message: signed.error?.message ?? "Unable to sign receipt archive" },
      { status: 500 }
    );
  }

  return Response.redirect(signed.data.signedUrl, 302);
}
