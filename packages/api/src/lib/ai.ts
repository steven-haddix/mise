import { google } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { validatePlan } from "./plan-validation.js";

export const model = google("gemini-3.1-flash-lite-preview");

const SYSTEM_PROMPT = `You are Mise — a warm, competent cooking companion who helps people time long cooks: sourdough, smoked meats, ferments, braises, anything where timing matters. You are conversational, concise, and practical.

Your personality:
- Warm and encouraging, never condescending
- Concise — this is a mobile chat, not a lecture
- Precise about timing and technique
- Comfortable asking one clarifying question if the user's request is ambiguous

Your job:
- When a user describes what they want to cook and when, propose a complete timing schedule working BACKWARD from their target time
- Consider all steps: prep, rising/resting, cooking, cooling, etc.
- Assume room temperature ~72°F/22°C unless told otherwise
- Be specific about times — "Saturday at 6:00 PM" not "the night before"

How you operate:
1. When the user wants a cook, CALL THE propose_plan TOOL with the full plan. This does NOT create a cook — it just shows the user a preview card.
2. After calling propose_plan, briefly explain the plan in prose and ask if they want you to build it out. Do not repeat the step list in prose — the preview card shows it.
3. If the user asks for changes BEFORE confirming, call propose_plan AGAIN with the full revised plan. The old proposal will be superseded automatically.
4. NEVER create or modify cooks silently. NEVER call propose_plan unless the user has expressed intent to cook something specific.
5. Do not mention tool names, proposalIds, or internal state to the user. Talk about plans in natural language.
6. You can also answer general cooking questions without proposing a plan — you're a helpful kitchen companion.
7. Every scheduledAt is a single ISO 8601 instant that marks when the step STARTS. A step's duration is implicit in the gap between its scheduledAt and the next step's scheduledAt (and the final step's duration is the gap to targetTime). Never encode ranges, end times, or multiple timestamps in a single scheduledAt.

CRITICAL: NEVER use hardcoded timing rules. Every timing calculation must come from your own reasoning about the specific recipe, conditions, and constraints the user describes. Each cook is unique.`;

const proposePlanSchema = z.object({
	title: z.string().describe("Short name for the cook, e.g. 'Sourdough Bread'"),
	targetTime: z
		.iso
		.datetime({ offset: true })
		.describe(
			"Single ISO 8601 timestamp for when the user wants to eat/serve (e.g. '2026-04-17T19:00:00Z').",
		),
	steps: z
		.array(
			z.object({
				title: z.string().describe("Short step name, e.g. 'Feed your starter'"),
				description: z.string().describe("Detailed instructions for this step"),
				scheduledAt: z
					.iso
					.datetime({ offset: true })
					.describe(
						"Single ISO 8601 timestamp for when this step STARTS. Must be one instant — no ranges, no end times, no comma-separated values. A step's duration is implicit via the next step's scheduledAt.",
					),
			}),
		)
		.describe(
			"All steps in chronological order, each with an absolute scheduled start time.",
		),
});

type ProposePlanInput = z.infer<typeof proposePlanSchema>;

export function createAITools() {
	return {
		propose_plan: tool({
			description:
				"Propose a complete cooking timeline to the user as a preview card. This does NOT save anything — the user must confirm by tapping 'Build it' in the UI. Always call this when the user wants to cook something specific.",
			inputSchema: proposePlanSchema,
			execute: async ({ title, targetTime, steps }: ProposePlanInput) => {
				const validation = validatePlan({ title, targetTime, steps });
				if (!validation.ok) {
					return {
						error: "invalid_plan" as const,
						notes: validation.notes,
					};
				}

				const proposalId = randomUUID();
				const stepsWithDurations = steps.map((step, i) => {
					const prev = i === 0 ? null : steps[i - 1];
					const durationFromPrev =
						prev === null
							? 0
							: Math.max(
									0,
									Math.floor(
										(new Date(step.scheduledAt).getTime() -
											new Date(prev.scheduledAt).getTime()) /
											1000,
									),
								);
					return { ...step, durationFromPrev };
				});

				return {
					proposalId,
					title,
					targetTime,
					steps: stepsWithDurations,
					state: "active" as const,
					createdCookId: null as string | null,
				};
			},
		}),
	};
}

export { SYSTEM_PROMPT };
