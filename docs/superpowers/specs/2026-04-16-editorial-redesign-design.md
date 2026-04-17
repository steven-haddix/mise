# Editorial Redesign — Design Spec

**Date:** 2026-04-16
**Status:** Design approved, pending implementation plan
**Scope:** `packages/mobile` (Expo / React Native app)

---

## 1. Motivation

The current mobile app ships a dark, utilitarian theme with system sans fonts. The `mise-app-v1.pen` source file and reference screenshot describe a fully realized editorial aesthetic: cream surfaces, dark olive "ink" cards, saturated terracotta accents, and a typographic voice mixing Newsreader (serif display), Geist (sans body), and IBM Plex Mono (eyebrow labels). This redesign adopts the editorial system wholesale as the new app identity while keeping the existing chat experience intact and blending the standalone NewPrep concept into the Home surface.

## 2. Goals

- Adopt the editorial palette, typography, and compositional patterns from the .pen file as the default (and only) theme.
- Collapse "start a new prep" into the Home screen as a chat composer + quick-start chips that hand off to the existing chat flow.
- Preserve the functional behavior of chat, cook detail, profile, and login; re-skin them into the new language.
- Introduce a reusable primitives layer so editorial patterns (eyebrow labels, serif displays, ink cards, step rows) are composable across surfaces.

## 3. Non-goals

- No onboarding/welcome screen. The `Screen/Welcome` frame from the .pen is explicitly dropped.
- No dual-theme toggle. Dark mode is removed; no feature flag.
- App icon and splash refresh are **out of scope** for this branch — tracked separately because they need new image assets.
- No rewrite of API, data layer, store, or routing structure beyond what the Home composer requires.
- No cook-title emoji replacement logic. Emojis are removed entirely, not swapped for icons.

## 4. Information architecture

Tab structure stays at three tabs (IA-1): **Home · Chat · Profile**.

- **Home** absorbs the NewPrep concept. It is today's state + a chat composer + quick-start chips. It is also the entry point to "All cooks" via a push screen (non-tab).
- **Chat** is structurally unchanged: conversations list → conversation detail. Composing on Home creates a new conversation, seeds the first user message, and navigates here.
- **Profile** is a simple settings screen — re-skin only.

The Home list is **step-centric**, not cook-centric: "On the schedule" shows the next 4–6 upcoming steps across all active cooks. Active cooks are accessible via a small footer ListRow that pushes to `/(cooks)/all`.

## 5. Foundation

### 5.1 Design tokens

Replace `packages/mobile/global.css` with the .pen variable set. Semantic names are kept (`--color-background`, `--color-foreground`, `--color-primary`, `--color-accent`) so existing className usages compile; the underlying values change.

| Token | Hex | Role |
|-------|-----|------|
| `bg-base` | `#F4EDE1` | App background (cream) |
| `bg-elevated` | `#FFFFFF` | Elevated cards (white) |
| `bg-surface` | `#FBF6EC` | Soft surface (notepad-cream) |
| `bg-ink` | `#2F3D2A` | Dark olive (InkCard fill) |
| `bg-ink-soft` | `#3C4B37` | Lighter olive (InkCard secondary) |
| `ink-primary` | `#1A1612` | Primary text |
| `ink-secondary` | `#6B635A` | Secondary text |
| `ink-tertiary` | `#9E9488` | Tertiary text / disabled |
| `ink-inverse` | `#F4EDE1` | Text on ink surfaces |
| `ink-inverse-soft` | `#C9C4AE` | Secondary text on ink |
| `accent` | `#C55A31` | Saturated terracotta — primary CTA, active states |
| `accent-soft` | `#E89970` | Accent hover / pressed |
| `accent-wash` | `#F3DDCC` | Accent surface (user message bubble) |
| `amber` | `#C88A2E` | Warning accent |
| `amber-wash` | `#F0DFC0` | Warning surface |
| `crimson` | `#9F3A32` | Destructive |
| `primary` | `#2F3D2A` | Alias of `bg-ink` (maps `--color-primary`) |
| `primary-soft` | `#4A5D42` | Primary hover |
| `primary-wash` | `#E4E6DA` | Primary surface (muted green) |
| `sage` | `#7B9268` | Sage accent (success dots, count chips) |
| `sage-wash` | `#DDE5D2` | Sage surface |
| `line` | `#E4DBC9` | Default hairline border |
| `line-strong` | `#1A1612` | Emphasized rule |
| `line-subtle` | `#EDE5D3` | Softer hairline |

