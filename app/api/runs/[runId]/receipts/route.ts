import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      { ok: false, message: "Supabase is not configured" },
      { status: 503 }
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
