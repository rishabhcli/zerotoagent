import { getAuth, isAuthConfigured } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

async function handleAuth(request: Request) {
  if (!isAuthConfigured()) {
    return Response.json(
      { ok: false, message: "Auth is not configured" },
      { status: 503 }
    );
  }

  const handler = toNextJsHandler(getAuth());
  if (request.method === "GET") {
    return handler.GET(request);
  }

  return handler.POST(request);
}

export async function GET(request: Request) {
  return handleAuth(request);
}

export async function POST(request: Request) {
  return handleAuth(request);
}
