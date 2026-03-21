import { after } from "next/server";
import { getBot } from "@/lib/bot";

export async function POST(
  request: Request,
  context: { params: Promise<{ platform: string }> }
) {
  const { platform } = await context.params;

  const bot = getBot();
  const webhooks = bot!.webhooks as Record<
    string,
    (req: Request, opts: { waitUntil: (task: Promise<unknown>) => void }) => Promise<Response>
  >;

  const handler = webhooks[platform];
  if (!handler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  return handler(request, {
    waitUntil: (task: Promise<unknown>) => after(() => task),
  });
}
