import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { cooks, cookSteps } from "../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

const cookRoutes = new Hono();

cookRoutes.use("/*", requireAuth);

// GET /cooks — list user's cooks
cookRoutes.get("/cooks", async (c) => {
  const user = c.get("user") as { id: string };

  const allCooks = await db.query.cooks.findMany({
    where: eq(cooks.userId, user.id),
    with: { steps: { orderBy: [asc(cookSteps.stepNumber)] } },
    orderBy: (cooks, { desc }) => [desc(cooks.createdAt)],
  });

  const active = allCooks.filter((c) => c.status === "planning" || c.status === "active");
  const completed = allCooks.filter((c) => c.status === "completed" || c.status === "cancelled");

  return c.json({ active, completed });
});

// GET /cooks/:id — get cook with steps
cookRoutes.get("/cooks/:id", async (c) => {
  const user = c.get("user") as { id: string };
  const id = c.req.param("id");

  const cook = await db.query.cooks.findFirst({
    where: eq(cooks.id, id),
    with: { steps: { orderBy: [asc(cookSteps.stepNumber)] } },
  });

  if (!cook || cook.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(cook);
});

// PATCH /cooks/:id — update cook status or notes
cookRoutes.patch("/cooks/:id", async (c) => {
  const user = c.get("user") as { id: string };
  const id = c.req.param("id");
  const body = await c.req.json<{ status?: string; notes?: string }>();

  const cook = await db.query.cooks.findFirst({
    where: eq(cooks.id, id),
  });

  if (!cook || cook.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;

  const [updated] = await db.update(cooks).set(updates).where(eq(cooks.id, id)).returning();

  return c.json(updated);
});

// PATCH /cooks/:id/steps/:stepId — update step status
cookRoutes.patch("/cooks/:id/steps/:stepId", async (c) => {
  const user = c.get("user") as { id: string };
  const cookId = c.req.param("id");
  const stepId = c.req.param("stepId");
  const body = await c.req.json<{ status: string }>();

  const cook = await db.query.cooks.findFirst({
    where: eq(cooks.id, cookId),
  });

  if (!cook || cook.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }

  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === "completed") updates.completedAt = new Date();

  const [updated] = await db
    .update(cookSteps)
    .set(updates)
    .where(and(eq(cookSteps.id, stepId), eq(cookSteps.cookId, cookId)))
    .returning();

  if (!updated) return c.json({ error: "Step not found" }, 404);

  return c.json(updated);
});

export default cookRoutes;
