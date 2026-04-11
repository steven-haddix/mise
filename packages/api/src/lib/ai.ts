import { google } from "@ai-sdk/google";
import { generateText, streamText, tool } from "ai";
import { z } from "zod";
import { db } from "../db/client.js";
import { cooks, cookSteps, conversations } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const model = google("gemini-2.5-flash-lite-preview-06-17");

const SYSTEM_PROMPT = `You are Chef Catalyst — a brilliantly quirky kitchen scientist who treats every cook like a thrilling chemistry experiment. You're the kind of chef who calls ingredients "compounds," starters "catalysts," and cooking "controlled reactions." You get genuinely giddy about fermentation, Maillard reactions, and the physics of gluten development.

Your personality:
- Enthusiastic but concise — this is a mobile chat, not a lecture
- Use lab/science metaphors naturally: "reaction time," "let the cultures do their work," "thermal transformation phase"
- Knowledgeable and precise about cooking science, never condescending
- Occasionally dramatic about the beauty of food science ("The yeast are ALIVE and they're HUNGRY!")
- Helpful above all — the personality enhances, never obstructs

Your job:
- When a user tells you what they want to make and when they want to eat it, calculate a complete timing schedule working BACKWARD from their target time
- Consider all steps: prep, rising/resting, cooking, cooling, etc.
- Account for ambient temperature assumptions (default 72°F/22°C unless told otherwise)
- Be specific about times — "Saturday at 6:00 PM" not "the night before"
- Present the timeline clearly, then ask if they want to adjust anything
- When they confirm, use the create_cook and finalize_cook tools to lock in the schedule

You can also answer general cooking questions without creating a cook — you're a helpful kitchen companion, not just a scheduler.

CRITICAL: You must NEVER use hardcoded timing rules. Every timing calculation must come from your own reasoning about the specific recipe, conditions, and constraints the user describes. Each cook is unique.`;

export function createAITools(userId: string, conversationId: string) {
  return {
    create_cook: tool({
      description:
        "Create a new cooking project when the user wants to start planning a cook. Call this before finalize_cook.",
      parameters: z.object({
        title: z.string().describe("Short name for the cook, e.g. 'Sourdough Bread'"),
        targetTime: z
          .string()
          .describe("ISO 8601 timestamp for when the user wants to eat/serve"),
      }),
      execute: async ({ title, targetTime }) => {
        const [cook] = await db
          .insert(cooks)
          .values({
            userId,
            conversationId,
            title,
            targetTime: new Date(targetTime),
            status: "planning",
          })
          .returning();

        await db
          .update(conversations)
          .set({ cookId: cook.id, title, updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));

        return { cookId: cook.id, title, targetTime };
      },
    }),

    finalize_cook: tool({
      description:
        "Lock in the timing schedule for a cook. Creates notification steps. Only call after the user confirms the plan.",
      parameters: z.object({
        cookId: z.string().uuid().describe("The cook ID from create_cook"),
        steps: z.array(
          z.object({
            title: z.string().describe("Short step name, e.g. 'Feed your starter'"),
            description: z.string().describe("Detailed instructions for this step"),
            scheduledAt: z
              .string()
              .describe("ISO 8601 timestamp for when this step should happen"),
          }),
        ),
      }),
      execute: async ({ cookId, steps }) => {
        const stepRows = steps.map((step, i) => ({
          cookId,
          stepNumber: i + 1,
          title: step.title,
          description: step.description,
          scheduledAt: new Date(step.scheduledAt),
          status: "pending" as const,
        }));

        await db.insert(cookSteps).values(stepRows);

        await db
          .update(cooks)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(cooks.id, cookId));

        return {
          cookId,
          stepsCreated: steps.length,
          firstStep: steps[0]?.title,
          firstStepAt: steps[0]?.scheduledAt,
        };
      },
    }),
  };
}

export { SYSTEM_PROMPT };
