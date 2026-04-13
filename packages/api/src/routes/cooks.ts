import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { cooks, cookSteps } from "../db/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { validatePlan } from "../lib/plan-validation.js";

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

// POST /cooks — create cook + steps from a confirmed plan (idempotent on X-Proposal-Id)
cookRoutes.post("/cooks", async (c) => {
  const user = c.get("user") as { id: string };
  const proposalId = c.req.header("X-Proposal-Id");
  if (!proposalId) {
    return c.json({ error: "X-Proposal-Id header is required" }, 400);
  }

  const body = await c.req.json<{
    conversationId: string;
    title: string;
    targetTime: string;
    steps: Array<{ title: string; description: string; scheduledAt: string }>;
  }>();

  // Idempotency: if a cook with this proposalId already exists for this user, return it.
  const existing = await db.query.cooks.findFirst({
    where: and(eq(cooks.proposalId, proposalId), eq(cooks.userId, user.id)),
    with: { steps: { orderBy: [asc(cookSteps.stepNumber)] } },
  });
  if (existing) {
    return c.json(existing, 200);
  }

  // Validate the plan server-side (defense in depth).
  const validation = validatePlan({
    title: body.title,
    targetTime: body.targetTime,
    steps: body.steps,
  });
  if (!validation.ok) {
    return c.json({ error: "Plan is invalid", notes: validation.notes }, 422);
  }

  // Create cook + steps in a transaction.
  try {
    const result = await db.transaction(async (tx) => {
      const [cook] = await tx
        .insert(cooks)
        .values({
          userId: user.id,
          conversationId: body.conversationId,
          title: body.title,
          targetTime: new Date(body.targetTime),
          status: "active",
          proposalId,
        })
        .returning();

      const stepRows = body.steps.map((step, i) => ({
        cookId: cook.id,
        stepNumber: i + 1,
        title: step.title,
        description: step.description,
        scheduledAt: new Date(step.scheduledAt),
        status: "pending" as const,
      }));

      const insertedSteps = await tx.insert(cookSteps).values(stepRows).returning();

      return { ...cook, steps: insertedSteps };
    });

    return c.json(result, 201);
  } catch (err: any) {
    // Unique-constraint violation on proposalId → race: fetch and return the existing cook.
    if (err?.code === "23505" || /unique/i.test(String(err?.message))) {
      const found = await db.query.cooks.findFirst({
        where: and(eq(cooks.proposalId, proposalId), eq(cooks.userId, user.id)),
        with: { steps: { orderBy: [asc(cookSteps.stepNumber)] } },
      });
      if (found) return c.json(found, 200);
    }
    console.error("[POST /cooks] error:", err);
    return c.json({ error: "Failed to create cook" }, 500);
  }
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

// PATCH /cooks/:id/steps/:stepId — update step status; auto-completes cook when last step is done
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

  const updated = await db.transaction(async (tx) => {
    const [updatedStep] = await tx
      .update(cookSteps)
      .set(updates)
      .where(and(eq(cookSteps.id, stepId), eq(cookSteps.cookId, cookId)))
      .returning();

    if (!updatedStep) return null;

    // If this update set the step to completed, check whether all steps are now completed.
    if (body.status === "completed") {
      const remaining = await tx.query.cookSteps.findMany({
        where: and(eq(cookSteps.cookId, cookId)),
      });
      const allDone = remaining.every((s) => s.status === "completed");
      if (allDone) {
        await tx
          .update(cooks)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(cooks.id, cookId));
      }
    }

    return updatedStep;
  });

  if (!updated) return c.json({ error: "Step not found" }, 404);

  return c.json(updated);
});

export default cookRoutes;