Radius scale: `sm=8`, `md=12`, `lg=16`, `xl=24`, `pill=999`.
Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

`components/ui/tokens.ts` is rewritten to hex-mirror the new variables. Export shape stays identical so non-class consumers (`RefreshControl.tintColor`, `BlurView.tint`, `Spinner.color`, `Stack.contentStyle`) keep compiling.

### 5.2 Typography

Three Google Fonts families via `@expo-google-fonts/*`:

- **Newsreader** — `font-display`. Weights: `400`, `500`, `600`, plus `400italic` and `600italic`.
- **Geist** — `font-body` (default). Weights: `400`, `500`, `700`.
- **IBM Plex Mono** — `font-mono`. Weights: `400`, `500`.

Load via `useFonts` in `app/_layout.tsx`. Gate initial render on `fontsLoaded` to avoid flash-of-system-font.

### 5.3 Theme flip

Flip `ScopedTheme` in `app/_layout.tsx` from `"dark"` to `"light"`. Smoke-test HeroUI Native components (`Button`, `Chip`, `Input`, `Card`, `Dialog`, `Spinner`, `TextArea`) against the new tokens during the Foundation step. Expect 1–3 components to need `className` overrides where their light-mode defaults don't match the editorial palette.

## 6. Primitives (`components/ui/`)

### 6.1 New

- **`Eyebrow`** — `font-mono`, 11px, `tracking-[1.5px]`, `uppercase`. Color prop: `accent` (default) | `ink-tertiary` | `ink-inverse-soft`. Used above headings and between list groups.
- **`Display`** — Newsreader heading. Sizes: `xs` (20), `sm` (24), `md` (32), `lg` (40), `xl` (48). Optional `italic` prop. Weight defaults to `500`.
- **`InkCard`** — `bg-primary` (olive) fill with cream text. Slot-based children; consumers compose eyebrow/heading/body/progress/actions. Rounded-lg. Drop shadow off.
- **`StepRow`** — Atomic row. Time gutter (mono `10:05` stacked over `AM`) + Newsreader-italic title + Geist subtitle + trailing status dot. Status: `upcoming | next | active | done`. Dot colors: `upcoming` → `line`, `next`/`active` → `accent`, `done` → `primary` (olive). Optional `trailing` slot (e.g., duration pill); optional `expanded` slot (inline Mark-done button used in Timeline).
- **`Schedule`** — Cross-cook list composite. Flat `StepRow`s, subtitle shows cook name (e.g., "Country sourdough · 3 min active"). No vertical connector. Props: `steps`, `onSelect(step)`, `limit` (default `5`).
- **`Timeline`** — Single-cook day-grouped composite. Eyebrow divider per day ("TODAY" / "TOMORROW" / "FRI · APR 18"), thin vertical hairline linking dots within a group, subtitle shows step description. Active row expands inline to reveal Mark-done. Props: `steps`, `onMarkComplete(stepId)`.
- **`SectionHead`** — `Display` title + right-aligned `Chip` (sage-wash fill) with count. Used for "On the schedule · 4 steps", "Active cooks · 3".
- **`CookMeta`** — Horizontal three-column strip: `Target · Steps · Started`. Mono Eyebrow labels + Geist values + thin hairline progress bar under the row.

### 6.2 Re-skinned, same shape

- **`Screen`** — no code change; cream bg now resolves via token rename.
- **`AppHeader`** — restructured. New anatomy: optional `eyebrow` prop on the top row (mono), `Display` title centered below, back/right buttons rendered as small outline-ink icon buttons (not the current dark-card chip style).
- **`ListRow`** — `bg-elevated`, `line` border, Geist title, Newsreader value. Same props.

## 7. Product-level components (`components/`)

### 7.1 New

- **`HappeningNowCard`** — Wraps `InkCard`. Props: `step`, `cookTitle`, `targetAt`, `onMarkComplete`, `onSnooze`. Owns its live `mm:ss` countdown via a single `setInterval` memoized at the component level. Rendered on Home (when any cross-cook step is live) and Cook detail (when this cook has a live step).
- **`QuickStartChips`** — Horizontal scrollable row of `Chip`s styled `accent-wash` fill + accent text. Props: `chips: {label, prompt}[]`, `onSelect(prompt)`. V1 uses a static list: `Sourdough loaf`, `Smoked brisket`, `Weeknight pasta`, `Cold-brew coffee`. Tap creates a new conversation, seeds the prompt as the first user message, and pushes to Chat. Future enhancement (post-v1): favorites / recent cook titles / dynamic suggestions.
- **`ChatComposer`** — Extracted from the current inline chat input. Shell-only, fully controlled: `value`, `onChangeText`, `onSend`, `disabled`, `placeholder`. Cream-surface multiline Input + accent send icon-button. Used on Home ("What are you cooking?") and the existing Chat screen.

