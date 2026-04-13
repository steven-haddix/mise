import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { GREETING_MESSAGE } from "../lib/greeting.js";

const conversationsRoutes = new Hono();

conversationsRoutes.use("/*", requireAuth);

// POST /conversations — create a new conversation seeded with the greeting
conversationsRoutes.post("/conversations", async (c) => {
  const user = c.get("user") as { id: string };

  const [convo] = await db
    .insert(conversations)
    .values({ userId: user.id })
    .returning();

  const [greeting] = await db
    .insert(messages)
    .values({
      conversationId: convo.id,
      role: "assistant",
      content: GREETING_MESSAGE,
      toolCalls: null,
    })
    .returning();

  return c.json({ conversationId: convo.id, messages: [greeting] }, 201);
});

// PATCH /conversations/:conversationId/messages/:messageId — update toolCalls state
conversationsRoutes.patch("/conversations/:conversationId/messages/:messageId", async (c) => {
  const user = c.get("user") as { id: string };
  const conversationId = c.req.param("conversationId");
  const messageId = c.req.param("messageId");
  const body = await c.req.json<{ proposalState: "confirmed" | "superseded"; createdCookId?: string }>();

  if (body.proposalState !== "confirmed" && body.proposalState !== "superseded") {
    return c.json({ error: "Invalid proposalState" }, 400);
  }

  const convo = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!convo || convo.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }

  const msg = await db.query.messages.findFirst({
    where: and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)),
  });
  if (!msg) {
    return c.json({ error: "Message not found" }, 404);
  }

  // toolCalls is a jsonb array; find the propose_plan entry and update its output.
  const existing = Array.isArray(msg.toolCalls) ? (msg.toolCalls as any[]) : [];
  const updated = existing.map((entry) => {
    if (entry && typeof entry === "object" && entry.toolName === "propose_plan" && entry.output) {
      return {
        ...entry,
        output: {
          ...entry.output,
          state: body.proposalState,
          createdCookId: body.createdCookId ?? entry.output.createdCookId ?? null,
        },
      };
    }
    return entry;
  });

  await db.update(messages).set({ toolCalls: updated }).where(eq(messages.id, messageId));

  return c.json({ ok: true });
});

export default conversationsRoutes;
