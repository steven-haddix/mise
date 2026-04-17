import { db } from "@mise/api/db";
import { cookSteps, pushTokens, cooks } from "@mise/api/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { sendPushNotifications } from "@mise/api/lib/push";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export async function startNotificationPoller() {
  console.log("[worker] notification poller started (30s interval)");

  const poll = async () => {
    try {
      // Find steps that are due and haven't been notified
      const dueSteps = await db
        .select({
          step: cookSteps,
          cook: cooks,
        })
        .from(cookSteps)
        .innerJoin(cooks, eq(cookSteps.cookId, cooks.id))
        .where(and(eq(cookSteps.status, "pending"), lte(cookSteps.scheduledAt, new Date())));

      if (dueSteps.length === 0) return;

      console.log(`[worker] ${dueSteps.length} notification(s) due`);

      for (const { step, cook } of dueSteps) {
        // Get user's push tokens
        const tokens = await db.select().from(pushTokens).where(eq(pushTokens.userId, cook.userId));

        if (tokens.length > 0) {
          await sendPushNotifications(
            tokens.map((t) => ({
              to: t.token,
              title: cook.title,
              body: `Time to: ${step.title}`,
              data: { cookId: cook.id, stepId: step.id },
            })),
          );
        }

        // Mark as notified
        await db
          .update(cookSteps)
          .set({ status: "notified", notifiedAt: new Date() })
          .where(eq(cookSteps.id, step.id));
      }
    } catch (error) {
      console.error("[worker] poll error:", error);
    }
  };

  // Initial poll
  await poll();

  // Start interval
  setInterval(poll, POLL_INTERVAL_MS);
}
