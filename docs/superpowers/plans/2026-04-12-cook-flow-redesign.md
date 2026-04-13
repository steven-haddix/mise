# Cook Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Mise so Home = active cooks dashboard, Chat = conversational cook creation with a `propose_plan` → user-confirms → "Build it" flow. Drop the `NewCookSheet` modal entirely. Upgrade cook cards with day-of-cook tracking and next-step boxes. Wire push-permission prompt to first cook creation.

**Architecture:** API (Hono + Drizzle + Postgres) exposes one new AI tool (`propose_plan`) that returns a plan payload without writing anything. Client renders it as a `PlanPreviewCard`. User taps "Build it" → `POST /cooks` creates cook + steps in a single transaction (idempotent on a nullable unique `cooks.proposalId` column). Chat messages gain a supersession model driven off their `toolCalls.output.state` field. Home becomes the `initialRouteName`.

**Tech Stack:** Bun runtime, Hono, Drizzle ORM (PostgreSQL), Vercel AI SDK v5, Zod, Expo + Expo Router, React Native, Zustand, Better Auth, expo-notifications. Tests for backend logic via `bun test` (built-in, no extra deps).

**Spec:** `docs/superpowers/specs/2026-04-12-cook-flow-redesign-design.md`

---

## File Structure

### API (packages/api)

**Create:**
- `src/lib/greeting.ts` — constant string for the canned assistant greeting.
- `src/lib/plan-validation.ts` — pure validation function for propose-plan payloads + helpers. Paired with tests.
- `src/lib/plan-validation.test.ts` — `bun test` unit tests for validation rules.
- `src/lib/active-cooks-context.ts` — builds the "Your active cooks" system-prompt block from DB state.
- `src/routes/conversations.ts` — new routes: `POST /conversations`, `PATCH /conversations/:id/messages/:messageId`. (Note: the existing `GET /conversations` routes currently live in `chat.ts`; we'll leave them there to avoid churn, but put the NEW ones here.)

**Modify:**
- `src/db/schema.ts` — add nullable unique `proposalId` column to `cooks`.
- `src/lib/ai.ts` — new system prompt (Mise persona), replace `create_cook` + `finalize_cook` with single `propose_plan` tool, inject active-cooks block.
- `src/routes/chat.ts` — call `buildActiveCooksContext` and append to system prompt.
- `src/routes/cooks.ts` — add `POST /cooks` (with `X-Proposal-Id` idempotency), auto-complete logic in `PATCH /cooks/:id/steps/:stepId`.
- `src/index.ts` — wire up new `conversationsRoutes`.

### Mobile (packages/mobile)

**Create:**
- `lib/emoji-map.ts` — keyword → emoji mapping for cook titles.
- `lib/time-format.ts` — helpers: `getGreeting`, `formatTimeUntil`, `formatStartDate`, `computeDayOfCook`, `formatStartTime`, `formatTotalDuration`.
- `lib/push-permissions.ts` — wraps `expo-notifications` permission state and registration.
- `components/PlanPreviewCard.tsx` — new plan-proposal card with `active | superseded | confirmed` states.
- `components/StartNewCookCard.tsx` — the inline "Start a new cook" card for Home.
- `components/EnableNotificationsModal.tsx` — one-tap modal shown after first successful Build it.
- `app/(tabs)/(chat)/[conversationId].tsx` — new route for resuming a specific conversation (used by cook-detail → chat).

**Modify:**
- `app/(tabs)/_layout.tsx` — reorder tabs to `(cooks) → (chat) → (profile)`, set `initialRouteName="(cooks)"`.
- `app/(tabs)/(chat)/index.tsx` — handle `?new=1` param, remove `NewCookSheet`, add new-chat header button, integrate `PlanPreviewCard` into message rendering, wire Build it flow.
- `app/(tabs)/(cooks)/index.tsx` — greeting + subtitle, upgraded CookCard usage, `StartNewCookCard` at bottom, drop completed cooks.
- `app/(tabs)/(cooks)/[cookId].tsx` — Cancel cook button, graceful 404, use `cook.conversationId` for chat icon.
- `app/(tabs)/(profile)/index.tsx` — add Notifications row.
- `components/CookCard.tsx` — emoji prefix, "Active" pill, "Day X of Y · Started …" subtitle, enhanced progress bar + "Next" box.
- `lib/api.ts` — add `createConversation`, `createCook`, `patchMessage` functions; support passing `X-Proposal-Id` header.
- `lib/store.ts` — add `mergeCook` action.

**Delete:**
- `components/NewCookSheet.tsx` — no longer used.

---

## Conventions used throughout this plan

- Run API tests: `cd packages/api && bun test` (bun test runs any `*.test.ts` within the package).
- Run API dev server manually when needed: `bun run dev` (from repo root, runs API + worker). DB assumed running via `docker compose up -d`.
- Migrations: `bun run db:generate` then `bun run db:push` from repo root. (These wrappers `cd` into `packages/api` and pass env.)
- Typecheck API: `cd packages/api && bun run typecheck`. Mobile: `cd packages/mobile && bun run typecheck`.
- Commit messages: lowercase conventional-style prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`), concise.
- Each task ends with a typecheck + commit. Keep commits small.

---

## Phase 1 — Foundation: schema, validation, AI rewrite

### Task 1: Add `proposalId` column to `cooks` + migration

**Files:**
- Modify: `packages/api/src/db/schema.ts`
- Generate: `packages/api/drizzle/0001_*.sql` (Drizzle-generated)

- [ ] **Step 1: Add column to schema**

Open `packages/api/src/db/schema.ts`. Find the `cooks` table definition (around line 118). Add a `proposalId` field after `notes` and a unique index on it in the table's index map.

```ts
export const cooks = pgTable(
  "cooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    title: text("title").notNull(),
    targetTime: timestamp("target_time", { withTimezone: true }).notNull(),
    status: cookStatusEnum("status").notNull().default("planning"),
    notes: text("notes"),
    proposalId: uuid("proposal_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_cooks_user").on(t.userId),
    statusIdx: index("idx_cooks_status").on(t.status),
    proposalIdx: uniqueIndex("idx_cooks_proposal").on(t.proposalId),
  }),
);
```

Also add `uniqueIndex` to the Drizzle import at the top of the file:

```ts
import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Generate the migration**

Run from repo root:

```bash
bun run db:generate
```

Expected: a new file appears under `packages/api/drizzle/` (e.g. `0001_XXX.sql`) containing `ALTER TABLE "cooks" ADD COLUMN "proposal_id" uuid;` and `CREATE UNIQUE INDEX "idx_cooks_proposal" ON "cooks" USING btree ("proposal_id");`.

- [ ] **Step 3: Apply the migration**

```bash
bun run db:push
```

Expected: no errors. If Drizzle prompts about a destructive change, investigate — there should be none for a nullable column addition.

- [ ] **Step 4: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/db/schema.ts packages/api/drizzle/
git commit -m "feat(db): add nullable unique proposalId column to cooks"
```

---

### Task 2: Plan validation library (TDD)

**Files:**
- Create: `packages/api/src/lib/plan-validation.ts`
- Create: `packages/api/src/lib/plan-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/api/src/lib/plan-validation.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { validatePlan } from "./plan-validation.js";

const now = new Date("2026-04-12T12:00:00Z");
const tomorrow = new Date("2026-04-13T12:00:00Z");
const dayAfter = new Date("2026-04-14T12:00:00Z");
const yesterday = new Date("2026-04-11T12:00:00Z");

