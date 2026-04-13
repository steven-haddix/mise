# Mise — Cook Flow Redesign

**Date:** 2026-04-12
**Status:** Approved for implementation planning
**Scope:** Restructure app so Home = active cooks dashboard, Chat = conversational cook creation via a propose→confirm flow.

---

## 1. Problem

Today the Chat tab is the app's first screen, Chat has both a conversational path and a modal sheet (`NewCookSheet`) for creating cooks, and once the AI creates a cook it does so in one shot with no user confirmation gate. The Cooks tab exists but is secondary and has no entrypoint to start a new cook — its empty state just tells users to go to another tab. The result is a flow that doesn't match the product's mental model: "your cooks" is where you live, and chatting with Mise is how you plan new ones.

## 2. Target flow

- **Home (Cooks tab, first tab)** = dashboard of active cooks. Each cook shows day-of-cook progress and its next step. At the bottom sits a prominent **"Start a new cook"** card that launches a new chat.
- **Chat tab** = one conversation at a time, multi-cook aware. When the user describes a cook, Mise proposes a full plan as an inline preview card. Nothing is written to the cooks table until the user taps **Build it**. Revisions are re-proposals that supersede the previous card. Confirmed cards become "Built ✓ View cook →" and the cook appears on Home.

## 3. Non-goals (v1)

- No AI write-tools against existing cooks (reschedule, add step, update).
- No conversation list UI.
- No history / past-cooks view.
- No cook editing UI beyond mark-step-done and cancel-cook.
- No per-cook notification preferences.
- No onboarding tour, analytics, or telemetry.

---

## 4. Navigation

### Tab order

`(cooks)` → `(chat)` → `(profile)`, with `initialRouteName="(cooks)"`. Cooks is the app's home.

### Routes & deep links

- `/(tabs)/(cooks)` — Home (active cook list + new-cook CTA).
- `/(tabs)/(cooks)/[cookId]` — Cook detail (existing timeline view, minor additions).
- `/(tabs)/(chat)` — Chat (most-recent-conversation resume).
- `/(tabs)/(chat)?new=1` — Chat in "new conversation" mode. On mount with `new=1`, the screen calls `POST /conversations`, drops the `new=1` param, loads the returned conversation with its greeting, and autofocuses the input.
- `/(tabs)/(chat)/[conversationId]` — Chat resuming a specific conversation (used by cook-detail → chat icon).
- `/(tabs)/(profile)` — Profile (existing, plus one Notifications row).

### Cross-tab transitions

- Home "Start a new cook" card → `/(tabs)/(chat)?new=1`.
- Chat plan-preview card, `confirmed` state, "View cook →" → `/(tabs)/(cooks)/[cookId]`.
- Cook detail chat icon → `/(tabs)/(chat)/[conversationId]`, where `conversationId` is derived by scanning the user's messages for the `propose_plan` tool call whose `output.createdCookId` matches the current cook.

---

## 5. Data model

Goal: minimal change. No new tables.

### `conversations`

- `cookId` column: **stop writing to it.** Column remains for backward compatibility with existing rows; treat as dead. Removal deferred.
- No other changes.

### `messages`

- `toolCalls` (jsonb) is now the source of truth for plan previews. Shape is locked (see §7).
- No new columns — proposal state lives inside the `toolCalls` JSON output.

### `cooks`

- **Add column `proposalId` (uuid, nullable, unique index).** Populated on insert by `POST /cooks` from the `X-Proposal-Id` header. Nullable so existing rows (and any future non-proposal-originated cooks) remain valid. Unique index makes idempotency DB-enforced (see §12).
- Status enum stays `planning | active | completed | cancelled`. `planning` is unused by new code (confirmed cooks go straight to `active`) but retained in the enum for schema stability.

### `cook_steps`

- No changes.

### New: no tables, no migrations

Explicitly: no `cook_proposals` table. Proposals are message-scoped.

---

## 6. API surface

### New endpoints

**`POST /api/v1/conversations`**
Creates a conversation row for the authenticated user and inserts one canned assistant message (the greeting — see §7). No LLM call.
Returns `{ conversationId, messages: [greetingMessage] }`.