### 7.2 Rewritten (substantial)

- **`PlanPreviewCard`** — Full redesign. Keeps the existing `PlanPreviewData` interface and callback contract (`onBuild`, `onViewCook`). New anatomy:
  - Outer: `bg-elevated` white card, `line` border, radius-lg, `overflow-hidden`.
  - Top strip: `bg-primary` (olive) band with mono `Eyebrow` ("PROPOSAL" / "REVISED" / "BUILT") and Geist cook title. No emoji.
  - Body: `Display sm` cook name, then three meta rows using lucide icons (`Clock` start time, `Timer` total duration, `Bell` reminders). `AlertTriangle` for the denied-permission variant.
  - Expand affordance: accent text + `ChevronDown`. Expanded state renders the step list as a `Timeline` composite (day-grouped with vertical connector).
  - CTA: `Button variant="primary"` accent fill, ink-on-accent text — "Build it". `variant="outline"` with accent text for "View cook →".
- **`CookCard`** — Redesign for the new `/(cooks)/all` list screen. Drop sage left-border stripe. `bg-elevated` + `line` border + radius-lg + Newsreader italic title + mono meta row + hairline progress bar + right-aligned status chip (accent for active, `ink-tertiary` for complete). Emoji removed.

### 7.3 Re-skinned, same behavior

- **`ChatBubble`** — user: `bg-accent-wash` + `ink-primary`, radius-lg, right-aligned. Assistant: `bg-elevated` + `line-subtle` border + `ink-primary`, left-aligned. Same props.
- **`EnableNotificationsModal`** — `Display sm` title, Geist body, accent primary CTA, tertiary dismiss.

### 7.4 Deleted

- **`lib/emoji-map.ts`** and all call sites — replaced by typographic restraint.
- **`components/StartNewCookCard.tsx`** — absorbed into `ChatComposer` + `QuickStartChips` on Home.
- **`components/TimelineStep.tsx`** — folded into `StepRow` via status prop and expandable slot.

### 7.5 Untouched

- `lib/api.ts`, `lib/store.ts`, `lib/auth.ts`, `lib/config.ts`, `lib/push-permissions.ts`, `lib/time-format.ts`, `lib/time-format.test.ts` — no changes.

## 8. Screens

### 8.1 Home — `app/(tabs)/(cooks)/index.tsx`

Vertical flow, top to bottom:

1. Date `Eyebrow` (mono, accent): `THU · APR 16 · DAY 2 OF 3` (the "DAY N OF M" suffix renders only when there is an active multi-day cook; otherwise `THU · APR 16`).
2. `Display lg` greeting via `getGreeting()`: `"Good morning, Steven."`.
3. `HappeningNowCard` — conditionally rendered when any cross-cook step is `notified` or overdue.
4. `SectionHead` `"On the schedule"` + sage count chip.
5. `Schedule limit={5}` — flat list of the next upcoming steps across all active cooks. Each row's `onSelect` pushes to `/(tabs)/(cooks)/[cookId]` anchored on the step.
6. Hairline divider + `Eyebrow` `"START A PREP"`.
7. `ChatComposer` — submits create a new conversation, seed message, navigate to Chat detail.
8. `QuickStartChips` — tap creates a conversation seeded with the chip's prompt, navigates to Chat detail.
9. Muted `ListRow` `"Active cooks · N"` pushing to `/(tabs)/(cooks)/all`.

**Empty state (no active cooks, no steps):** skip `HappeningNowCard` and `Schedule` entirely. Date eyebrow → `Display md` `"What are we cooking today?"` → composer and chips at full prominence. Warm, not barren.

**Keyboard behavior:** Home's scroll container is wrapped in `KeyboardAvoidingView` so the composer lifts above the keyboard when focused.

### 8.2 Cook detail — `app/(tabs)/(cooks)/[cookId].tsx`