describe("validatePlan", () => {
  it("returns no notes for a valid plan", () => {
    const result = validatePlan(
      {
        title: "Sourdough",
        targetTime: tomorrow.toISOString(),
        steps: [
          { title: "Feed starter", description: "x", scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString() },
          { title: "Mix", description: "y", scheduledAt: new Date("2026-04-13T08:00:00Z").toISOString() },
        ],
      },
      now,
    );
    expect(result.ok).toBe(true);
    expect(result.notes).toEqual([]);
  });

  it("rejects targetTime in the past", () => {
    const result = validatePlan(
      {
        title: "Past cook",
        targetTime: yesterday.toISOString(),
        steps: [{ title: "A", description: "x", scheduledAt: new Date("2026-04-10T12:00:00Z").toISOString() }],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/targetTime.*past/i);
  });

  it("rejects empty steps array", () => {
    const result = validatePlan(
      { title: "Empty", targetTime: tomorrow.toISOString(), steps: [] },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/at least one step/i);
  });

  it("rejects step with empty title", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [{ title: "  ", description: "x", scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString() }],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/title/i);
  });

  it("rejects step with empty description", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [{ title: "t", description: "", scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString() }],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/description/i);
  });

  it("rejects unsorted steps", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: dayAfter.toISOString(),
        steps: [
          { title: "a", description: "x", scheduledAt: new Date("2026-04-13T08:00:00Z").toISOString() },
          { title: "b", description: "x", scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString() },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/sorted/i);
  });

  it("rejects step scheduledAt after targetTime", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [
          { title: "a", description: "x", scheduledAt: new Date("2026-04-14T00:00:00Z").toISOString() },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/after target/i);
  });

  it("rejects duplicate consecutive step times", () => {
    const when = new Date("2026-04-12T20:00:00Z").toISOString();
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [
          { title: "a", description: "x", scheduledAt: when },
          { title: "b", description: "x", scheduledAt: when },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/gap/i);
  });

  it("rejects non-parseable ISO dates", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: "not-a-date",
        steps: [{ title: "a", description: "x", scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString() }],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/targetTime/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && bun test src/lib/plan-validation.test.ts
```

Expected: all tests fail with "Cannot find module './plan-validation.js'" or similar.

- [ ] **Step 3: Implement the validation library**

Create `packages/api/src/lib/plan-validation.ts`:

```ts
export interface ProposePlanInput {
  title: string;
  targetTime: string;
  steps: Array<{
    title: string;
    description: string;
    scheduledAt: string;
  }>;
}

export interface ValidationResult {
  ok: boolean;
  notes: string[];
}

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function validatePlan(input: ProposePlanInput, now: Date = new Date()): ValidationResult {
  const notes: string[] = [];

  if (!input.title || !input.title.trim()) {
    notes.push("Plan title is required.");
  }

  const target = parseDate(input.targetTime);
  if (!target) {
    notes.push("targetTime must be a valid ISO 8601 timestamp.");
  } else if (target.getTime() <= now.getTime()) {
    notes.push("targetTime is in the past — the plan cannot be scheduled.");
  }

  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    notes.push("Plan must have at least one step.");
    return { ok: notes.length === 0, notes };
  }

  const parsedSteps: { scheduledAt: Date; step: typeof input.steps[number] }[] = [];

  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    if (!step.title || !step.title.trim()) {
      notes.push(`Step ${i + 1} is missing a title.`);
    }
    if (!step.description || !step.description.trim()) {
      notes.push(`Step ${i + 1} is missing a description.`);
    }
    const when = parseDate(step.scheduledAt);
    if (!when) {
      notes.push(`Step ${i + 1} has an invalid scheduledAt.`);
      continue;
    }
    if (target && when.getTime() > target.getTime()) {
      notes.push(`Step ${i + 1} is scheduled after targetTime.`);
    }
    parsedSteps.push({ scheduledAt: when, step });
  }

  for (let i = 1; i < parsedSteps.length; i++) {
    const prev = parsedSteps[i - 1].scheduledAt.getTime();
    const curr = parsedSteps[i].scheduledAt.getTime();
    if (curr < prev) {
      notes.push("Steps must be sorted by scheduledAt ascending.");
      break;
    }
    if (curr === prev) {
      notes.push(`Consecutive steps have a zero gap at step ${i + 1}.`);
    }
  }

  return { ok: notes.length === 0, notes };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/api && bun test src/lib/plan-validation.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Typecheck + commit**

```bash
cd packages/api && bun run typecheck
git add packages/api/src/lib/plan-validation.ts packages/api/src/lib/plan-validation.test.ts
git commit -m "feat(api): add plan validation library"
```

---

### Task 3: Greeting constant + active-cooks context builder

**Files:**
- Create: `packages/api/src/lib/greeting.ts`
- Create: `packages/api/src/lib/active-cooks-context.ts`

- [ ] **Step 1: Create the greeting constant**

`packages/api/src/lib/greeting.ts`:

```ts
export const GREETING_MESSAGE =
  "Hey Chef! 👨‍🍳 What are you looking to cook? I can help you plan any long cook — sourdough, smoked meats, ferments, you name it. Just tell me what you're making and when you want it ready.";
```

- [ ] **Step 2: Create the active-cooks context builder**

`packages/api/src/lib/active-cooks-context.ts`:

```ts
import { db } from "../db/client.js";
import { cooks, cookSteps } from "../db/schema.js";
import { and, eq, or, asc, inArray } from "drizzle-orm";

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
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/lib/greeting.ts packages/api/src/lib/active-cooks-context.ts
git commit -m "feat(api): add greeting constant and active-cooks context builder"
```

---

### Task 4: Rewrite AI tools and system prompt

**Files:**
- Modify: `packages/api/src/lib/ai.ts` (full replacement)

- [ ] **Step 1: Replace the file with the new persona, single tool, and validation integration**

Overwrite `packages/api/src/lib/ai.ts`:

```ts
import { google } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";
import { validatePlan } from "./plan-validation.js";

export const model = google("gemini-2.5-flash-lite-preview-06-17");

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

CRITICAL: NEVER use hardcoded timing rules. Every timing calculation must come from your own reasoning about the specific recipe, conditions, and constraints the user describes. Each cook is unique.`;