**`POST /api/v1/cooks`**
Body: `{ title, targetTime, steps: [{title, description, scheduledAt}] }`.
Required header: `X-Proposal-Id: <uuid>`.
Creates `cooks` + `cook_steps` in one transaction, sets `status = "active"`, returns the full `CookWithSteps`.
**Idempotent on `X-Proposal-Id`:** a second request with the same proposal id returns the existing cook rather than creating a duplicate.
Validation: `targetTime` must be in the future, steps must be sorted by `scheduledAt` with all `scheduledAt <= targetTime`, every step must have a non-empty title, no zero or negative gaps between consecutive steps. Rejects with 422 and a human-readable error on violation.

**`PATCH /api/v1/conversations/:conversationId/messages/:messageId`**
Body: `{ proposalState: "confirmed" | "superseded", createdCookId?: string }`.
Updates the stored `toolCalls.output.state` and optional `createdCookId` on the specified message. Scoped to the authenticated user's messages. Used by the client after a confirm or by the server during a revision.

### Endpoints unchanged

- `POST /api/v1/chat` — streaming SSE, still the chat workhorse. The tool registry it passes to the AI changes (see §7).
- `GET /api/v1/conversations`, `GET /api/v1/conversations/:id`.
- `GET /api/v1/cooks` — returns `{ active, completed }`. Home only consumes `active`.
- `GET /api/v1/cooks/:id`.
- `PATCH /api/v1/cooks/:id` — status updates (used by cancel; also used by server-side auto-complete logic, below).
- `PATCH /api/v1/cooks/:id/steps/:stepId` — now additionally triggers server-side auto-complete: if this update flips the last non-completed step to completed, set `cooks.status = "completed"` in the same transaction.
- Push token routes unchanged.

### Endpoints removed

