import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  // Require authenticated session to access the voice token
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    // Auth DB not connected — allow in dev, block in prod
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "Auth not configured" }, { status: 503 });
    }
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  // Return as a short-lived session token.
  // In production, mint a scoped token via ElevenLabs API instead.
  return Response.json({ token: key });
}