export function createAITools() {
  return {
    propose_plan: tool({
      description:
        "Propose a complete cooking timeline to the user as a preview card. This does NOT save anything — the user must confirm by tapping 'Build it' in the UI. Always call this when the user wants to cook something specific.",
      parameters: z.object({
        title: z.string().describe("Short name for the cook, e.g. 'Sourdough Bread'"),
        targetTime: z
          .string()
          .describe("ISO 8601 timestamp for when the user wants to eat/serve"),
        steps: z
          .array(
            z.object({
              title: z.string().describe("Short step name, e.g. 'Feed your starter'"),
              description: z.string().describe("Detailed instructions for this step"),
              scheduledAt: z
                .string()
                .describe("ISO 8601 timestamp for when this step should happen"),
            }),
          )
          .describe("All steps in chronological order, each with an absolute scheduled time."),
      }),
      execute: async ({ title, targetTime, steps }) => {
        const validation = validatePlan({ title, targetTime, steps });

        const proposalId = randomUUID();
        const stepsWithDurations = steps.map((step, i) => {
          const prev = i === 0 ? null : steps[i - 1];
          const durationFromPrev =
            prev === null
              ? 0
              : Math.max(
                  0,
                  Math.floor(
                    (new Date(step.scheduledAt).getTime() - new Date(prev.scheduledAt).getTime()) /
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
          validationNotes: validation.notes,
        };
      },
    }),
  };
}

export { SYSTEM_PROMPT };
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors. If there are errors in callers of `createAITools(userId, conversationId)`, leave them for Task 5 which updates `chat.ts`.

If typecheck fails on `chat.ts` with "Expected 0 arguments, but got 2": that's expected; we'll fix in Task 5. Otherwise fix now.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/lib/ai.ts
git commit -m "feat(api): replace create_cook/finalize_cook with propose_plan, Mise persona"
```

---

### Task 5: Update /chat to inject active-cooks context and use new tools

**Files:**
- Modify: `packages/api/src/routes/chat.ts`

- [ ] **Step 1: Update imports and system prompt composition**

Edit `packages/api/src/routes/chat.ts`.

Change the imports block (around line 1–9):

```ts
import { Hono } from "hono";
import { streamText } from "ai";
import { stream } from "hono/streaming";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { model, SYSTEM_PROMPT, createAITools } from "../lib/ai.js";
import { buildActiveCooksContext } from "../lib/active-cooks-context.js";
```

Replace the "Add target time context to system prompt" block (around lines 54–59) with:

```ts
  const activeCooksBlock = await buildActiveCooksContext(user.id);
  let systemPrompt = SYSTEM_PROMPT + activeCooksBlock;
  if (body.targetTime) {
    systemPrompt += `\n\nThe user wants to eat/serve by: ${body.targetTime}. Use this as the target time for backward-calculating the schedule. The current time is: ${new Date().toISOString()}.`;
  } else {
    systemPrompt += `\n\nThe current time is: ${new Date().toISOString()}.`;
  }
```

Replace `const tools = createAITools(user.id, conversationId);` with:

```ts
  const tools = createAITools();
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routes/chat.ts
git commit -m "feat(api): inject active cooks context into chat system prompt"
```

---

## Phase 2 — API: conversations + cook creation

### Task 6: Create `conversations` routes file with `POST /conversations`

**Files:**
- Create: `packages/api/src/routes/conversations.ts`

- [ ] **Step 1: Implement POST /conversations (creates a conversation seeded with the canned greeting)**

```ts
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
```

- [ ] **Step 2: Wire up in `index.ts`**

Edit `packages/api/src/index.ts`. Add import near other route imports (after `cookRoutes` import):

```ts
import conversationsRoutes from "./routes/conversations.js";
```

Add route registration after the existing `app.route("/api/v1", cookRoutes);` line:

```ts
app.route("/api/v1", conversationsRoutes);
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Smoke-test manually (optional but recommended)**

Start the API (`bun run dev` from repo root) and hit (replace `<sessionCookie>` with a real one):

```bash
curl -X POST http://localhost:8090/api/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Cookie: <sessionCookie>"
```

Expected: 201 with `{ conversationId, messages: [{ role: "assistant", content: "Hey Chef! ..." }] }`.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/conversations.ts packages/api/src/index.ts
git commit -m "feat(api): add POST /conversations and PATCH message proposalState routes"
```

---

### Task 7: Add `POST /cooks` (idempotent create) and auto-complete on step updates

**Files:**
- Modify: `packages/api/src/routes/cooks.ts`

- [ ] **Step 1: Update imports**

Replace the top imports with:

```ts
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { cooks, cookSteps } from "../db/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { validatePlan } from "../lib/plan-validation.js";
```

- [ ] **Step 2: Add POST /cooks handler**

Insert this new route handler **before** the existing `PATCH /cooks/:id` handler (i.e., after `GET /cooks/:id`):

```ts
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
```

- [ ] **Step 3: Add auto-complete logic in step PATCH**

Replace the existing `PATCH /cooks/:id/steps/:stepId` handler body (the whole handler from line 68 to end) with:

```ts
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
```

- [ ] **Step 4: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/cooks.ts
git commit -m "feat(api): add POST /cooks with idempotency and auto-complete on last step"
```

---

## Phase 3 — Mobile: API client + store

### Task 8: Update mobile API client for new endpoints

**Files:**
- Modify: `packages/mobile/lib/api.ts`

- [ ] **Step 1: Add `createConversation`, `createCook`, and `patchMessage` functions**

At the end of `packages/mobile/lib/api.ts`, add:

```ts
// Conversations (new)
export function createConversation() {
  return fetchApi<{ conversationId: string; messages: import("@mise/shared").Message[] }>(
    "/api/v1/conversations",
    { method: "POST" },
  );
}

export function patchMessage(
  conversationId: string,
  messageId: string,
  body: { proposalState: "confirmed" | "superseded"; createdCookId?: string },
) {
  return fetchApi<{ ok: true }>(
    `/api/v1/conversations/${conversationId}/messages/${messageId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

// Cook creation from a confirmed plan
export async function createCook(
  proposalId: string,
  body: {
    conversationId: string;
    title: string;
    targetTime: string;
    steps: Array<{ title: string; description: string; scheduledAt: string }>;
  },
): Promise<import("@mise/shared").CookWithSteps> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cooks`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Proposal-Id": proposalId,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status, notes: err.notes });
  }
  return res.json();
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/lib/api.ts
git commit -m "feat(mobile): add createConversation, createCook, patchMessage API client fns"
```

---

### Task 9: Add `mergeCook` action to the zustand store

**Files:**
- Modify: `packages/mobile/lib/store.ts`

- [ ] **Step 1: Add the merge action**

Replace the whole file content with:

```ts
import { create } from "zustand";
import type { Cook, CookWithSteps, Conversation } from "@mise/shared";

interface MiseStore {
  // Conversations
  conversations: Conversation[];
  setConversations: (convos: Conversation[]) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Cooks
  activeCooks: CookWithSteps[];
  completedCooks: CookWithSteps[];
  setCooks: (active: CookWithSteps[], completed: CookWithSteps[]) => void;
  mergeCook: (cook: CookWithSteps) => void;

  // Chat streaming state
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingText: string;
  setStreamingText: (text: string) => void;
  appendStreamingText: (chunk: string) => void;
}

export const useStore = create<MiseStore>((set) => ({
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  activeConversationId: null,
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),

  activeCooks: [],
  completedCooks: [],
  setCooks: (activeCooks, completedCooks) => set({ activeCooks, completedCooks }),
  mergeCook: (cook) =>
    set((state) => {
      const isActive = cook.status === "planning" || cook.status === "active";
      const withoutCook = (list: CookWithSteps[]) => list.filter((c) => c.id !== cook.id);
      if (isActive) {
        return {
          activeCooks: [cook, ...withoutCook(state.activeCooks)],
          completedCooks: withoutCook(state.completedCooks),
        };
      }
      return {
        activeCooks: withoutCook(state.activeCooks),
        completedCooks: [cook, ...withoutCook(state.completedCooks)],
      };
    }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  streamingText: "",
  setStreamingText: (streamingText) => set({ streamingText }),
  appendStreamingText: (chunk) =>
    set((state) => ({ streamingText: state.streamingText + chunk })),
}));
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/lib/store.ts
git commit -m "feat(mobile): add mergeCook action to store"
```

---

## Phase 4 — Mobile utilities (pure logic)

### Task 10: Emoji keyword map

**Files:**
- Create: `packages/mobile/lib/emoji-map.ts`

- [ ] **Step 1: Implement the map**

```ts
// Maps cook-title keywords (case-insensitive) to a representative emoji.
// Falls back to 🍳.
const MAP: Array<{ patterns: RegExp; emoji: string }> = [
  { patterns: /sourdough|focaccia|baguette|boule|bread|loaf|pizza dough/i, emoji: "🥖" },
  { patterns: /brisket|steak|beef/i, emoji: "🥩" },
  { patterns: /pork|ribs|butt|shoulder|bacon/i, emoji: "🍖" },
  { patterns: /chicken|turkey|poultry|duck/i, emoji: "🍗" },
  { patterns: /kimchi|ferment|sauerkraut|pickle|kombucha/i, emoji: "🌱" },
  { patterns: /cheese|yogurt|kefir/i, emoji: "🧀" },
  { patterns: /stew|braise|soup|chili|curry|stock|broth/i, emoji: "🍲" },
  { patterns: /fish|salmon|tuna|seafood|shrimp/i, emoji: "🐟" },
  { patterns: /cake|cookie|pastry|dessert|pie|tart/i, emoji: "🍰" },
];

export function emojiForCookTitle(title: string): string {
  for (const { patterns, emoji } of MAP) {
    if (patterns.test(title)) return emoji;
  }
  return "🍳";
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/lib/emoji-map.ts
git commit -m "feat(mobile): add emoji keyword map for cook titles"
```

---

### Task 11: Time formatting helpers

**Files:**
- Create: `packages/mobile/lib/time-format.ts`

- [ ] **Step 1: Implement helpers**

```ts
export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning, Chef";
  if (hour >= 12 && hour < 17) return "Good afternoon, Chef";
  if (hour >= 17 && hour < 22) return "Good evening, Chef";
  return "Up late, Chef";
}

/**
 * Humanize time until `when` from `now`. Returns "Now" for <= 1min,
 * "N minutes" / "N hours" within the day, "Tomorrow at 4:00 AM",
 * or "Thu at 4:00 AM" for >1 day out.
 */
export function formatTimeUntil(when: Date, now: Date = new Date()): string {
  const diffMs = when.getTime() - now.getTime();
  if (diffMs <= 60_000) return "Now";

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"}`;

  const diffHr = Math.floor(diffMin / 60);
  if (isSameDay(now, when)) return `${diffHr} hour${diffHr === 1 ? "" : "s"}`;

  const tomorrow = addDays(now, 1);
  if (isSameDay(tomorrow, when)) {
    return `Tomorrow at ${formatClock(when)}`;
  }

  return `${weekdayShort(when)} at ${formatClock(when)}`;
}

export function formatStartDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Formats a duration in seconds as "~N hours" or "~N minutes". Designed
 * for the "Total time" meta row on the plan preview.
 */
export function formatTotalDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} minutes`;
  const hours = Math.round(mins / 60);
  return `~${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Compute day-of-cook from a list of step dates. Returns { x, y, label }.
 * - y = count of unique calendar days across all steps (min 1)
 * - x = count of unique days from firstStepDay through today (clamped [1, y])
 * - If today is before firstStepDay, label is "Starts tomorrow" etc. and x/y reflect future start.
 */
export function computeDayOfCook(
  stepDates: Date[],
  now: Date = new Date(),
): { x: number; y: number; label: string; startsInFuture: boolean } {
  if (stepDates.length === 0) return { x: 1, y: 1, label: "Day 1 of 1", startsInFuture: false };

  const dayKeys = Array.from(new Set(stepDates.map((d) => dayKey(d)))).sort();
  const firstDayKey = dayKeys[0];
  const y = dayKeys.length;
  const todayKey = dayKey(now);

  if (todayKey < firstDayKey) {
    const first = parseDayKey(firstDayKey);
    const daysTil = Math.round((first.getTime() - startOfDay(now).getTime()) / 86_400_000);
    const label = daysTil === 1 ? "Starts tomorrow" : `Starts in ${daysTil} days`;
    return { x: 0, y, label, startsInFuture: true };
  }

  // Count unique days from firstDayKey through todayKey (inclusive), clamped to y.
  const first = parseDayKey(firstDayKey);
  const today = startOfDay(now);
  const daysSinceStart = Math.max(
    1,
    Math.min(y, Math.round((today.getTime() - first.getTime()) / 86_400_000) + 1),
  );
  return { x: daysSinceStart, y, label: `Day ${daysSinceStart} of ${y}`, startsInFuture: false };
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDayKey(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function weekdayShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/lib/time-format.ts
git commit -m "feat(mobile): add time-format helpers (greeting, timeUntil, day-of-cook)"
```

---

### Task 12: Push permissions helper

**Files:**
- Create: `packages/mobile/lib/push-permissions.ts`

`expo-notifications` and `expo-constants` are already in `packages/mobile/package.json`, so no install step.

- [ ] **Step 1: Implement helpers**

```ts
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Linking } from "react-native";
import { registerPushToken } from "./api";

export type PermissionState = "granted" | "denied" | "undetermined";

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function requestPermissionAndRegister(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return status === "denied" ? "denied" : "undetermined";

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData?.data) {
      const deviceId = Constants.sessionId ?? "unknown-device";
      await registerPushToken(tokenData.data, deviceId);
    }
  } catch (err) {
    console.warn("[push] failed to get/register token:", err);
  }
  return "granted";
}

export function openSettings(): Promise<void> {
  return Linking.openSettings();
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/lib/push-permissions.ts
git commit -m "feat(mobile): add push permission helpers"
```

---

## Phase 5 — Mobile: navigation changes

### Task 13: Reorder tabs, set initial route, rename Cooks → Home label

**Files:**
- Modify: `packages/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Reorder Tabs.Screen definitions and set initialRouteName**

Edit `packages/mobile/app/(tabs)/_layout.tsx`. Replace the `<Tabs>` block (lines 31–66) with:

```tsx
      <Tabs
        initialRouteName="(cooks)"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            position: "absolute",
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: "#c9a0dc",
          tabBarInactiveTintColor: "rgba(255,255,255,0.45)",
        }}
      >
        <Tabs.Screen
          name="(cooks)"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(chat)"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): reorder tabs to Home → Chat → Profile, Cooks tab as initial route"
```

---

### Task 14: Add `[conversationId]` dynamic route in chat

**Files:**
- Create: `packages/mobile/app/(tabs)/(chat)/[conversationId].tsx`

The route simply re-exports the chat screen. The screen itself reads both `?new=1` and `conversationId` from `useLocalSearchParams` (wired up in Task 20), so there's no wrapper-vs-screen race.

- [ ] **Step 1: Create the route file**

```tsx
export { default } from "./index";
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/app/(tabs)/(chat)/[conversationId].tsx
git commit -m "feat(mobile): add [conversationId] route aliasing index for chat deep links"
```

---

## Phase 6 — Mobile components

### Task 15: Build `PlanPreviewCard` component

**Files:**
- Create: `packages/mobile/components/PlanPreviewCard.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { useState, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { emojiForCookTitle } from "../lib/emoji-map";
import { formatClock, formatTotalDuration } from "../lib/time-format";
import type { PermissionState } from "../lib/push-permissions";

export interface PlanPreviewData {
  proposalId: string;
  title: string;
  targetTime: string;
  steps: Array<{
    title: string;
    description: string;
    scheduledAt: string;
    durationFromPrev?: number;
  }>;
  state: "active" | "superseded" | "confirmed";
  createdCookId: string | null;
}

interface Props {
  data: PlanPreviewData;
  pushPermission: PermissionState;
  onBuild: () => Promise<void>;
  onViewCook: (cookId: string) => void;
  buildError?: string | null;
}

export function PlanPreviewCard({ data, pushPermission, onBuild, onViewCook, buildError }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstStep = data.steps[0];
  const totalDurationSec = useMemo(() => {
    if (!firstStep) return 0;
    return Math.floor(
      (new Date(data.targetTime).getTime() - new Date(firstStep.scheduledAt).getTime()) / 1000,
    );
  }, [data.targetTime, firstStep]);

  const emoji = emojiForCookTitle(data.title);

  const handleBuild = async () => {
    setLoading(true);
    try {
      await onBuild();
    } finally {
      setLoading(false);
    }
  };

  const isSuperseded = data.state === "superseded";
  const isConfirmed = data.state === "confirmed";

  return (
    <View
      style={{
        backgroundColor: "#1a1a2a",
        borderRadius: 14,
        padding: 14,
        marginVertical: 6,
        opacity: isSuperseded ? 0.6 : 1,
        alignSelf: "stretch",
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#fff",
            textDecorationLine: isSuperseded ? "line-through" : "none",
            flex: 1,
          }}
        >
          {emoji} {data.title} Plan
        </Text>
        {isSuperseded && (
          <View style={{ backgroundColor: "#3a2a2a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: "#f87171", fontSize: 11, fontWeight: "600" }}>Revised</Text>
          </View>
        )}
        {isConfirmed && (
          <View style={{ backgroundColor: "#1a3a2a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: "#4ade80", fontSize: 11, fontWeight: "600" }}>Built ✓</Text>
          </View>
        )}
      </View>

      {/* Meta rows */}
      <View style={{ marginTop: 10, gap: 6 }}>
        {firstStep && (
          <MetaRow icon="🕐" label={`Start time: ${formatClock(new Date(firstStep.scheduledAt))}`} />
        )}
        <MetaRow icon="⏱️" label={`Total time: ${formatTotalDuration(totalDurationSec)}`} />
        <ReminderRow state={pushPermission} />
      </View>

      {/* Expand toggle */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }}
      >
        <Text style={{ color: "#c9a0dc", fontSize: 12 }}>
          {expanded ? "Hide steps" : `Show ${data.steps.length} steps`}
        </Text>
        <ChevronDown
          size={14}
          color="#c9a0dc"
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {data.steps.map((step, i) => (
            <View key={i}>
              <Text style={{ color: "#888", fontSize: 11, textTransform: "uppercase" }}>
                {formatClock(new Date(step.scheduledAt))}
              </Text>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{step.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Build error */}
      {buildError && (
        <Text style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{buildError}</Text>
      )}

      {/* Action */}
      {data.state === "active" && (
        <Pressable
          onPress={handleBuild}
          disabled={loading}
          style={{
            backgroundColor: "#4ade80",
            paddingVertical: 12,
            borderRadius: 10,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>Build it</Text>
          )}
        </Pressable>
      )}
      {isConfirmed && data.createdCookId && (
        <Pressable
          onPress={() => onViewCook(data.createdCookId!)}
          style={{
            borderWidth: 1,
            borderColor: "#4ade80",
            paddingVertical: 10,
            borderRadius: 10,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#4ade80", fontWeight: "600" }}>View cook →</Text>
        </Pressable>
      )}
    </View>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <Text style={{ color: "#bbb", fontSize: 13 }}>
      {icon}  {label}
    </Text>
  );
}

function ReminderRow({ state }: { state: PermissionState }) {
  if (state === "denied") {
    return (
      <Pressable onPress={() => Linking.openSettings()}>
        <Text style={{ color: "#fbbf24", fontSize: 13 }}>
          ⚠️  Enable reminders in settings
        </Text>
      </Pressable>
    );
  }
  return <Text style={{ color: "#bbb", fontSize: 13 }}>🔔  With step reminders</Text>;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/components/PlanPreviewCard.tsx
git commit -m "feat(mobile): add PlanPreviewCard component"
```

---

### Task 16: Build `StartNewCookCard` component

**Files:**
- Create: `packages/mobile/components/StartNewCookCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import { View, Text, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import { router } from "expo-router";

interface Props {
  variant?: "compact" | "prominent";
}

export function StartNewCookCard({ variant = "compact" }: Props) {
  const prominent = variant === "prominent";
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/(chat)?new=1" as any)}
      style={{
        backgroundColor: "#1a1a2a",
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#c9a0dc",
        paddingVertical: prominent ? 28 : 16,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: prominent ? 44 : 36,
          height: prominent ? 44 : 36,
          borderRadius: prominent ? 22 : 18,
          backgroundColor: "#2a1a3a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={prominent ? 24 : 20} color="#c9a0dc" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: prominent ? 17 : 15, fontWeight: "600" }}>
          {prominent ? "Tap to start your first cook" : "Start a new cook"}
        </Text>
        <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
          Tell Mise what you're making
        </Text>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/components/StartNewCookCard.tsx
git commit -m "feat(mobile): add StartNewCookCard component"
```

---

### Task 17: Build `EnableNotificationsModal` component

**Files:**
- Create: `packages/mobile/components/EnableNotificationsModal.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Modal, View, Text, Pressable } from "react-native";

interface Props {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function EnableNotificationsModal({ visible, onEnable, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 18,
            padding: 22,
            width: "100%",
            maxWidth: 340,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 4 }}>🔔</Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
            Want reminders for each step?
          </Text>
          <Text style={{ color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Mise can ping you when it's time for the next step in your cook.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={onDismiss}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#2a2a3a",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#aaa", fontWeight: "600" }}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={onEnable}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#c9a0dc",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>Enable</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/components/EnableNotificationsModal.tsx
git commit -m "feat(mobile): add EnableNotificationsModal component"
```

---

### Task 18: Upgrade `CookCard` with emoji, pill, day-of-cook, Next box

**Files:**
- Modify: `packages/mobile/components/CookCard.tsx` (full rewrite)

- [ ] **Step 1: Replace file content**

```tsx
import { View, Text } from "react-native";
import type { CookWithSteps } from "@mise/shared";
import { emojiForCookTitle } from "../lib/emoji-map";
import { computeDayOfCook, formatStartDate, formatTimeUntil } from "../lib/time-format";

interface CookCardProps {
  cook: CookWithSteps;
}

export function CookCard({ cook }: CookCardProps) {
  const isActive = cook.status === "planning" || cook.status === "active";
  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const total = cook.steps.length;
  const progress = total > 0 ? completedSteps / total : 0;

  const now = new Date();
  const nextStep = cook.steps.find((s) => s.status === "pending" || s.status === "notified");
  const stepDates = cook.steps.map((s) => new Date(s.scheduledAt));
  const dayInfo = computeDayOfCook(stepDates, now);
  const firstStepDate = stepDates.length > 0 ? stepDates[0] : null;
  const emoji = emojiForCookTitle(cook.title);

  const subtitleLeft = dayInfo.startsInFuture ? dayInfo.label : dayInfo.label;
  const subtitleRight = firstStepDate ? `Started ${formatStartDate(firstStepDate)}` : "";

  return (
    <View
      style={{
        backgroundColor: "#1a1a2a",
        borderRadius: 14,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: "#4ade80",
      }}
    >
      {/* Header row */}
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff", flex: 1 }}>
          {emoji} {cook.title}
        </Text>
        {isActive && (
          <View
            style={{ backgroundColor: "#1a3a2a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}
          >
            <Text style={{ color: "#4ade80", fontSize: 11, fontWeight: "700" }}>Active</Text>
          </View>
        )}
      </View>

      {/* Day X of Y · Started */}
      <Text style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        {subtitleLeft}
        {subtitleRight ? ` · ${subtitleRight}` : ""}
      </Text>

      {/* Progress bar + % */}
      {total > 0 && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                flex: 1,
                height: 6,
                backgroundColor: "#333",
                borderRadius: 3,
              }}
            >
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: 6,
                  backgroundColor: "#4ade80",
                  borderRadius: 3,
                }}
              />
            </View>
            <Text style={{ color: "#888", fontSize: 12, fontWeight: "600", minWidth: 34, textAlign: "right" }}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>
            {completedSteps} of {total} steps complete
          </Text>
        </View>
      )}

      {/* Next step box */}
      {isActive && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#12121f",
            borderRadius: 10,
            padding: 10,
          }}
        >
          {nextStep ? (
            <>
              <Text style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Next
              </Text>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 }}>
                {nextStep.title}
              </Text>
              <Text style={{ color: "#4ade80", fontSize: 12, marginTop: 2 }}>
                {formatTimeUntil(new Date(nextStep.scheduledAt), now)}
              </Text>
            </>
          ) : (
            <Text style={{ color: "#888", fontSize: 12 }}>
              All steps complete — mark cook done on detail screen.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/components/CookCard.tsx
git commit -m "feat(mobile): upgrade CookCard with emoji, status pill, day-of-cook, next-step box"
```

---

## Phase 7 — Screens

### Task 19: Refactor Home (Cooks screen)

**Files:**
- Modify: `packages/mobile/app/(tabs)/(cooks)/index.tsx`

- [ ] **Step 1: Rewrite the screen**

```tsx
import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import { listCooks } from "../../../lib/api";
import { CookCard } from "../../../components/CookCard";
import { StartNewCookCard } from "../../../components/StartNewCookCard";
import { getGreeting } from "../../../lib/time-format";

export default function CooksScreen() {
  const { activeCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (error) {
      console.error("[Cooks] fetch error:", error);
    }
  }, [setCooks]);

  useFocusEffect(
    useCallback(() => {
      fetchCooks();
    }, [fetchCooks]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCooks();
    setRefreshing(false);
  };

  const count = activeCooks.length;
  const subtitle =
    count === 0
      ? "No cooks in progress."
      : count === 1
        ? "1 active cook today."
        : `${count} active cooks today.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#fff" }}>{getGreeting()}</Text>
        <Text style={{ fontSize: 14, color: "#888", marginTop: 4 }}>{subtitle}</Text>
      </View>

      <FlatList
        data={activeCooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/(cooks)/${item.id}` as any)}>
            <CookCard cook={item} />
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a0dc" />
        }
        ListFooterComponent={
          <View style={{ marginTop: count === 0 ? 80 : 4 }}>
            <StartNewCookCard variant={count === 0 ? "prominent" : "compact"} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/app/(tabs)/(cooks)/index.tsx
git commit -m "feat(mobile): redesign Home with greeting, count subtitle, and StartNewCookCard"
```

---

### Task 20: Refactor Chat screen — route params, greeting, PlanPreviewCard, Build it, remove NewCookSheet

**Files:**
- Modify: `packages/mobile/app/(tabs)/(chat)/index.tsx`
- Delete: `packages/mobile/components/NewCookSheet.tsx`

- [ ] **Step 1: Rewrite the chat screen**

Replace `packages/mobile/app/(tabs)/(chat)/index.tsx` with:

```tsx
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Plus } from "lucide-react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import {
  sendMessage,
  getConversation,
  createConversation,
  createCook,
  patchMessage,
  listConversations,
} from "../../../lib/api";
import { ChatBubble } from "../../../components/ChatBubble";
import { PlanPreviewCard, type PlanPreviewData } from "../../../components/PlanPreviewCard";
import { EnableNotificationsModal } from "../../../components/EnableNotificationsModal";
import { getPermissionState, requestPermissionAndRegister, type PermissionState } from "../../../lib/push-permissions";
import type { Message } from "@mise/shared";

export default function ChatScreen() {
  const { new: newParam, conversationId: conversationIdParam } = useLocalSearchParams<{
    new?: string;
    conversationId?: string;
  }>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [showEnableNotifs, setShowEnableNotifs] = useState(false);
  const [buildErrors, setBuildErrors] = useState<Record<string, string>>({});
  const [hasPromptedNotifs, setHasPromptedNotifs] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {
    activeConversationId,
    setActiveConversationId,
    isStreaming,
    setIsStreaming,
    streamingText,
    setStreamingText,
    appendStreamingText,
    mergeCook,
  } = useStore();

  // Load push permission state on mount.
  useEffect(() => {
    getPermissionState().then(setPermission);
  }, []);

  // Deep link: /chat/[conversationId] → set this as the active conversation.
  useEffect(() => {
    if (conversationIdParam && conversationIdParam !== activeConversationId) {
      setActiveConversationId(conversationIdParam);
    }
  }, [conversationIdParam, activeConversationId, setActiveConversationId]);

  // Handle `?new=1` — create a fresh conversation and focus input.
  useEffect(() => {
    if (newParam !== "1") return;
    (async () => {
      try {
        const { conversationId, messages: initial } = await createConversation();
        setActiveConversationId(conversationId);
        setMessages(initial as Message[]);
        // Strip the `new=1` param so a re-render doesn't loop.
        router.setParams({ new: undefined as any });
        setTimeout(() => inputRef.current?.focus(), 150);
      } catch (err) {
        console.error("[Chat] createConversation error:", err);
      }
    })();
  }, [newParam, setActiveConversationId]);

  // On focus, if there's no active conversation (and no deep-link param), load the most recent.
  useFocusEffect(
    useCallback(() => {
      if (newParam === "1") return;
      if (conversationIdParam) return;
      if (activeConversationId) return;
      (async () => {
        try {
          const convos = await listConversations();
          if (convos.length > 0) setActiveConversationId(convos[0].id);
        } catch (err) {
          console.error("[Chat] listConversations error:", err);
        }
      })();
    }, [activeConversationId, conversationIdParam, newParam, setActiveConversationId]),
  );

  // Load messages when activeConversationId changes.
  useEffect(() => {
    if (!activeConversationId) return;
    getConversation(activeConversationId).then((convo) => {
      setMessages(convo.messages);
    });
  }, [activeConversationId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Make sure we have a conversation.
    let convoId = activeConversationId;
    if (!convoId) {
      const created = await createConversation();
      convoId = created.conversationId;
      setActiveConversationId(convoId);
      setMessages(created.messages as Message[]);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      conversationId: convoId,
      role: "user",
      content: text,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    try {
      const { stream } = await sendMessage({ message: text, conversationId: convoId });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        appendStreamingText(chunk);
      }

      // Refetch conversation to pick up the assistant message (including toolCalls) persisted server-side.
      const convo = await getConversation(convoId);
      setMessages(convo.messages);
    } catch (err) {
      console.error("[Chat] send error:", err);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  }, [input, activeConversationId, isStreaming]);

  const handleNewChat = useCallback(async () => {
    try {
      const { conversationId, messages: initial } = await createConversation();
      setActiveConversationId(conversationId);
      setMessages(initial as Message[]);
      setTimeout(() => inputRef.current?.focus(), 150);
    } catch (err) {
      console.error("[Chat] new-chat error:", err);
    }
  }, [setActiveConversationId]);

  // Derive the latest active propose_plan proposalId in this conversation (others are superseded/confirmed).
  const latestActiveProposalId = useMemo(() => {
    let latest: string | null = null;
    for (const m of messages) {
      const tc = Array.isArray(m.toolCalls) ? (m.toolCalls as any[]) : [];
      for (const entry of tc) {
        if (entry?.toolName === "propose_plan" && entry?.output?.state === "active") {
          latest = entry.output.proposalId;
        }
      }
    }
    return latest;
  }, [messages]);

  const handleBuild = useCallback(
    async (message: Message, plan: PlanPreviewData) => {
      try {
        const cook = await createCook(plan.proposalId, {
          conversationId: message.conversationId,
          title: plan.title,
          targetTime: plan.targetTime,
          steps: plan.steps.map(({ title, description, scheduledAt }) => ({
            title,
            description,
            scheduledAt,
          })),
        });
        mergeCook(cook);
        await patchMessage(message.conversationId, message.id, {
          proposalState: "confirmed",
          createdCookId: cook.id,
        });
        // Patch the local message so the card re-renders as confirmed.
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== message.id) return m;
            const tc = Array.isArray(m.toolCalls) ? (m.toolCalls as any[]) : [];
            return {
              ...m,
              toolCalls: tc.map((entry) =>
                entry?.toolName === "propose_plan" && entry.output?.proposalId === plan.proposalId
                  ? { ...entry, output: { ...entry.output, state: "confirmed", createdCookId: cook.id } }
                  : entry,
              ),
            };
          }),
        );
        setBuildErrors((e) => ({ ...e, [plan.proposalId]: "" }));

        // First successful Build it → prompt for notifications if undetermined.
        if (!hasPromptedNotifs) {
          setHasPromptedNotifs(true);
          if (permission === "undetermined") setShowEnableNotifs(true);
        }
      } catch (err: any) {
        const msg =
          err?.status === 422
            ? "This plan is out of date — ask Mise to redo it."
            : err?.message ?? "Failed to build — try again.";
        setBuildErrors((e) => ({ ...e, [plan.proposalId]: msg }));
      }
    },
    [mergeCook, hasPromptedNotifs, permission],
  );

  const handleEnableNotifs = useCallback(async () => {
    setShowEnableNotifs(false);
    const newState = await requestPermissionAndRegister();
    setPermission(newState);
  }, []);

  // Render a single message (optionally accompanied by a PlanPreviewCard).
  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const toolCalls = Array.isArray(item.toolCalls) ? (item.toolCalls as any[]) : [];
      const planCall = toolCalls.find((t) => t?.toolName === "propose_plan");
      return (
        <View>
          {item.content ? <ChatBubble message={item} /> : null}
          {planCall && planCall.output ? (
            <PlanPreviewCard
              data={planCall.output as PlanPreviewData}
              pushPermission={permission}
              onBuild={() => handleBuild(item, planCall.output as PlanPreviewData)}
              onViewCook={(cookId) => router.push(`/(tabs)/(cooks)/${cookId}` as any)}
              buildError={buildErrors[planCall.output.proposalId] || null}
            />
          ) : null}
        </View>
      );
    },
    [permission, buildErrors, handleBuild],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View style={{ width: 40 }} />
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#c9a0dc" }}>Mise</Text>
          <Pressable
            onPress={handleNewChat}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={22} color="#c9a0dc" />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isStreaming && streamingText ? (
              <ChatBubble
                message={{
                  id: "streaming",
                  conversationId: "",
                  role: "assistant",
                  content: streamingText,
                  toolCalls: null,
                  createdAt: new Date().toISOString(),
                }}
              />
            ) : null
          }
        />

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            padding: 12,
            paddingBottom: Platform.OS === "ios" ? 28 : 12,
            gap: 8,
            backgroundColor: "#0a0a0a",
          }}
        >
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="What are you cooking?"
            placeholderTextColor="#555"
            multiline
            style={{
              flex: 1,
              backgroundColor: "#1a1a2a",
              borderWidth: 1,
              borderColor: "#333",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: "#fff",
              fontSize: 15,
              maxHeight: 100,
            }}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: input.trim() && !isStreaming ? "#6b3fa0" : "#333",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <EnableNotificationsModal
        visible={showEnableNotifs}
        onEnable={handleEnableNotifs}
        onDismiss={() => setShowEnableNotifs(false)}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Delete `NewCookSheet.tsx`**

```bash
rm packages/mobile/components/NewCookSheet.tsx
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```

Expected: no errors. If `@gorhom/bottom-sheet` now appears unused and the typecheck is clean, leave it in package.json — removal is out of scope for this plan.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/app/(tabs)/(chat)/index.tsx
git add -u packages/mobile/components/NewCookSheet.tsx
git commit -m "feat(mobile): refactor chat screen with propose/build flow, remove NewCookSheet"
```

---

### Task 21: Server-side supersession when a new propose_plan fires

**Files:**
- Modify: `packages/api/src/routes/chat.ts`

Revisions need to mark earlier `active` proposals as `superseded` in the DB so refreshes stay consistent. The simplest place is in `/chat`'s `onFinish` callback: when a new assistant message includes a `propose_plan` tool call, flip any earlier active ones in the same conversation to `superseded`.

- [ ] **Step 1: Update the `onFinish` callback in `chat.ts`**

Find the `onFinish` block (around line 69–83) and replace it with:

```ts
    onFinish: async ({ text, toolCalls }) => {
      // Shape the tool-call array we persist. For propose_plan, flatten the output onto the entry.
      const persistedToolCalls = toolCalls?.length
        ? toolCalls.map((t: any) => ({
            toolName: t.toolName,
            toolCallId: t.toolCallId,
            args: t.args,
            output: t.result ?? t.output ?? null,
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
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/api && bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routes/chat.ts
git commit -m "feat(api): supersede earlier active proposals when a new propose_plan fires"
```

---

### Task 22: Cook detail screen — cancel button, graceful 404, use conversationId directly

**Files:**
- Modify: `packages/mobile/app/(tabs)/(cooks)/[cookId].tsx`

- [ ] **Step 1: Update imports**

Replace top imports with:

```tsx
import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, MessageCircle } from "lucide-react-native";
import { getCook, updateStep, updateCook } from "../../../lib/api";
import { TimelineStep } from "../../../components/TimelineStep";
import type { CookWithSteps } from "@mise/shared";
```

- [ ] **Step 2: Update state and fetch to handle not-found as a distinct state**

Replace the state and `useEffect` block with:

```tsx
  const { cookId } = useLocalSearchParams<{ cookId: string }>();
  const [cook, setCook] = useState<CookWithSteps | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!cookId) return;
    getCook(cookId)
      .then((c) => setCook(c))
      .catch((err) => {
        if (/HTTP 404/i.test(err?.message ?? "")) {
          setNotFound(true);
        } else {
          console.error("[CookDetail] fetch error:", err);
        }
      })
      .finally(() => setLoading(false));
  }, [cookId]);
```

- [ ] **Step 3: Update "Cook not found" state to be the graceful 404**

Replace the `if (!cook)` block with:

```tsx
  if (notFound || !cook) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ padding: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color="#888" />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🍳</Text>
          <Text style={{ color: "#aaa", fontSize: 16, textAlign: "center" }}>
            This cook was removed.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 16,
              backgroundColor: "#2a1a3a",
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#c9a0dc", fontWeight: "600" }}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
```

- [ ] **Step 4: Use `cook.conversationId` for the chat icon**

Replace the chat-icon Pressable's `onPress` with:

```tsx
        <Pressable
          onPress={() => {
            if (cook.conversationId) {
              router.push(`/(tabs)/(chat)/${cook.conversationId}` as any);
            }
          }}
          hitSlop={8}
        >
          <MessageCircle size={22} color="#c9a0dc" />
        </Pressable>
```

- [ ] **Step 5: Add a Cancel cook button at the bottom of the ScrollView**

Inside the `<ScrollView>` after all `TimelineStep`s, add:

```tsx
        {cook.status !== "cancelled" && cook.status !== "completed" && (
          <Pressable
            onPress={() => {
              Alert.alert(
                "Cancel cook?",
                "This will stop reminders and remove it from Home. You can't undo this.",
                [
                  { text: "Keep cooking", style: "cancel" },
                  {
                    text: "Cancel cook",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await updateCook(cook.id, { status: "cancelled" });
                        router.back();
                      } catch (err) {
                        console.error("[CookDetail] cancel error:", err);
                      }
                    },
                  },
                ],
              );
            }}
            style={{
              marginTop: 24,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#5a1a1a",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#f87171", fontWeight: "600" }}>Cancel cook</Text>
          </Pressable>
        )}
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/app/(tabs)/(cooks)/[cookId].tsx
git commit -m "feat(mobile): cook detail — cancel cook, graceful 404, chat deep link"
```

---

### Task 23: Profile screen — Notifications row

**Files:**
- Modify: `packages/mobile/app/(tabs)/(profile)/index.tsx`

- [ ] **Step 1: Add a Notifications row that reflects current permission state**

Replace the file with:

```tsx
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut, Bell } from "lucide-react-native";
import { authClient } from "../../../lib/auth";
import {
  getPermissionState,
  requestPermissionAndRegister,
  type PermissionState,
} from "../../../lib/push-permissions";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const [permission, setPermission] = useState<PermissionState>("undetermined");

  const refresh = useCallback(async () => {
    setPermission(await getPermissionState());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  const handleNotificationsTap = async () => {
    if (permission === "undetermined") {
      const next = await requestPermissionAndRegister();
      setPermission(next);
      return;
    }
    if (permission === "denied") {
      Linking.openSettings();
      return;
    }
    // granted — no-op for v1
  };

  const notifValue =
    permission === "granted" ? "On" : permission === "denied" ? "Off" : "Not set";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#c9a0dc" }}>Profile</Text>
      </View>

      <View style={{ padding: 16, gap: 24 }}>
        {/* User info */}
        <View
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 12,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}>
            {session?.user?.name || "User"}
          </Text>
          <Text style={{ fontSize: 14, color: "#888" }}>{session?.user?.email}</Text>
        </View>

        {/* Notifications */}
        <Pressable
          onPress={handleNotificationsTap}
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Bell size={18} color="#c9a0dc" />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Step reminders</Text>
          </View>
          <Text style={{ color: "#888", fontSize: 14 }}>{notifValue}</Text>
        </Pressable>

        {/* About */}
        <View
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 12,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>About Mise</Text>
          <Text style={{ fontSize: 13, color: "#888", lineHeight: 20 }}>
            Your warm cooking companion. Tell Mise what you want to cook and when — we'll build the timing plan.
          </Text>
          <Text style={{ fontSize: 12, color: "#555", marginTop: 4 }}>v1.0.0</Text>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "#2a1a1a",
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontWeight: "600" }}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd packages/mobile && bun run typecheck
git add packages/mobile/app/(tabs)/(profile)/index.tsx
git commit -m "feat(mobile): add notifications row to profile"
```

---

## Phase 8 — Final verification

### Task 24: Full build + smoke test

- [ ] **Step 1: Run all tests and typechecks**

```bash
cd packages/api && bun test && bun run typecheck
cd ../mobile && bun run typecheck
```

Expected: API tests pass, both typechecks clean. Fix anything that fails.

- [ ] **Step 2: Smoke test the API end-to-end manually**

Start the stack from repo root: `docker compose up -d postgres` (or whatever the project uses for Postgres) then `bun run dev`. Authenticate (browser/mobile), then:

1. `POST /api/v1/conversations` — expect 201 with greeting message.
2. `POST /api/v1/chat` with `{ message: "smoke a 12lb brisket for Sunday 6pm", conversationId }` — expect SSE stream. After the stream closes, re-fetch the conversation via `GET /api/v1/conversations/:id` and verify the assistant message has a `toolCalls` entry with `toolName="propose_plan"` and `output.state="active"`.
3. `POST /api/v1/cooks` with `{ conversationId, title, targetTime, steps }` + `X-Proposal-Id: <proposalId from step 2>` — expect 201 with `CookWithSteps`.
4. Repeat step 3 — expect 200 (same cook returned, no duplicate).
5. `PATCH /api/v1/conversations/:id/messages/:msgId` with `{ proposalState: "confirmed", createdCookId }` — expect `{ ok: true }`. Re-fetch conversation; state should read `confirmed`.
6. `GET /api/v1/cooks` — expect the new cook in `active`.
7. `PATCH /api/v1/cooks/:id/steps/:stepId` marking the last step completed — expect the cook row to be `status="completed"`.

- [ ] **Step 3: Smoke test the mobile app**

Launch the mobile app (`bun --filter './packages/mobile' start` and open on simulator/device):

1. Land on Home (Cooks) as initial tab — confirm greeting and empty-state StartNewCookCard.
2. Tap StartNewCookCard → Chat opens with the canned greeting and autofocused input.
3. Type a brisket request, send. Assistant streams response and a plan preview card appears.
4. Ask for a change ("move start 30 min later"). A new plan preview appears below; the old one dims with "Revised".
5. Tap "Build it" on the active card. Loading → Built ✓ + "View cook →".
6. On a fresh device with undetermined permission: expect the notifications modal to pop right after Built. Accept or decline; verify the plan card's 🔔 row reflects the choice (granted: "With step reminders"; denied: "⚠️ Enable reminders in settings" tappable).
7. Tap "View cook →" → cook detail opens.
8. Tap the chat icon on cook detail → returns to the originating conversation.
9. Go back to Home → the new cook appears with Day X of Y, progress bar, Next box.
10. Mark all steps done on cook detail → the cook disappears from Home on next focus.
11. Create another cook, then tap Cancel cook on its detail → alert confirms → cook disappears from Home.

- [ ] **Step 4: Final commit if anything lingered**

```bash
git status
```

If there are any remaining staged/unstaged changes from the smoke test (e.g., config tweaks), fix or stash. Otherwise no commit needed.

---

## Plan scope summary (what this builds)

- Tabs reordered to `(cooks) → (chat) → (profile)`, Cooks as initial route.
- Home: greeting, active-cook count subtitle, upgraded CookCard (emoji, Active pill, Day X of Y · Started, progress bar + %, Next step box), StartNewCookCard at bottom. Completed cooks dropped from Home.
- Chat: one-conversation-at-a-time multi-cook-aware. New-chat button in header, no more NewCookSheet. AI uses a single `propose_plan` tool; active-cooks context injected into system prompt.
- `PlanPreviewCard` with `active | superseded | confirmed` states. "Build it" button calls `POST /cooks` (idempotent via `X-Proposal-Id`), merges the returned cook into the zustand store, and flips the message's `toolCalls.output.state` to `confirmed` via `PATCH /conversations/:id/messages/:msgId`.
- Server-side supersession: when `/chat` finishes with a new `propose_plan`, earlier active proposals in the same conversation get flipped to `superseded` in the DB.
- Notification prompt: one-tap modal fires after the first successful Build it in a session. Profile has a Notifications row that reflects and toggles permission state.
- Cook detail: graceful 404, Cancel cook button, chat icon uses `cook.conversationId` directly.
- Auto-complete: marking the last step completed flips the cook to `status="completed"` in the same transaction.
- One schema change: nullable unique `cooks.proposalId`. No other migrations.
