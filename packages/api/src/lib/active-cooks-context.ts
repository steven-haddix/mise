import { db } from "../db/client.js";
import { cooks, cookSteps } from "../db/schema.js";
import { and, eq, or, asc } from "drizzle-orm";

/**
 * Builds a short markdown block listing the user's active cooks for injection
 * into the system prompt. Returns "" if the user has no active cooks.
 */
export async function buildActiveCooksContext(userId: string, now: Date = new Date()): Promise<string> {
  const rows = await db.query.cooks.findMany({
    where: and(
      eq(cooks.userId, userId),
      or(eq(cooks.status, "planning"), eq(cooks.status, "active")),
    ),
    with: { steps: { orderBy: [asc(cookSteps.scheduledAt)] } },
  });

  if (rows.length === 0) return "";

  const lines = rows.map((cook) => {
    const target = new Date(cook.targetTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const nextStep = cook.steps.find(
      (s) => (s.status === "pending" || s.status === "notified") && new Date(s.scheduledAt).getTime() >= now.getTime(),
    );
    if (nextStep) {
      const when = new Date(nextStep.scheduledAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `- ${cook.title} — ready ${target}. Next: ${nextStep.title} at ${when}.`;
    }
    return `- ${cook.title} — ready ${target}.`;
  });

  return `\n\n### Your active cooks\n${lines.join("\n")}`;
}
