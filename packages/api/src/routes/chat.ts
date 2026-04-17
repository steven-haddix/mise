import { Hono } from "hono";
import { streamText } from "ai";
import { stream } from "hono/streaming";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { model, SYSTEM_PROMPT, createAITools } from "../lib/ai.js";
import { buildActiveCooksContext } from "../lib/active-cooks-context.js";

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
    const [convo] = await db.insert(conversations).values({ userId: user.id }).returning();
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

  const activeCooksBlock = await buildActiveCooksContext(user.id);
  let systemPrompt = SYSTEM_PROMPT + activeCooksBlock;
  if (body.targetTime) {
    systemPrompt += `\n\nThe user wants to eat/serve by: ${body.targetTime}. Use this as the target time for backward-calculating the schedule. The current time is: ${new Date().toISOString()}.`;
  } else {
    systemPrompt += `\n\nThe current time is: ${new Date().toISOString()}.`;
  }

  const tools = createAITools();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: aiMessages,
    tools,
    maxSteps: 3,
    onFinish: async ({ text, toolCalls, toolResults }) => {
      // Shape the tool-call array we persist. For propose_plan, flatten the output onto the entry.
      // AI SDK v6 uses `input` on TypedToolCall and exposes tool outputs via a separate
      // `toolResults` array keyed by toolCallId.
      const resultsById = new Map<string, any>();
      for (const r of (toolResults ?? []) as any[]) {
        resultsById.set(r.toolCallId, r.output ?? null);
      }
      const persistedToolCalls = toolCalls?.length
        ? toolCalls.map((t: any) => ({
            toolName: t.toolName,
            toolCallId: t.toolCallId,
            args: t.input ?? t.args ?? null,
            output: resultsById.get(t.toolCallId) ?? t.output ?? t.result ?? null,
          }))
        : null;

      // Save assistant message
      const [saved] = await db
        .insert(messages)
        .values({
          conversationId: conversationId!,
          role: "assistant",
          content: text,
          toolCalls: persistedToolCalls,
        })
        .returning();

      // If this message contains a new active propose_plan, supersede all earlier active ones.
      const hasNewActiveProposal = persistedToolCalls?.some(
        (t) => t.toolName === "propose_plan" && t.output?.state === "active",
      );
      if (hasNewActiveProposal) {
        const earlier = await db.query.messages.findMany({
          where: eq(messages.conversationId, conversationId!),
        });
        for (const m of earlier) {
          if (m.id === saved.id) continue;
          const tc = Array.isArray(m.toolCalls) ? (m.toolCalls as any[]) : [];
          let changed = false;
          const next = tc.map((entry) => {
            if (entry?.toolName === "propose_plan" && entry?.output?.state === "active") {
              changed = true;
              return { ...entry, output: { ...entry.output, state: "superseded" } };
            }
            return entry;
          });
          if (changed) {
            await db.update(messages).set({ toolCalls: next }).where(eq(messages.id, m.id));
          }
        }
      }

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
