import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { pushTokens } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const pushRoutes = new Hono();

pushRoutes.use("/*", requireAuth);

// POST /push-tokens — register a push token
pushRoutes.post("/push-tokens", async (c) => {
  const user = c.get("user") as { id: string };
  const body = await c.req.json<{ token: string; deviceId: string }>();

  // Upsert: if device already registered, update the token
  await db
    .insert(pushTokens)
    .values({
      userId: user.id,
      token: body.token,
      deviceId: body.deviceId,
    })
    .onConflictDoUpdate({
      target: pushTokens.deviceId,
      set: { token: body.token, userId: user.id, updatedAt: new Date() },
    });

  return c.json({ ok: true });
});

// DELETE /push-tokens/:deviceId — unregister
pushRoutes.delete("/push-tokens/:deviceId", async (c) => {
  const user = c.get("user") as { id: string };
  const deviceId = c.req.param("deviceId");

  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.deviceId, deviceId), eq(pushTokens.userId, user.id)));

  return c.json({ ok: true });
});

export default pushRoutes;
