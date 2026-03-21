import { resumeHook } from "workflow/api";

export async function POST(request: Request) {
  const { token, approved, comment } = await request.json();

  if (!token || typeof approved !== "boolean") {
    return Response.json(
      { ok: false, message: "token and approved (boolean) are required" },
      { status: 400 }
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
      })
      .eq("token", token);
  }

  return Response.json({ ok: true });
}