- `AppHeader` with `eyebrow` + cook title in `Display md` italic + back button + chat icon button (if `cook.conversationId` exists). Eyebrow renders `"COOK · DAY N OF M"` when the cook spans multiple days (derived from step dates); otherwise renders `"COOK"`.
- `CookMeta` strip: `Target · Steps · Started` + hairline progress bar.
- `HappeningNowCard` — conditionally rendered when this cook has a live step.
- `Timeline` — day-grouped `StepRow`s with vertical connector. Active step expands inline with Mark-done button.
- Ghost button with crimson label at the bottom: `"Cancel cook"`. Opens the existing `Dialog` flow (re-skinned).

### 8.3 Chat — `app/(tabs)/(chat)/index.tsx`

The data model does not currently store conversation titles, so no new title-derivation logic is introduced.

- `AppHeader` with `"Mise"` title in `Display sm` + plus-icon (accent) right action for new chat. No eyebrow.
- `FlatList` of messages using the re-skinned `ChatBubble`; `PlanPreviewCard` rendered per tool call as today.
- Bottom anchor: `ChatComposer` (same shell as Home). Controlled by local `input` state; send behavior unchanged.
- `EnableNotificationsModal` continues to trigger on first successful Build.

### 8.4 `/(cooks)/all` — new non-tab list screen

- `AppHeader` with `eyebrow="YOUR COOKS"` + title `"All cooks"`.
- `FlatList` of re-skinned `CookCard`s. Sections: Active, Completed. Pull-to-refresh.

### 8.5 Profile — `app/(tabs)/(profile)/index.tsx`

Simple re-skin only.

- `AppHeader` with `eyebrow="SETTINGS"` + `"Profile"` title.
- Existing `ListRow`s re-themed onto `bg-elevated` + `line` border. Destructive rows render with crimson title.

### 8.6 Login — `app/(auth)/login.tsx`

- Cream background (`bg-base`).
- Top-left Newsreader wordmark `"mise."`.
- Centered below: `Eyebrow` `"WELCOME"` + `Display md` `"Good to meet you."`.
- Providers stacked vertically: Apple + Google as outline-ink buttons (primary-wash fill, ink text). Email as `Button variant="primary"` accent.

## 9. Execution plan

### 9.1 Branch strategy

Single long-lived branch `editorial-redesign` off `main`. No feature flag, no dual-theme plumbing. One PR at the end.

### 9.2 Build order

1. **Foundation** — add `@expo-google-fonts/newsreader`, `@expo-google-fonts/geist`, `@expo-google-fonts/ibm-plex-mono`; wire `useFonts` + font gate in `_layout.tsx`; rewrite `global.css` tokens; rewrite `tokens.ts`; flip `ScopedTheme` to `"light"`; smoke-test HeroUI components.
2. **Primitives** — `Eyebrow`, `Display`, `InkCard`, `StepRow`, `Schedule`, `Timeline`, `SectionHead`, `CookMeta`. Built in isolation; no screen touches yet.
3. **Composites** — `HappeningNowCard`, `QuickStartChips`, `ChatComposer`; re-skin `AppHeader`, `ListRow`.
4. **Screens** — in user-visibility order: Home → Cook detail → Chat (incl. `PlanPreviewCard` rewrite) → Profile → Login. Create `/(cooks)/all` screen along with Home. Delete `StartNewCookCard`, `TimelineStep`, `lib/emoji-map.ts` as their call sites migrate.
5. **Cleanup** — remove unused styles, ensure `bun run typecheck` and `bun run fmt` are clean.

### 9.3 Risks

- **HeroUI Native light-mode defaults.** The project has never run against `ScopedTheme="light"`. Verify all components render correctly during step 1; overrides expected.
- **Live countdown perf.** `HappeningNowCard` ticks once per second. Use a memoized formatter and localize the timer to the card; don't trigger parent re-renders.
- **Keyboard handling on Home.** Composer must live inside a `KeyboardAvoidingView` with `behavior="padding"` (iOS) / `"height"` (Android) and a `keyboardVerticalOffset` that accounts for the tab bar height.
- **Font bundle size.** Load only the weights listed in §5.2 to avoid shipping unused variants.

### 9.4 Out of scope

- App icon and splash image refresh (tracked separately; requires new image assets).
- Dark mode reinstatement as a toggleable theme.
- Profile rethink beyond re-skin.
- Dynamic/personalized quick-start chip content (post-v1 enhancement).
- Any backend, API, or data-layer change.

## 10. Reference — package additions

- `@expo-google-fonts/newsreader`
- `@expo-google-fonts/geist`
- `@expo-google-fonts/ibm-plex-mono`

No other new runtime dependencies. `lucide-react-native`, `heroui-native`, `uniwind`, `tailwindcss`, and `tailwind-variants` are already installed.