None. (The existing `create_cook` and `finalize_cook` AI tools are deleted — they're tool definitions, not routes.)

---

## 7. AI tools, prompt, and message shape

### Single tool: `propose_plan`

Pure function — no DB writes at tool-call time. Inputs and output:

```ts
// Model-generated args
{
  title: string,
  targetTime: string,         // ISO 8601
  steps: Array<{
    title: string,
    description: string,
    scheduledAt: string,      // ISO 8601
  }>
}

// Tool output (returned to model + stored verbatim in messages.toolCalls)
{
  proposalId: string,         // uuid, server-generated
  title: string,
  targetTime: string,
  steps: [...],               // echoed, each enriched with durationFromPrev (seconds)
  state: "active",            // becomes "superseded" or "confirmed" later
  createdCookId: null,        // set to cook id on confirm
  validationNotes: string[]   // server sanity checks; empty on success
}
```

On execution, the server also side-effects: for any prior assistant message in the same conversation whose `toolCalls.toolName === "propose_plan"` and `output.state === "active"`, update that message's `output.state` to `"superseded"`. This keeps chat history consistent even if the client is offline when the next proposal comes in.

### No other tools

Active cook context is **pushed** into the system prompt on every `/chat` request rather than pulled via a tool. Keeps the tool surface minimal and avoids round-trips.

### System prompt

Replace the current "Chef Catalyst / quirky kitchen scientist" persona with **Mise** — a warm, competent cooking companion. Name matches the app.

Core rules (the prompt must enforce):

1. **Never create or modify cooks silently.** Always emit `propose_plan` when the user wants a cook, then wait for user confirmation.
2. **When the user requests a change before confirm, emit a full new `propose_plan`** with the revised plan — not a delta.
3. **Never use hardcoded timing tables.** Every schedule is reasoned for the specific recipe, constraints, and target time.
4. **Don't mention internal state** (tool names, proposalIds, superseded messages). Talk about plans in natural language.

A dynamic block is appended per-request:

```
### Your active cooks
- Sourdough Boule — ready Apr 12, 6:00 PM. Next: Fold & stretch dough at 3:15 PM.
- Smoked Brisket — ready Apr 19, 6:00 PM. Next: Start smoker at 4:00 AM.
```

Populated from `cooks` + `cook_steps` filtered to `status in (planning, active)` for the user, with the soonest pending step per cook. Empty line if no active cooks.

### Greeting text (canned)

```
Hey Chef! 👨‍🍳 What are you looking to cook? I can help you plan any long cook — sourdough, smoked meats, ferments, you name it. Just tell me what you're making and when you want it ready.
```

Inserted as an assistant message by `POST /conversations`. Lives in one string constant in the API codebase.

---

## 8. Chat UI

### Entry states

| Entry | Behavior |
|---|---|
| Tab tap, ≥1 conversation exists | Open the most recent conversation. Keyboard not autofocused. |
| Tab tap, no conversations exist | Render a synthesized greeting-only empty state (no DB write). Autofocus input. As soon as the user sends anything, call `POST /conversations` to materialize the conversation, then `POST /chat` as normal. |
| Home "Start a new cook" CTA | Navigate to `/(tabs)/(chat)?new=1`. The screen calls `POST /conversations`, clears the `new=1` param, renders the greeting, autofocuses input. |
| Cook detail → chat icon | Resolve the origin conversation id (see §4), navigate to `/(tabs)/(chat)/[conversationId]`. No autofocus. |

### New component: `PlanPreviewCard`

Rendered wherever a message has `toolCalls.toolName === "propose_plan"`. Three visual states driven by `toolCalls.output.state`:

**`active`**
- Header: `{emoji} {title} Plan` — emoji from a client-side keyword map (🥖 sourdough/bread, 🥩 brisket/steak, 🍖 pork/ribs, 🧀 cheese, 🌱 ferment/kimchi, default 🍳).
- Meta rows:
  - 🕐 Start time: first step's `scheduledAt`, formatted per user locale (e.g. "4:00 AM").
  - ⏱️ Total time: humanized duration from first step to `targetTime` (e.g. "~14 hours").
  - 🔔 reminder row — see §10 for the conditional text.
- Tap to expand/collapse full step list (time + title per step). Collapsed by default.
- Primary button below card: **Build it** (green).

**`superseded`**
- ~60% opacity, title struck-through, small "Revised" pill top-right.
- Button hidden. Expand still works for reference.

**`confirmed`**
- "Built ✓" pill top-right (green).
- Primary button replaced by secondary **View cook →** that navigates to `/(tabs)/(cooks)/[createdCookId]`.
- Expand still works.

### Build it — client flow

1. Button → loading state.
2. Read `args` from the message's `toolCalls`.
3. `POST /api/v1/cooks` with the payload and `X-Proposal-Id: {proposalId}`.
4. On 2xx:
   - `PATCH /conversations/:id/messages/:msgId { proposalState: "confirmed", createdCookId }`.
   - Merge the returned `CookWithSteps` into the zustand `activeCooks` store so Home is up to date on next navigation.
   - Update local message, card re-renders as `confirmed`.
   - If push permission is `undetermined`, show the one-tap "Enable reminders" modal (see §10).
5. On 422 (stale / invalid plan): inline error under the card, button disabled until a new `propose_plan` emission arrives.
6. On network failure: button stays in retry state. No partial state on the server (transaction).

### Revision rendering

Pure rendering from `toolCalls.output.state`. No client-side logic decides supersession — the server sets it when the next `propose_plan` fires. This means two tabs viewing the same conversation stay consistent.

### Input behavior

- Autofocus on new-conversation open; not on resume.
- Input disabled + send button spinner during stream (existing behavior).
- Sending a non-revision message (clarifying question) with an `active` proposal does **not** cancel the proposal. Only a new `propose_plan` emission does.

### Chat header

- Title: **Mise** (centered).
- Right: **+ / new-chat** icon. Tap → `POST /conversations`, navigate to the new conversation. Gives users a fresh-start path from within chat.
- Remove the existing "+ New Cook" header button.
- **Delete `NewCookSheet.tsx`** and its import. Chat is the only creation UI.

### Tool call registry

A single switch in the message renderer decides how to display tool calls. In v1 it has one branch (`propose_plan` → `PlanPreviewCard`) and a fallback that ignores unknown tools. Future tools slot in here without touching the bubble code.

---

## 9. Home (Cooks tab)

### Layout

1. Greeting (`h1`) — time-of-day based (see below).
2. Count subtitle.
3. List of `CookCard`s for each `status in (planning, active)` cook, sorted by earliest-pending-step-time ascending (most imminent first).
4. `StartNewCookCard` pinned at the bottom of the list (inline — not a floating FAB).

Completed and cancelled cooks are **not shown** in v1.

### Greeting

Time-of-day based, device local time:

| Local hour | Greeting |
|---|---|
| 05:00–11:59 | Good morning, Chef |
| 12:00–16:59 | Good afternoon, Chef |
| 17:00–21:59 | Good evening, Chef |
| 22:00–04:59 | Up late, Chef |

### Subtitle

- 0 active cooks → "No cooks in progress."
- 1 active cook → "1 active cook today."
- N ≥ 2 → "N active cooks today."

"Today" is decorative; N is simply the count of shown cooks.

### `CookCard` — upgrade existing component

Additions on top of today's card (title, targetTime, progress bar, next-step summary):

- **Emoji** prefix next to title, from the keyword map.
- **Status pill** "Active" (green) in the top-right.
- **"Day X of Y · Started {mmm dd}"** subtitle line:
  - `Y` = count of unique calendar days (local tz) across all steps, minimum 1.
  - `X` = count of unique calendar days from the first step's day through today (local), clamped `[1, Y]`. If today is before the first step's day, subtitle becomes "Starts {relative}" (e.g., "Starts tomorrow", "Starts in 3 days").
  - Started date = first step's `scheduledAt`, formatted `Apr 10`.
- **Progress bar** with a percentage readout on the right (e.g. "57%"). `{completed}/{total} steps complete` text below.
- **Next step box** (inner rounded card):
  - "Next: {title}"
  - Time-until: "Now" (≤ 1 min), "N minutes", "N hours", "Tomorrow at 4 AM", "Thu at 4 AM" (fallback for >1 day out).
  - If no pending steps remain but cook is still `active`: "All steps complete — mark done on detail screen."

Tap → existing cook detail.

### `StartNewCookCard`

- Rounded card, subtle border, ⊕ icon.
- Title: "Start a new cook". Subtitle: "Tell Mise what you're making."
- Always rendered at the bottom of the list, also when list is empty.
- Tap → `/(tabs)/(chat)?new=1`.

### Empty state

Greeting still at top. Subtitle reads "No cooks in progress." No cook cards. `StartNewCookCard` gets slightly larger visual prominence, copy shifts to "Tap to start your first cook."

### Pull-to-refresh & post-confirm updates

- Pull-to-refresh keeps existing behavior: re-fetch `GET /cooks`.
- Post-confirm: the chat Build-it flow merges the new cook into the zustand store (§8). Home reads from the store — the cook appears on next focus without a refetch.
- Post-step-complete: existing behavior updates the store; Home re-renders on focus.
- Post-auto-complete: server transitions cook to `completed`, which removes it from Home's filter; next refresh (focus or pull) drops it from the list.

---

## 10. Push notifications

### Permission prompt

On the first successful `POST /cooks` response in a session:

1. Check Expo push permission status.
2. If `undetermined`, show a small modal: *"Want reminders for each step? Mise can ping you when it's time."* Buttons: **[Enable]** / **[Not now]**.
3. On **Enable**: request permission; on grant, register token via existing `POST /push-tokens`. On deny, silently dismiss.
4. On **Not now**: dismiss, don't auto-prompt again this session.
5. If permission is already `granted`: no modal; tokens are expected to have been registered at app boot (existing behavior).
6. If permission is already `denied`: no modal here — the user can re-enable in Profile → Notifications.

### Profile tab — Notifications row

Single row under user info:

- Label: "Step reminders".
- Value: "On" (permission granted + token registered), "Off" (denied), "Not set" (undetermined).
- Tap behavior: if undetermined → request permission. If denied → open device settings. If granted → no-op (or future toggle).

### Plan preview card — reminder row honesty

The 🔔 row adapts to permission state at render time:

| Permission | Row text | Tap behavior |
|---|---|---|
| `granted` | "With step reminders" | none |
| `undetermined` | "With step reminders" | none (prompt comes right after Build it) |
| `denied` | "⚠️ Enable reminders in settings" | opens device settings |

### Worker

Unchanged. Polls every 30s, sends Expo push notifications for due `pending` steps, flips step status to `notified`.

---

## 11. Cook detail (minor additions)

Base screen is unchanged (header, timeline, mark-done buttons, progress). Additions:

- **Cancel cook button** near the bottom (destructive red). Tap → confirm alert → `PATCH /cooks/:id { status: "cancelled" }`. After success, navigate back to Home. Cancelled cook is no longer listed.
- **Graceful 404**: if the cook id doesn't resolve (e.g., user taps "View cook →" on an old chat after deleting the cook), show a small "This cook was removed." message with a Back button. In v1.

No edit UI for cook title, target time, or steps in v1.

---

## 12. Validation & error handling

### Server-side `propose_plan` validation (runs inside the tool)

- `targetTime` parseable ISO 8601 and `> now`.
- `steps` non-empty, each with non-empty title and description, each `scheduledAt` parseable ISO 8601.
- Steps sorted by `scheduledAt` ascending. Each `scheduledAt <= targetTime`.
- No two consecutive steps with `scheduledAt` difference ≤ 0 seconds.
- On violation → populate `validationNotes` with human-readable strings; `state` still `"active"` so the card renders, but the AI sees the notes and re-proposes in the same turn. After 2 failed attempts, prompt returns a plain-text apology/clarifying question instead of another proposal.

### Server-side `POST /cooks` validation

- Re-validates everything above (defense in depth; tool output could theoretically be tampered with by a malicious client).
- Rejects with 422 and a readable message on any failure.

### Idempotency key handling

- `X-Proposal-Id` required on `POST /cooks`. Server inserts cook with `proposalId` set from the header value. Uniqueness is enforced by the DB index on `cooks.proposalId`.
- On unique-constraint violation (i.e. a prior request with the same `proposalId` already created a cook), server catches the error, fetches the existing cook by `proposalId`, and returns it (with 200, not 201) as if the request had been the original. Result: double-taps and retries are safe even when they race with the original request's message PATCH.

### Double-tap / race

Idempotency covers double-taps. Races across devices covered by the server-side supersession logic (§7).

### Stale proposal after app resumes

If a user opens chat hours later and taps Build it on a proposal whose `targetTime` is now in the past, `POST /cooks` rejects with a 422. Card shows inline error; user asks Mise to re-plan.

---

## 13. Testing scope

### Unit

- `propose_plan` validation function: happy paths, each rejection case.
- Day-of-cook computation (X/Y) for edge cases: single-day cook, cook spanning DST boundary, cook starting tomorrow, cook running past its expected end.
- Time-until formatter for Next step: "Now", minutes, hours, "Tomorrow at X", day-of-week fallback.
- Emoji keyword mapping defaults and fallback.
- Permission-aware reminder-row text.

### Integration

- End-to-end happy path: Home empty → Start a new cook → greeting → user message → `propose_plan` emitted → preview card renders → Build it → cook appears on Home → worker sends push at first step time.
- Revision: propose A → propose B in same conversation → A becomes `superseded` in DB and in re-rendered UI.
- Idempotency: two `POST /cooks` with the same `X-Proposal-Id` return the same `cookId`, no duplicate rows.
- Auto-complete: mark last step done → cook transitions to `completed` in the same transaction.

### Manual

- Permission-prompt flow on a fresh device: decline → check row reads "⚠️ Enable reminders in settings"; then grant via settings → row flips to "With step reminders".
- Deep link from cook detail → chat correctly lands on the conversation that created this cook.
- Stale proposal: create cook, advance the device clock past `targetTime`, tap Build it on the original proposal, confirm 422 path is clean.

---

## 14. Rollout notes

- One-developer dev project; no feature flags needed.
- **One migration:** add `cooks.proposalId` (uuid, nullable, unique). No data backfill — existing rows stay `NULL`.
- `conversations.cookId` left as a dead column; removal deferred.
- `planning` cook status unused going forward but kept in the enum to avoid schema churn.
- No data migration for existing conversations — they keep working as-is. Any old `toolCalls` JSON from the previous `create_cook`/`finalize_cook` tools will not match the new `propose_plan` renderer and will be ignored by the registry (default branch renders nothing, existing `content` bubble renders normally). Acceptable since there is no production data at this stage.
