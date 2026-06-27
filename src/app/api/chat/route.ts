import { getAuthUser } from "@/utils/supabase/auth";
import { createSSEStream } from "./sse";
import { runChat, type ChatBody } from "./chatHandler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.threadId || typeof body.threadId !== "string") {
    return new Response("threadId is required", { status: 400 });
  }

  const isFreshTurn = Array.isArray(body.messages) && body.messages.length > 0;
  const isResume = !!body.resume;
  if (!isFreshTurn && !isResume) {
    return new Response("Either `messages` or `resume` is required", { status: 400 });
  }

  return createSSEStream((send) => runChat(userId, body, send));
}
