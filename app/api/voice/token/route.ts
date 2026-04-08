import { getRequestSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers, { allowDemo: true });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  const allowInsecureDevToken =
    process.env.NODE_ENV !== "production" &&
    process.env.PATCHPILOT_ALLOW_INSECURE_VOICE_TOKEN === "1";

  if (!allowInsecureDevToken) {
    return Response.json(
      {
        error:
          "Voice transcription is disabled until a scoped ElevenLabs session token flow is configured",
      },
      { status: 503 }
    );
  }

  return Response.json({ token: key });
}
