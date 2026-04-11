import { Hono } from "hono";
import { streamText } from "ai";
import { stream } from "hono/streaming";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { model, SYSTEM_PROMPT, createAITools } from "../lib/ai.js";

const chatRoutes = new Hono();

chatRoutes.use("/*", requireAuth);

// POST /chat — send a message, get a streaming AI response
chatRoutes.post("/chat", async (c) => {
  const user = c.get("user") as { id: string };
  const body = await c.req.json<{
    message: string;
    conversationId?: string;
    targetTime?: string;
  }>();

  let conversationId = body.conversationId;

  // Create new conversation if none provided
  if (!conversationId) {
    const [convo] = await db
      .insert(conversations)
      .values({ userId: user.id })
      .returning();
    conversationId = convo.id;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: body.message,
  });

  // Load conversation history
  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
  });

  // Build messages for AI
  const aiMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Add target time context to system prompt if provided
  let systemPrompt = SYSTEM_PROMPT;
  if (body.targetTime) {
    systemPrompt += `\n\nThe user wants to eat/serve by: ${body.targetTime}. Use this as the target time for backward-calculating the schedule. The current time is: ${new Date().toISOString()}.`;
  } else {
    systemPrompt += `\n\nThe current time is: ${new Date().toISOString()}.`;
  }

  const tools = createAITools(user.id, conversationId);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: aiMessages,
    tools,
    maxSteps: 3,
    onFinish: async ({ text, toolCalls }) => {
      // Save assistant message
      await db.insert(messages).values({
        conversationId: conversationId!,
        role: "assistant",
        content: text,
        toolCalls: toolCalls?.length ? toolCalls : null,
      });

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId!));
    },
  });

  // Stream the response
  c.header("Content-Type", "text/event-stream");
  c.header("X-Conversation-Id", conversationId);

  return stream(c, async (s) => {
    const reader = result.textStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await s.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  });
});

// GET /conversations — list user's conversations
chatRoutes.get("/conversations", async (c) => {
  const user = c.get("user") as { id: string };

  const convos = await db.query.conversations.findMany({
    where: eq(conversations.userId, user.id),
    orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
  });

  return c.json(convos);
});

// GET /conversations/:id — get conversation with messages
chatRoutes.get("/conversations/:id", async (c) => {
  const user = c.get("user") as { id: string };
  const id = c.req.param("id");

  const convo = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: { messages: { orderBy: [asc(messages.createdAt)] } },
  });

  if (!convo || convo.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(convo);
});

export default chatRoutes;
