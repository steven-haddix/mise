# Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the mobile app from a dark utilitarian theme to the editorial cream-and-ink aesthetic described in `docs/superpowers/specs/2026-04-16-editorial-redesign-design.md`, absorbing the NewPrep flow into Home and re-skinning every screen while preserving behavior.

**Architecture:** Atomic branch `editorial-redesign` off `main`. Token swap and theme flip happen in one Foundation task; then primitives are added in `components/ui/`; then product composites; then re-skinned existing components; then screens are rewritten top-down; finally dead code is deleted. No feature flags, no dual-theme plumbing.

**Tech Stack:** Expo (~55), React Native (0.83), expo-router, HeroUI Native (1.0.0-rc.3), Uniwind (1.4) + Tailwind v4, `lucide-react-native`, `@expo-google-fonts/*`. Tests via `bun:test` (co-located). Formatter: `oxfmt`. Typecheck: `tsc --noEmit`.

**Execution preferences (per user memory):**
- Run the full plan straight through; skip per-task review. Review once at the end.
- Use **`bun`**, never `pnpm`/`npm`.

**Working directory for all shell commands:** `packages/mobile`.

---

## Task 1: Foundation — fonts, tokens, theme flip

**Files:**
- Modify: `packages/mobile/package.json`
- Modify: `packages/mobile/global.css`
- Modify: `packages/mobile/components/ui/tokens.ts`
- Modify: `packages/mobile/app/_layout.tsx`

- [ ] **Step 1: Create the branch**

```bash
cd /Users/steven/Code/mise
git checkout -b editorial-redesign
```

- [ ] **Step 2: Add Google Fonts packages**

```bash
cd packages/mobile
bun add @expo-google-fonts/newsreader @expo-google-fonts/geist @expo-google-fonts/ibm-plex-mono
```

- [ ] **Step 3: Rewrite `global.css` with editorial tokens**

Replace the entire contents of `packages/mobile/global.css`:

```css
@import "tailwindcss";
@import "uniwind";
@import "heroui-native/styles";

@source "./app";
@source "./components";
@source "./node_modules/heroui-native/lib";

@theme {
  /* Surfaces */
  --color-background: #F4EDE1;        /* bg-base (cream) */
  --color-foreground: #1A1612;        /* ink-primary */
  --color-card: #FFFFFF;              /* bg-elevated */
  --color-card-foreground: #1A1612;
  --color-popover: #FFFFFF;
  --color-popover-foreground: #1A1612;

  /* Primary = dark olive "ink" used for the InkCard fill */
  --color-primary: #2F3D2A;
  --color-primary-foreground: #F4EDE1;
  --color-primary-muted: #E4E6DA;     /* primary-wash */

  /* Accent = saturated terracotta used for CTAs and active states */
  --color-accent: #C55A31;
  --color-accent-foreground: #FFFFFF;

  /* Secondary / muted */
  --color-secondary: #E4DBC9;         /* line */
  --color-secondary-foreground: #1A1612;
  --color-muted: #EDE5D3;              /* line-subtle */
  --color-muted-foreground: #6B635A;  /* ink-secondary */

  /* Semantics */
  --color-success: #7B9268;           /* sage */
  --color-success-foreground: #FFFFFF;
  --color-success-muted: #DDE5D2;     /* sage-wash */
  --color-warning: #C88A2E;            /* amber */
  --color-warning-foreground: #1A1612;
  --color-warning-muted: #F0DFC0;     /* amber-wash */
  --color-danger: #9F3A32;             /* crimson */
  --color-danger-foreground: #F4EDE1;
  --color-danger-muted: #F3DDCC;      /* accent-wash */

  /* Borders / rings / inputs */
  --color-border: #E4DBC9;             /* line */
  --color-input: #EDE5D3;              /* line-subtle */
  --color-ring: #C55A31;               /* accent */

  /* Editorial-specific extras (referenced by className="bg-*" directly) */
  --color-surface: #FBF6EC;            /* bg-surface (notepad-cream) */
  --color-ink-soft: #3C4B37;           /* bg-ink-soft */
  --color-ink-tertiary: #9E9488;       /* ink-tertiary */
  --color-ink-inverse-soft: #C9C4AE;   /* ink-inverse-soft */
  --color-accent-soft: #E89970;        /* accent hover */
  --color-accent-wash: #F3DDCC;        /* accent surface */
  --color-sage-wash: #DDE5D2;

  /* Font families */
  --font-body: "Geist", system-ui, sans-serif;
  --font-display: "Newsreader", Georgia, serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

- [ ] **Step 4: Rewrite `components/ui/tokens.ts` hex mirrors**

Replace the entire contents of `packages/mobile/components/ui/tokens.ts`:

```ts
// Hex mirrors of the semantic CSS variables in global.css.
// Only use these in contexts that can't resolve Tailwind/Uniwind classes:
// Expo native config, RefreshControl tintColor, BlurView tint, Stack
// contentStyle, Spinner color prop, etc. Everywhere else, prefer
// className="bg-background text-foreground" over importing these.
// Keep this file in sync with global.css.

export const tokens = {
  background: "#F4EDE1",           // bg-base
  foreground: "#1A1612",           // ink-primary
  card: "#FFFFFF",                  // bg-elevated
  surface: "#FBF6EC",               // bg-surface
  primary: "#2F3D2A",               // bg-ink (olive)
  primaryForeground: "#F4EDE1",
  primaryMuted: "#E4E6DA",          // primary-wash
  primarySoft: "#4A5D42",
  inkSoft: "#3C4B37",
  secondary: "#E4DBC9",             // line
  muted: "#EDE5D3",                 // line-subtle
  mutedForeground: "#6B635A",       // ink-secondary
  inkTertiary: "#9E9488",
  inkInverseSoft: "#C9C4AE",
  accent: "#C55A31",                // terracotta
  accentForeground: "#FFFFFF",
  accentSoft: "#E89970",
  accentWash: "#F3DDCC",
  success: "#7B9268",               // sage
  successMuted: "#DDE5D2",          // sage-wash
  warning: "#C88A2E",               // amber
  warningMuted: "#F0DFC0",
  danger: "#9F3A32",                // crimson
  dangerMuted: "#F3DDCC",
  border: "#E4DBC9",
  // Native-chrome overlays (tab bar BlurView, hairline dividers)
  tabBarBackgroundAndroid: "rgba(244, 237, 225, 0.85)",
  hairlineBorder: "rgba(26, 22, 18, 0.08)",
} as const;
```

- [ ] **Step 5: Wire font loading + flip `ScopedTheme` to light**

Replace the entire contents of `packages/mobile/app/_layout.tsx`:

```tsx
import { View } from "react-native";
import "../global.css";
import { Stack, Redirect } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ScopedTheme } from "uniwind";
import { HeroUINativeProvider } from "heroui-native/provider";
import { Spinner } from "heroui-native";
import {
  useFonts as useNewsreader,
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_400Regular_Italic,
  Newsreader_600SemiBold_Italic,
} from "@expo-google-fonts/newsreader";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import { authClient } from "../lib/auth";
import { tokens } from "../components/ui/tokens";

export default function RootLayout() {
  const [fontsLoaded] = useNewsreader({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_400Regular_Italic,
    Newsreader_600SemiBold_Italic,
    Geist_400Regular,
    Geist_500Medium,
    Geist_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner color={tokens.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.background }}>
      <SafeAreaProvider>
        <ScopedTheme theme="light">
          <HeroUINativeProvider>
            <SessionGate />
          </HeroUINativeProvider>
        </ScopedTheme>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SessionGate() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner color={tokens.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.background },
        }}
      >
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      {!session && <Redirect href="/(auth)/login" />}
    </>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
cd packages/mobile
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/mobile/package.json packages/mobile/bun.lock packages/mobile/global.css packages/mobile/components/ui/tokens.ts packages/mobile/app/_layout.tsx
git commit -m "feat(mobile): flip to editorial cream-and-ink theme foundation"
```

---

## Task 2: Typographic primitives — Eyebrow, Display, SectionHead

**Files:**
- Create: `packages/mobile/components/ui/Eyebrow.tsx`
- Create: `packages/mobile/components/ui/Display.tsx`
- Create: `packages/mobile/components/ui/SectionHead.tsx`
- Modify: `packages/mobile/components/ui/index.ts`

- [ ] **Step 1: Create `Eyebrow`**

```tsx
// packages/mobile/components/ui/Eyebrow.tsx
import { Text, type TextProps } from "react-native";

type EyebrowColor = "accent" | "ink-tertiary" | "ink-inverse-soft";

interface EyebrowProps extends Omit<TextProps, "children"> {
  children: string;
  color?: EyebrowColor;
  className?: string;
}

const COLOR_CLASS: Record<EyebrowColor, string> = {
  accent: "text-accent",
  "ink-tertiary": "text-[#9E9488]",
  "ink-inverse-soft": "text-[#C9C4AE]",
};

export function Eyebrow({ children, color = "accent", className, ...rest }: EyebrowProps) {
  return (
    <Text
      {...rest}
      className={`font-mono text-[11px] uppercase tracking-[1.5px] ${COLOR_CLASS[color]} ${className ?? ""}`}
      style={[{ fontFamily: "IBMPlexMono_500Medium" }, rest.style]}
    >
      {children}
    </Text>
  );
}
```

- [ ] **Step 2: Create `Display`**

```tsx
// packages/mobile/components/ui/Display.tsx
import { Text, type TextProps } from "react-native";

type DisplaySize = "xs" | "sm" | "md" | "lg" | "xl";

interface DisplayProps extends Omit<TextProps, "children"> {
  children: React.ReactNode;
  size?: DisplaySize;
  italic?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<DisplaySize, string> = {
  xs: "text-[20px] leading-[26px]",
  sm: "text-[24px] leading-[30px]",
  md: "text-[32px] leading-[38px]",
  lg: "text-[40px] leading-[46px]",
  xl: "text-[48px] leading-[54px]",
};

export function Display({ children, size = "md", italic, className, ...rest }: DisplayProps) {
  const fontFamily = italic ? "Newsreader_600SemiBold_Italic" : "Newsreader_500Medium";
  return (
    <Text
      {...rest}
      className={`text-foreground ${SIZE_CLASS[size]} ${className ?? ""}`}
      style={[{ fontFamily }, rest.style]}
    >
      {children}
    </Text>
  );
}
```

- [ ] **Step 3: Create `SectionHead`**

```tsx
// packages/mobile/components/ui/SectionHead.tsx
import { View } from "react-native";
import { Chip } from "heroui-native";
import { Display } from "./Display";

interface SectionHeadProps {
  title: string;
  count?: number;
  countLabel?: string;
  italic?: boolean;
}

export function SectionHead({ title, count, countLabel, italic }: SectionHeadProps) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Display size="md" italic={italic}>{title}</Display>
      {typeof count === "number" && (
        <Chip size="sm" color="success" variant="soft" className="rounded-md h-6 px-2 bg-[#DDE5D2] border-0">
          <Chip.Label className="text-[11px] font-medium text-[#2F3D2A]">
            {count} {countLabel ?? (count === 1 ? "item" : "items")}
          </Chip.Label>
        </Chip>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Update `components/ui/index.ts`**

```ts
export { Screen } from "./Screen";
export { AppHeader } from "./AppHeader";
export { ListRow } from "./ListRow";
export { Eyebrow } from "./Eyebrow";
export { Display } from "./Display";
export { SectionHead } from "./SectionHead";
export { tokens } from "./tokens";
```

- [ ] **Step 5: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/mobile/components/ui/Eyebrow.tsx packages/mobile/components/ui/Display.tsx packages/mobile/components/ui/SectionHead.tsx packages/mobile/components/ui/index.ts
git commit -m "feat(mobile): add Eyebrow, Display, SectionHead primitives"
```

---

## Task 3: InkCard + CookMeta

**Files:**
- Create: `packages/mobile/components/ui/InkCard.tsx`
- Create: `packages/mobile/components/ui/CookMeta.tsx`
- Modify: `packages/mobile/components/ui/index.ts`

- [ ] **Step 1: Create `InkCard`**

```tsx
// packages/mobile/components/ui/InkCard.tsx
import { View, type ViewProps } from "react-native";

interface InkCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function InkCard({ children, className, ...rest }: InkCardProps) {
  return (
    <View
      {...rest}
      className={`bg-primary rounded-2xl p-5 ${className ?? ""}`}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Create `CookMeta`**

```tsx
// packages/mobile/components/ui/CookMeta.tsx
import { View, Text } from "react-native";
import { Eyebrow } from "./Eyebrow";

interface MetaColumn {
  label: string;
  value: string;
}

interface CookMetaProps {
  columns: MetaColumn[];
  progress?: number; // 0..1
  progressLabel?: string;
}

export function CookMeta({ columns, progress, progressLabel }: CookMetaProps) {
  return (
    <View className="px-6 py-4 border-b border-[#EDE5D3]">
      <View className="flex-row gap-6">
        {columns.map((c) => (
          <View key={c.label} className="flex-1">
            <Eyebrow color="ink-tertiary">{c.label}</Eyebrow>
            <Text
              className="text-foreground text-[16px] mt-1"
              style={{ fontFamily: "Geist_500Medium" }}
            >
              {c.value}
            </Text>
          </View>
        ))}
      </View>
      {typeof progress === "number" && (
        <View className="mt-4">
          <View className="h-[2px] bg-[#EDE5D3] rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          {progressLabel && (
            <Text
              className="text-[#9E9488] text-[11px] mt-2"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              {progressLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Update `components/ui/index.ts`**

```ts
export { Screen } from "./Screen";
export { AppHeader } from "./AppHeader";
export { ListRow } from "./ListRow";
export { Eyebrow } from "./Eyebrow";
export { Display } from "./Display";
export { SectionHead } from "./SectionHead";
export { InkCard } from "./InkCard";
export { CookMeta } from "./CookMeta";
export { tokens } from "./tokens";
```

- [ ] **Step 4: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/components/ui/InkCard.tsx packages/mobile/components/ui/CookMeta.tsx packages/mobile/components/ui/index.ts
git commit -m "feat(mobile): add InkCard and CookMeta primitives"
```

---

## Task 4: StepRow + Schedule + Timeline

**Files:**
- Create: `packages/mobile/components/ui/StepRow.tsx`
- Create: `packages/mobile/components/ui/Schedule.tsx`
- Create: `packages/mobile/components/ui/Timeline.tsx`
- Modify: `packages/mobile/components/ui/index.ts`

- [ ] **Step 1: Create `StepRow`**

```tsx
// packages/mobile/components/ui/StepRow.tsx
import { View, Text, Pressable } from "react-native";

export type StepStatus = "upcoming" | "next" | "active" | "done";

interface StepRowProps {
  time: string;      // "10:05"
  meridiem?: string; // "AM" / "PM" — optional (stacked under time when present)
  title: string;
  subtitle?: string;
  status: StepStatus;
  onPress?: () => void;
  trailing?: React.ReactNode;
  expanded?: React.ReactNode; // inline content under the row when active
}

const DOT: Record<StepStatus, string> = {
  upcoming: "bg-[#E4DBC9]",
  next: "bg-accent",
  active: "bg-accent",
  done: "bg-primary",
};

export function StepRow({
  time,
  meridiem,
  title,
  subtitle,
  status,
  onPress,
  trailing,
  expanded,
}: StepRowProps) {
  const inner = (
    <View className="flex-row items-start py-4 px-6">
      <View className="w-[56px]">
        <Text
          className="text-foreground text-[18px]"
          style={{ fontFamily: "Geist_500Medium" }}
        >
          {time}
        </Text>
        {meridiem && (
          <Text
            className="text-[#9E9488] text-[11px] mt-0.5"
            style={{ fontFamily: "IBMPlexMono_400Regular" }}
          >
            {meridiem}
          </Text>
        )}
      </View>
      <View className="flex-1 pr-3">
        <Text
          className={`text-[17px] leading-[22px] ${status === "upcoming" ? "text-[#6B635A]" : "text-foreground"}`}
          style={{ fontFamily: "Newsreader_400Regular_Italic" }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-[#6B635A] text-[13px] mt-1"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            {subtitle}
          </Text>
        )}
        {expanded && <View className="mt-3">{expanded}</View>}
      </View>
      <View className="items-center justify-center pt-2">
        {trailing ?? <View className={`w-2.5 h-2.5 rounded-full ${DOT[status]}`} />}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{inner}</Pressable>;
  }
  return inner;
}
```

- [ ] **Step 2: Create `Schedule`**

```tsx
// packages/mobile/components/ui/Schedule.tsx
import { View } from "react-native";
import { StepRow, type StepStatus } from "./StepRow";

export interface ScheduleItem {
  id: string;
  time: string;
  meridiem?: string;
  title: string;
  cookName: string;
  durationLabel?: string; // e.g. "3 min active"
  status: StepStatus;
}

interface ScheduleProps {
  steps: ScheduleItem[];
  onSelect?: (step: ScheduleItem) => void;
  limit?: number;
}

export function Schedule({ steps, onSelect, limit = 5 }: ScheduleProps) {
  const visible = steps.slice(0, limit);
  return (
    <View className="bg-card rounded-2xl border border-[#EDE5D3] overflow-hidden">
      {visible.map((step, i) => (
        <View
          key={step.id}
          className={i > 0 ? "border-t border-[#EDE5D3]" : ""}
        >
          <StepRow
            time={step.time}
            meridiem={step.meridiem}
            title={step.title}
            subtitle={
              step.durationLabel
                ? `${step.cookName} · ${step.durationLabel}`
                : step.cookName
            }
            status={step.status}
            onPress={onSelect ? () => onSelect(step) : undefined}
          />
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Create `Timeline`**

```tsx
// packages/mobile/components/ui/Timeline.tsx
import { View } from "react-native";
import { StepRow, type StepStatus } from "./StepRow";
import { Eyebrow } from "./Eyebrow";

export interface TimelineItem {
  id: string;
  time: string;
  meridiem?: string;
  title: string;
  description?: string;
  dayLabel: string | null;
  status: StepStatus;
  expanded?: React.ReactNode;
}

interface TimelineProps {
  steps: TimelineItem[];
}

interface Group {
  label: string;
  items: TimelineItem[];
}

function groupByDay(steps: TimelineItem[]): Group[] {
  const groups: Group[] = [];
  for (const step of steps) {
    if (step.dayLabel) {
      groups.push({ label: step.dayLabel, items: [step] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].items.push(step);
    } else {
      groups.push({ label: "", items: [step] });
    }
  }
  return groups;
}

export function Timeline({ steps }: TimelineProps) {
  const groups = groupByDay(steps);
  return (
    <View>
      {groups.map((group, gIdx) => (
        <View key={gIdx} className={gIdx > 0 ? "mt-6" : ""}>
          {group.label && (
            <View className="px-6 mb-2">
              <Eyebrow color="ink-tertiary">{group.label}</Eyebrow>
            </View>
          )}
          <View className="relative">
            {/* vertical hairline connecting dots within a group */}
            <View
              className="absolute bg-[#E4DBC9]"
              style={{ right: 29, top: 20, bottom: 20, width: 1 }}
            />
            {group.items.map((item, i) => (
              <View
                key={item.id}
                className={i > 0 ? "border-t border-[#EDE5D3]" : ""}
              >
                <StepRow
                  time={item.time}
                  meridiem={item.meridiem}
                  title={item.title}
                  subtitle={item.description}
                  status={item.status}
                  expanded={item.expanded}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Update `components/ui/index.ts`**

```ts
export { Screen } from "./Screen";
export { AppHeader } from "./AppHeader";
export { ListRow } from "./ListRow";
export { Eyebrow } from "./Eyebrow";
export { Display } from "./Display";
export { SectionHead } from "./SectionHead";
export { InkCard } from "./InkCard";
export { CookMeta } from "./CookMeta";
export { StepRow, type StepStatus } from "./StepRow";
export { Schedule, type ScheduleItem } from "./Schedule";
export { Timeline, type TimelineItem } from "./Timeline";
export { tokens } from "./tokens";
```

- [ ] **Step 5: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/mobile/components/ui/StepRow.tsx packages/mobile/components/ui/Schedule.tsx packages/mobile/components/ui/Timeline.tsx packages/mobile/components/ui/index.ts
git commit -m "feat(mobile): add StepRow, Schedule, and Timeline primitives"
```

---

## Task 5: Countdown formatter + HappeningNowCard

**Files:**
- Modify: `packages/mobile/lib/time-format.ts` (add `formatCountdown`)
- Create: `packages/mobile/lib/time-format.countdown.test.ts`
- Create: `packages/mobile/components/HappeningNowCard.tsx`

- [ ] **Step 1: Write the failing test for `formatCountdown`**

Create `packages/mobile/lib/time-format.countdown.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { formatCountdown } from "./time-format";

describe("formatCountdown", () => {
  it("formats seconds as mm:ss with zero padding", () => {
    expect(formatCountdown(24 * 60 + 12)).toBe("24:12");
    expect(formatCountdown(5)).toBe("00:05");
    expect(formatCountdown(65)).toBe("01:05");
  });

  it("clamps negative durations to 00:00", () => {
    expect(formatCountdown(-30)).toBe("00:00");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("collapses hours into minutes for under-an-hour values", () => {
    expect(formatCountdown(59 * 60 + 59)).toBe("59:59");
  });

  it("shows HH:MM:SS when >= 1 hour", () => {
    expect(formatCountdown(60 * 60)).toBe("01:00:00");
    expect(formatCountdown(2 * 3600 + 15 * 60 + 3)).toBe("02:15:03");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/mobile && bun test lib/time-format.countdown.test.ts
```
Expected: FAIL — `formatCountdown is not exported`.

- [ ] **Step 3: Add `formatCountdown` to `lib/time-format.ts`**

Append to the end of `packages/mobile/lib/time-format.ts`:

```ts
/**
 * Formats a seconds duration for the live countdown on HappeningNowCard.
 * `mm:ss` below an hour, `HH:MM:SS` at or above an hour. Negative clamps to 00:00.
 */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hh > 0) return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd packages/mobile && bun test lib/time-format.countdown.test.ts
```
Expected: 4 pass.

- [ ] **Step 5: Create `HappeningNowCard`**

```tsx
// packages/mobile/components/HappeningNowCard.tsx
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { Bell } from "lucide-react-native";
import { InkCard, Eyebrow, Display, tokens } from "./ui";
import { formatCountdown } from "../lib/time-format";

interface HappeningNowCardProps {
  stepTitle: string;
  cookSubtitle?: string;
  targetAt: Date;                 // when countdown reaches zero
  onMarkComplete: () => void | Promise<void>;
  onSnooze?: () => void;
  progress?: number;              // 0..1 — overall cook progress (optional)
  progressLabel?: string;
}

export function HappeningNowCard({
  stepTitle,
  cookSubtitle,
  targetAt,
  onMarkComplete,
  onSnooze,
  progress,
  progressLabel,
}: HappeningNowCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = Math.floor((targetAt.getTime() - now.getTime()) / 1000);
  const overdue = secondsLeft < 0;

  return (
    <InkCard>
      <View className="flex-row items-start justify-between">
        <Eyebrow color="ink-inverse-soft">
          {overdue ? "OVERDUE" : "HAPPENING NOW"}
        </Eyebrow>
        <Text
          className="text-[#F4EDE1] text-[22px]"
          style={{ fontFamily: "IBMPlexMono_500Medium" }}
        >
          {formatCountdown(Math.abs(secondsLeft))}
        </Text>
      </View>

      <View className="mt-3">
        <Display size="md" className="text-[#F4EDE1]">
          {stepTitle}
        </Display>
        {cookSubtitle && (
          <Text
            className="text-[#C9C4AE] text-[14px] mt-1"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            {cookSubtitle}
          </Text>
        )}
      </View>

      {typeof progress === "number" && (
        <View className="mt-4">
          <View className="h-[2px] bg-[#3C4B37] rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          {progressLabel && (
            <Text
              className="text-[#C9C4AE] text-[11px] mt-2"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              {progressLabel}
            </Text>
          )}
        </View>
      )}

      <View className="flex-row items-center gap-3 mt-5">
        <Button
          variant="primary"
          onPress={onMarkComplete}
          className="flex-1 rounded-xl h-12 bg-accent"
        >
          <Button.Label className="text-white font-semibold">
            Mark step complete
          </Button.Label>
        </Button>
        {onSnooze && (
          <Button
            isIconOnly
            variant="ghost"
            onPress={onSnooze}
            className="rounded-full h-12 w-12 bg-[#3C4B37] border border-[#C9C4AE]/20"
          >
            <Bell size={20} color={tokens.inkInverseSoft} strokeWidth={2} />
          </Button>
        )}
      </View>
    </InkCard>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/mobile/lib/time-format.ts packages/mobile/lib/time-format.countdown.test.ts packages/mobile/components/HappeningNowCard.tsx
git commit -m "feat(mobile): add formatCountdown helper and HappeningNowCard"
```

---

## Task 6: QuickStartChips + ChatComposer

**Files:**
- Create: `packages/mobile/components/QuickStartChips.tsx`
- Create: `packages/mobile/components/ChatComposer.tsx`

- [ ] **Step 1: Create `QuickStartChips`**

```tsx
// packages/mobile/components/QuickStartChips.tsx
import { ScrollView, Pressable, Text } from "react-native";

export interface QuickStartChip {
  label: string;
  prompt: string;
}

interface QuickStartChipsProps {
  chips: QuickStartChip[];
  onSelect: (chip: QuickStartChip) => void;
}

export const DEFAULT_QUICK_START_CHIPS: QuickStartChip[] = [
  { label: "Sourdough loaf", prompt: "Help me plan a country sourdough loaf for tomorrow afternoon." },
  { label: "Smoked brisket", prompt: "I want to smoke a brisket that's ready by 6pm Saturday." },
  { label: "Weeknight pasta", prompt: "Walk me through a 30-minute weeknight pasta for tonight." },
  { label: "Cold-brew coffee", prompt: "Help me start a batch of cold-brew coffee for the week." },
];

export function QuickStartChips({ chips, onSelect }: QuickStartChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.label}
          onPress={() => onSelect(chip)}
          className="rounded-full bg-[#F3DDCC] border border-[#E89970]/40 px-4 py-2"
        >
          <Text
            className="text-accent text-[13px]"
            style={{ fontFamily: "Geist_500Medium" }}
          >
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Create `ChatComposer`**

```tsx
// packages/mobile/components/ChatComposer.tsx
import { forwardRef } from "react";
import { View, type TextInput as RNTextInput } from "react-native";
import { Input, Button } from "heroui-native";
import { Send } from "lucide-react-native";
import { tokens } from "./ui/tokens";

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatComposer = forwardRef<RNTextInput, ChatComposerProps>(
  function ChatComposer(
    { value, onChangeText, onSend, disabled, placeholder = "What are you cooking?" },
    ref,
  ) {
    return (
      <View className="flex-row items-end gap-3">
        <Input
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline
          className="flex-1 max-h-40 text-[16px] leading-5 rounded-2xl px-5 py-4 bg-[#FBF6EC] border border-[#E4DBC9] shadow-none"
          style={{ fontFamily: "Geist_400Regular" }}
          onSubmitEditing={onSend}
        />
        <Button
          isIconOnly
          variant="primary"
          size="lg"
          className="rounded-2xl h-14 w-14 bg-accent"
          onPress={onSend}
          isDisabled={!value.trim() || disabled}
        >
          <Send color={tokens.accentForeground} size={22} strokeWidth={2.2} />
        </Button>
      </View>
    );
  },
);
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/components/QuickStartChips.tsx packages/mobile/components/ChatComposer.tsx
git commit -m "feat(mobile): add QuickStartChips and ChatComposer"
```

---

## Task 7: Redesign AppHeader + reskin ListRow

**Files:**
- Modify: `packages/mobile/components/ui/AppHeader.tsx`
- Modify: `packages/mobile/components/ui/ListRow.tsx`

- [ ] **Step 1: Rewrite `AppHeader`**

Replace the entire contents of `packages/mobile/components/ui/AppHeader.tsx`:

```tsx
import type { ReactNode } from "react";
import { View } from "react-native";
import { Button } from "heroui-native";
import { ArrowLeft } from "lucide-react-native";
import { Display } from "./Display";
import { Eyebrow } from "./Eyebrow";
import { tokens } from "./tokens";

interface AppHeaderProps {
  title?: string;
  eyebrow?: string;
  italic?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function AppHeader({ title, eyebrow, italic, onBack, rightAction }: AppHeaderProps) {
  return (
    <View className="px-6 pt-4 pb-4 border-b border-[#EDE5D3]">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {onBack && (
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onBack}
              className="rounded-full h-9 w-9 bg-transparent border border-[#E4DBC9] mb-3"
            >
              <ArrowLeft size={18} color={tokens.foreground} strokeWidth={2.2} />
            </Button>
          )}
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {title && (
            <Display size="sm" italic={italic} className={eyebrow ? "mt-1" : ""}>
              {title}
            </Display>
          )}
        </View>
        {rightAction && (
          <View className="flex-row items-center gap-2 pt-1">{rightAction}</View>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Rewrite `ListRow`**

Replace the entire contents of `packages/mobile/components/ui/ListRow.tsx`:

```tsx
import type { ReactNode } from "react";
import { Pressable, View, Text } from "react-native";

interface ListRowProps {
  icon?: ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  rightElement?: ReactNode;
}

export function ListRow({ icon, title, value, onPress, destructive, rightElement }: ListRowProps) {
  const titleColor = destructive ? "text-danger" : "text-foreground";
  const content = (
    <View className="flex-row items-center gap-3 bg-card border border-[#E4DBC9] rounded-xl px-4 py-4">
      {icon && <View>{icon}</View>}
      <View className="flex-1">
        <Text
          className={`${titleColor} text-[15px]`}
          style={{ fontFamily: "Geist_500Medium" }}
        >
          {title}
        </Text>
      </View>
      {rightElement ??
        (value ? (
          <Text
            className="text-[#9E9488] text-[14px]"
            style={{ fontFamily: "Newsreader_400Regular_Italic" }}
          >
            {value}
          </Text>
        ) : null)}
    </View>
  );

  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/components/ui/AppHeader.tsx packages/mobile/components/ui/ListRow.tsx
git commit -m "feat(mobile): redesign AppHeader and ListRow for editorial theme"
```

---

## Task 8: Reskin ChatBubble + EnableNotificationsModal

**Files:**
- Modify: `packages/mobile/components/ChatBubble.tsx`
- Modify: `packages/mobile/components/EnableNotificationsModal.tsx`

- [ ] **Step 1: Rewrite `ChatBubble`**

Replace the entire contents of `packages/mobile/components/ChatBubble.tsx`:

```tsx
import { View, Text } from "react-native";
import type { Message } from "@mise/shared";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const alignClass = isUser ? "self-end" : "self-start";
  const bubbleClass = isUser
    ? "bg-[#F3DDCC]"
    : "bg-card border border-[#EDE5D3]";

  return (
    <View className={`${alignClass} max-w-[85%] my-1.5`}>
      <View className={`${bubbleClass} px-4 py-3 rounded-2xl`}>
        <Text
          className="text-foreground text-[15px] leading-[22px]"
          style={{ fontFamily: "Geist_400Regular" }}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Rewrite `EnableNotificationsModal`**

Replace the entire contents of `packages/mobile/components/EnableNotificationsModal.tsx`:

```tsx
import { View } from "react-native";
import { Dialog, Button } from "heroui-native";
import { Bell } from "lucide-react-native";
import { Display, tokens } from "./ui";

interface Props {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function EnableNotificationsModal({ visible, onEnable, onDismiss }: Props) {
  return (
    <Dialog
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="bg-card rounded-2xl">
          <View className="items-center mb-2">
            <View className="rounded-full bg-[#F3DDCC] h-12 w-12 items-center justify-center">
              <Bell size={22} color={tokens.accent} strokeWidth={2.2} />
            </View>
          </View>
          <Display size="sm" italic className="text-center">
            Reminders for each step?
          </Display>
          <Dialog.Description
            className="text-[#6B635A] text-[14px] text-center leading-5 mt-2"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            Mise can ping you when it's time for the next step in your cook.
          </Dialog.Description>
          <View className="flex-row gap-2.5 mt-5">
            <Button variant="tertiary" onPress={onDismiss} className="flex-1 rounded-xl h-11">
              <Button.Label>Not now</Button.Label>
            </Button>
            <Button
              variant="primary"
              onPress={onEnable}
              className="flex-1 rounded-xl h-11 bg-accent"
            >
              <Button.Label className="text-white">Enable</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/components/ChatBubble.tsx packages/mobile/components/EnableNotificationsModal.tsx
git commit -m "feat(mobile): reskin ChatBubble and EnableNotificationsModal"
```

---

## Task 9: Rewrite PlanPreviewCard

**Files:**
- Modify: `packages/mobile/components/PlanPreviewCard.tsx`

- [ ] **Step 1: Rewrite `PlanPreviewCard`**

Replace the entire contents of `packages/mobile/components/PlanPreviewCard.tsx`:

```tsx
import { useState, useMemo } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { ChevronDown, Clock, Timer, Bell, AlertTriangle } from "lucide-react-native";
import { Card, Chip, Button, Spinner } from "heroui-native";
import { formatClock, formatStepTimestamps, formatTotalDuration } from "../lib/time-format";
import type { PermissionState } from "../lib/push-permissions";
import { Display, Eyebrow, Timeline, type TimelineItem, tokens } from "./ui";

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

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function PlanPreviewCard({
  data,
  pushPermission,
  onBuild,
  onViewCook,
  buildError,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstStep = data.steps[0];
  const firstStepAt = firstStep ? parseDate(firstStep.scheduledAt) : null;
  const targetAt = parseDate(data.targetTime);
  const totalDurationSec = useMemo(() => {
    if (!firstStepAt || !targetAt) return 0;
    return Math.floor((targetAt.getTime() - firstStepAt.getTime()) / 1000);
  }, [firstStepAt, targetAt]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    const stamps = formatStepTimestamps(data.steps.map((s) => parseDate(s.scheduledAt)));
    return data.steps.map((step, i) => {
      const stamp = stamps[i];
      const date = parseDate(step.scheduledAt);
      const timeParts = stamp?.time.split(" ") ?? [step.scheduledAt, ""];
      return {
        id: String(i),
        time: timeParts[0] || "",
        meridiem: timeParts[1],
        title: step.title,
        description: step.description || undefined,
        dayLabel: stamp?.dayLabel ?? null,
        status: "upcoming" as const,
      };
    });
  }, [data.steps]);

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

  const stripLabel = isSuperseded ? "REVISED" : isConfirmed ? "BUILT" : "PROPOSAL";

  return (
    <Card
      className={`my-2 self-stretch rounded-2xl border border-[#E4DBC9] overflow-hidden ${
        isSuperseded ? "opacity-60" : ""
      }`}
    >
      {/* Ink strip */}
      <View className="bg-primary px-4 py-3 flex-row items-center justify-between">
        <Eyebrow color="ink-inverse-soft">{stripLabel}</Eyebrow>
        <Text
          className="text-[#C9C4AE] text-[12px]"
          style={{ fontFamily: "Geist_500Medium" }}
          numberOfLines={1}
        >
          {data.title}
        </Text>
      </View>

      <Card.Body className="p-5 bg-card">
        <Display size="sm" italic>
          {data.title}
        </Display>

        <View className="gap-2 mt-3">
          {firstStepAt && (
            <MetaRow icon={<Clock size={14} color={tokens.inkTertiary} strokeWidth={2} />}
                     label={`Start: ${formatClock(firstStepAt)}`} />
          )}
          {totalDurationSec > 0 && (
            <MetaRow icon={<Timer size={14} color={tokens.inkTertiary} strokeWidth={2} />}
                     label={`Total: ${formatTotalDuration(totalDurationSec)}`} />
          )}
          <ReminderRow state={pushPermission} />
        </View>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-center gap-1 mt-4"
        >
          <Text
            className="text-accent text-[13px]"
            style={{ fontFamily: "Geist_500Medium" }}
          >
            {expanded ? "Hide steps" : `Show ${data.steps.length} steps`}
          </Text>
          <ChevronDown
            size={14}
            color={tokens.accent}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        {expanded && (
          <View className="mt-4 -mx-5 border-t border-[#EDE5D3] pt-4">
            <Timeline steps={timelineItems} />
          </View>
        )}

        {buildError && (
          <Text
            className="text-danger text-[12px] mt-3"
            style={{ fontFamily: "Geist_500Medium" }}
          >
            {buildError}
          </Text>
        )}

        {data.state === "active" && (
          <Button
            variant="primary"
            onPress={handleBuild}
            isDisabled={loading}
            className="mt-5 rounded-xl h-12 bg-accent"
          >
            {loading ? (
              <Spinner size="sm" color={tokens.accentForeground} />
            ) : (
              <Button.Label className="text-white font-semibold">Build it</Button.Label>
            )}
          </Button>
        )}
        {isConfirmed && data.createdCookId && (
          <Button
            variant="outline"
            onPress={() => onViewCook(data.createdCookId!)}
            className="mt-5 rounded-xl h-12 border-[#E4DBC9]"
          >
            <Button.Label className="text-accent font-semibold">View cook →</Button.Label>
          </Button>
        )}
      </Card.Body>

      {/* Status chip for non-active states — top-right floating */}
      {isConfirmed && (
        <View className="absolute top-3 right-4">
          <Chip size="sm" color="success" variant="soft" className="rounded-md h-5 px-1.5 bg-[#DDE5D2] border-0">
            <Chip.Label className="text-[9px] font-semibold text-[#2F3D2A] uppercase tracking-widest">
              Built
            </Chip.Label>
          </Chip>
        </View>
      )}
    </Card>
  );
}

function MetaRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text
        className="text-foreground text-[14px]"
        style={{ fontFamily: "Geist_500Medium" }}
      >
        {label}
      </Text>
    </View>
  );
}

function ReminderRow({ state }: { state: PermissionState }) {
  if (state === "denied") {
    return (
      <Pressable onPress={() => Linking.openSettings()} className="flex-row items-center gap-2">
        <AlertTriangle size={14} color={tokens.warning} strokeWidth={2} />
        <Text
          className="text-warning text-[14px]"
          style={{ fontFamily: "Geist_500Medium" }}
        >
          Enable reminders in settings
        </Text>
      </Pressable>
    );
  }
  return (
    <View className="flex-row items-center gap-2">
      <Bell size={14} color={tokens.inkTertiary} strokeWidth={2} />
      <Text
        className="text-foreground text-[14px]"
        style={{ fontFamily: "Geist_500Medium" }}
      >
        With step reminders
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/components/PlanPreviewCard.tsx
git commit -m "feat(mobile): rewrite PlanPreviewCard for editorial theme"
```

---

## Task 10: Redesign CookCard + create /(cooks)/all screen

**Files:**
- Modify: `packages/mobile/components/CookCard.tsx`
- Create: `packages/mobile/app/(tabs)/(cooks)/all.tsx`

- [ ] **Step 1: Rewrite `CookCard`**

Replace the entire contents of `packages/mobile/components/CookCard.tsx`:

```tsx
import { View, Text } from "react-native";
import { Card, Chip } from "heroui-native";
import type { CookWithSteps } from "@mise/shared";
import { computeDayOfCook, formatStartDate, formatTimeUntil } from "../lib/time-format";
import { Display, Eyebrow, tokens } from "./ui";

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

  return (
    <Card className="rounded-2xl border border-[#E4DBC9] bg-card shadow-none">
      <Card.Body className="p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Eyebrow color="ink-tertiary">{dayInfo.label}</Eyebrow>
            <Display size="sm" italic className="mt-1">
              {cook.title}
            </Display>
            {firstStepDate && (
              <Text
                className="text-[#6B635A] text-[13px] mt-1"
                style={{ fontFamily: "Geist_400Regular" }}
              >
                Started {formatStartDate(firstStepDate)}
              </Text>
            )}
          </View>
          {isActive ? (
            <Chip size="sm" color="success" variant="soft" className="rounded-md h-6 px-2 bg-[#DDE5D2] border-0">
              <Chip.Label className="text-[11px] text-[#2F3D2A]">Active</Chip.Label>
            </Chip>
          ) : (
            <Chip size="sm" variant="soft" className="rounded-md h-6 px-2 bg-[#EDE5D3] border-0">
              <Chip.Label className="text-[11px] text-[#9E9488]">
                {cook.status === "completed" ? "Complete" : "Cancelled"}
              </Chip.Label>
            </Chip>
          )}
        </View>

        {total > 0 && (
          <View className="mt-4">
            <View className="h-[2px] bg-[#EDE5D3] rounded-full overflow-hidden">
              <View
                style={{ width: `${Math.round(progress * 100)}%` }}
                className="h-full bg-accent rounded-full"
              />
            </View>
            <Text
              className="text-[#9E9488] text-[11px] mt-2"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              {completedSteps} / {total} · {Math.round(progress * 100)}%
            </Text>
          </View>
        )}

        {isActive && nextStep && (
          <View className="mt-4 bg-[#FBF6EC] border border-[#EDE5D3] rounded-xl p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Eyebrow color="ink-tertiary">Next</Eyebrow>
                <Text
                  className="text-foreground text-[15px] mt-1"
                  style={{ fontFamily: "Newsreader_400Regular_Italic" }}
                  numberOfLines={1}
                >
                  {nextStep.title}
                </Text>
              </View>
              <Text
                className="text-accent text-[13px]"
                style={{ fontFamily: "IBMPlexMono_500Medium" }}
              >
                {formatTimeUntil(new Date(nextStep.scheduledAt), now)}
              </Text>
            </View>
          </View>
        )}
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 2: Create the `/(cooks)/all` screen**

Create `packages/mobile/app/(tabs)/(cooks)/all.tsx`:

```tsx
import { useState, useCallback } from "react";
import { View, FlatList, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import { listCooks } from "../../../lib/api";
import { CookCard } from "../../../components/CookCard";
import { Screen, AppHeader, Eyebrow, tokens } from "../../../components/ui";
import { View as RNView, Text } from "react-native";

export default function AllCooksScreen() {
  const { activeCooks, completedCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (error) {
      console.error("[AllCooks] fetch error:", error);
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

  const sections = [
    ...(activeCooks.length ? [{ label: "ACTIVE", cooks: activeCooks }] : []),
    ...(completedCooks.length ? [{ label: "COMPLETED", cooks: completedCooks }] : []),
  ];

  return (
    <Screen edges={["top"]}>
      <AppHeader
        eyebrow="YOUR COOKS"
        title="All cooks"
        italic
        onBack={() => router.back()}
      />

      <FlatList
        data={sections}
        keyExtractor={(s) => s.label}
        renderItem={({ item }) => (
          <View className="mb-6">
            <View className="px-6 mb-2">
              <Eyebrow color="ink-tertiary">{item.label}</Eyebrow>
            </View>
            <View className="px-6 gap-3">
              {item.cooks.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/(tabs)/(cooks)/${c.id}` as never)}
                >
                  <CookCard cook={c} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.accent}
          />
        }
      />
    </Screen>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/components/CookCard.tsx packages/mobile/app/\(tabs\)/\(cooks\)/all.tsx
git commit -m "feat(mobile): redesign CookCard and add /(cooks)/all list screen"
```

---

## Task 11: Rewrite Home screen

**Files:**
- Modify: `packages/mobile/app/(tabs)/(cooks)/index.tsx`

- [ ] **Step 1: Rewrite Home**

Replace the entire contents of `packages/mobile/app/(tabs)/(cooks)/index.tsx`:

```tsx
import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useStore } from "../../../lib/store";
import { listCooks, createConversation } from "../../../lib/api";
import {
  Screen,
  Eyebrow,
  Display,
  SectionHead,
  Schedule,
  type ScheduleItem,
  type StepStatus,
  tokens,
} from "../../../components/ui";
import { HappeningNowCard } from "../../../components/HappeningNowCard";
import { ChatComposer } from "../../../components/ChatComposer";
import {
  QuickStartChips,
  DEFAULT_QUICK_START_CHIPS,
  type QuickStartChip,
} from "../../../components/QuickStartChips";
import { getGreeting, formatClock, formatStepTimestamps } from "../../../lib/time-format";
import type { CookWithSteps, CookStep } from "@mise/shared";

function todayEyebrow(now: Date, activeMultiDay?: { x: number; y: number } | null): string {
  const datePart = now
    .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase()
    .replace(",", " ·");
  if (activeMultiDay && activeMultiDay.y > 1) {
    return `${datePart} · DAY ${activeMultiDay.x} OF ${activeMultiDay.y}`;
  }
  return datePart;
}

interface ScheduleEntry extends ScheduleItem {
  cookId: string;
  scheduledAt: Date;
}

function buildSchedule(cooks: CookWithSteps[], now: Date, limit: number): ScheduleEntry[] {
  const flat: Array<{ cook: CookWithSteps; step: CookStep; scheduledAt: Date }> = [];
  for (const cook of cooks) {
    for (const step of cook.steps) {
      if (step.status === "completed") continue;
      flat.push({ cook, step, scheduledAt: new Date(step.scheduledAt) });
    }
  }
  flat.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const top = flat.slice(0, limit);

  return top.map(({ cook, step, scheduledAt }, i) => {
    const [time, meridiem] = formatClock(scheduledAt).split(" ");
    const status: StepStatus = i === 0 ? "next" : "upcoming";
    return {
      id: step.id,
      time,
      meridiem,
      title: step.title,
      cookName: cook.title,
      durationLabel: undefined,
      status,
      cookId: cook.id,
      scheduledAt,
    };
  });
}

function findLiveStep(
  cooks: CookWithSteps[],
  now: Date,
): { cook: CookWithSteps; step: CookStep } | null {
  for (const cook of cooks) {
    for (const step of cook.steps) {
      if (step.status === "notified") return { cook, step };
    }
    // Fall back: pending step whose scheduledAt has passed
    for (const step of cook.steps) {
      if (step.status === "pending" && new Date(step.scheduledAt) <= now) {
        return { cook, step };
      }
    }
  }
  return null;
}

export default function HomeScreen() {
  const { activeCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (err) {
      console.error("[Home] fetch error:", err);
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

  const now = new Date();
  const live = useMemo(() => findLiveStep(activeCooks, now), [activeCooks, now]);
  const schedule = useMemo(() => buildSchedule(activeCooks, now, 5), [activeCooks, now]);
  const activeCount = activeCooks.length;

  const startConversationFromPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || sending) return;
      setSending(true);
      try {
        const { conversationId } = await createConversation();
        setInput("");
        router.push({
          pathname: `/(tabs)/(chat)/${conversationId}`,
          params: { seed: trimmed },
        } as never);
      } catch (err) {
        console.error("[Home] start-conversation error:", err);
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const handleChipSelect = (chip: QuickStartChip) => {
    startConversationFromPrompt(chip.prompt);
  };

  const handleSend = () => startConversationFromPrompt(input);

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 160 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.accent}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6">
            <Eyebrow>{todayEyebrow(now)}</Eyebrow>
            <Display size="lg" className="mt-2">
              {getGreeting()}.
            </Display>
          </View>

          {live && (
            <View className="px-6 mt-6">
              <HappeningNowCard
                stepTitle={live.step.title}
                cookSubtitle={live.cook.title}
                targetAt={new Date(live.step.scheduledAt)}
                onMarkComplete={async () => {
                  // Real mark-complete wiring lives in cook detail; here we just deep-link.
                  router.push(`/(tabs)/(cooks)/${live.cook.id}` as never);
                }}
              />
            </View>
          )}

          {schedule.length > 0 ? (
            <View className="px-6 mt-8">
              <SectionHead title="On the schedule" count={schedule.length} countLabel="steps" />
              <View className="mt-3">
                <Schedule
                  steps={schedule}
                  onSelect={(step) => {
                    const entry = step as ScheduleEntry;
                    router.push(`/(tabs)/(cooks)/${entry.cookId}` as never);
                  }}
                />
              </View>
            </View>
          ) : !live ? (
            <View className="px-6 mt-10">
              <Display size="md" italic>
                What are we cooking today?
              </Display>
            </View>
          ) : null}

          <View className="px-6 mt-10">
            <Eyebrow color="ink-tertiary">START A PREP</Eyebrow>
            <View className="mt-3">
              <ChatComposer
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                disabled={sending}
                placeholder="What are you cooking?"
              />
            </View>
          </View>

          <View className="mt-4">
            <QuickStartChips chips={DEFAULT_QUICK_START_CHIPS} onSelect={handleChipSelect} />
          </View>

          {activeCount > 0 && (
            <Pressable
              onPress={() => router.push("/(tabs)/(cooks)/all" as never)}
              className="mx-6 mt-10 bg-card border border-[#E4DBC9] rounded-xl px-4 py-4 flex-row items-center"
            >
              <View className="flex-1">
                <Eyebrow color="ink-tertiary">YOUR COOKS</Eyebrow>
                <Text
                  className="text-foreground text-[15px] mt-1"
                  style={{ fontFamily: "Geist_500Medium" }}
                >
                  Active cooks · {activeCount}
                </Text>
              </View>
              <ChevronRight size={18} color={tokens.inkTertiary} />
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/app/\(tabs\)/\(cooks\)/index.tsx
git commit -m "feat(mobile): rewrite Home screen with editorial layout"
```

---

## Task 12: Rewrite Cook detail screen

**Files:**
- Modify: `packages/mobile/app/(tabs)/(cooks)/[cookId].tsx`

- [ ] **Step 1: Rewrite Cook detail**

Replace the entire contents of `packages/mobile/app/(tabs)/(cooks)/[cookId].tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MessageCircle, Check } from "lucide-react-native";
import { Button, Spinner, Dialog } from "heroui-native";
import { getCook, updateStep, updateCook } from "../../../lib/api";
import { HappeningNowCard } from "../../../components/HappeningNowCard";
import {
  Screen,
  AppHeader,
  CookMeta,
  Timeline,
  type TimelineItem,
  type StepStatus,
  Display,
  tokens,
} from "../../../components/ui";
import { computeDayOfCook, formatClock, formatStepTimestamps } from "../../../lib/time-format";
import type { CookWithSteps, CookStep } from "@mise/shared";

function mapStatus(step: CookStep, now: Date): StepStatus {
  if (step.status === "completed") return "done";
  const due = new Date(step.scheduledAt) <= now;
  if (step.status === "notified" || (step.status === "pending" && due)) return "active";
  return "upcoming";
}

export default function CookTimelineScreen() {
  const { cookId } = useLocalSearchParams<{ cookId: string }>();
  const [cook, setCook] = useState<CookWithSteps | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  const handleMarkComplete = async (stepId: string) => {
    if (!cookId) return;
    await updateStep(cookId, stepId, { status: "completed" });
    const updated = await getCook(cookId);
    setCook(updated);
  };

  const handleCancel = async () => {
    if (!cook) return;
    try {
      await updateCook(cook.id, { status: "cancelled" });
      setCancelOpen(false);
      router.back();
    } catch (err) {
      console.error("[CookDetail] cancel error:", err);
    }
  };

  const now = new Date();

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!cook) return [];
    const dates = cook.steps.map((s) => new Date(s.scheduledAt));
    const stamps = formatStepTimestamps(dates, now);
    return cook.steps.map((step, i) => {
      const stamp = stamps[i];
      const status = mapStatus(step, now);
      const [time, meridiem] = (stamp?.time ?? formatClock(dates[i])).split(" ");
      return {
        id: step.id,
        time,
        meridiem,
        title: step.title,
        description: step.description || undefined,
        dayLabel: stamp?.dayLabel ?? null,
        status,
        expanded:
          status === "active" ? (
            <Button
              variant="primary"
              size="sm"
              onPress={() => handleMarkComplete(step.id)}
              className="self-start rounded-lg h-9 bg-accent"
            >
              <Check size={14} color={tokens.accentForeground} strokeWidth={2.5} />
              <Button.Label className="text-white font-semibold ml-1">Mark done</Button.Label>
            </Button>
          ) : undefined,
      };
    });
    // `handleMarkComplete` is stable-ish (uses cookId which is a param); including cook covers the refresh.
  }, [cook, now]);

  const live = useMemo(() => {
    if (!cook) return null;
    const step =
      cook.steps.find((s) => s.status === "notified") ??
      cook.steps.find((s) => s.status === "pending" && new Date(s.scheduledAt) <= now);
    return step ?? null;
  }, [cook, now]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner color={tokens.accent} />
      </View>
    );
  }

  if (notFound || !cook) {
    return (
      <Screen>
        <AppHeader onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center p-6">
          <Display size="sm" italic>This cook was removed.</Display>
          <Button
            variant="secondary"
            onPress={() => router.back()}
            className="mt-4 rounded-xl"
          >
            <Button.Label>Back</Button.Label>
          </Button>
        </View>
      </Screen>
    );
  }

  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const total = cook.steps.length;
  const progress = total > 0 ? completedSteps / total : 0;
  const dayInfo = computeDayOfCook(cook.steps.map((s) => new Date(s.scheduledAt)), now);
  const startedAt = cook.steps[0] ? new Date(cook.steps[0].scheduledAt) : null;
  const targetAt = new Date(cook.targetTime);

  return (
    <Screen>
      <AppHeader
        eyebrow={dayInfo.y > 1 ? `COOK · DAY ${dayInfo.x} OF ${dayInfo.y}` : "COOK"}
        title={cook.title}
        italic
        onBack={() => router.back()}
        rightAction={
          cook.conversationId ? (
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() =>
                router.push(`/(tabs)/(chat)/${cook.conversationId}` as never)
              }
              className="rounded-full h-9 w-9 bg-transparent border border-[#E4DBC9]"
            >
              <MessageCircle size={18} color={tokens.accent} strokeWidth={2.2} />
            </Button>
          ) : undefined
        }
      />

      <CookMeta
        columns={[
          {
            label: "TARGET",
            value: targetAt.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          },
          { label: "STEPS", value: `${total}` },
          {
            label: "STARTED",
            value: startedAt
              ? startedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—",
          },
        ]}
        progress={progress}
        progressLabel={`${completedSteps} / ${total} · ${Math.round(progress * 100)}%`}
      />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 140 }}>
        {live && (
          <View className="px-6 mb-6">
            <HappeningNowCard
              stepTitle={live.title}
              cookSubtitle={cook.title}
              targetAt={new Date(live.scheduledAt)}
              onMarkComplete={() => handleMarkComplete(live.id)}
            />
          </View>
        )}

        <Timeline steps={timelineItems} />

        {cook.status !== "cancelled" && cook.status !== "completed" && (
          <View className="px-6 mt-8">
            <Button
              variant="ghost"
              onPress={() => setCancelOpen(true)}
              className="self-center"
            >
              <Button.Label className="text-danger">Cancel cook</Button.Label>
            </Button>
          </View>
        )}
      </ScrollView>

      <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="bg-card rounded-2xl">
            <Display size="sm" italic>Cancel cook?</Display>
            <Dialog.Description
              className="text-[#6B635A] text-[14px] leading-5 mt-2"
              style={{ fontFamily: "Geist_400Regular" }}
            >
              This will stop reminders and remove it from Home. You can't undo this.
            </Dialog.Description>
            <View className="flex-row gap-2.5 mt-4">
              <Button variant="tertiary" onPress={() => setCancelOpen(false)} className="flex-1 rounded-xl h-11">
                <Button.Label>Keep cooking</Button.Label>
              </Button>
              <Button variant="danger" onPress={handleCancel} className="flex-1 rounded-xl h-11">
                <Button.Label className="text-white">Cancel cook</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/app/\(tabs\)/\(cooks\)/\[cookId\].tsx
git commit -m "feat(mobile): rewrite Cook detail with CookMeta and Timeline"
```

---

## Task 13: Re-skin Chat screen

**Files:**
- Modify: `packages/mobile/app/(tabs)/(chat)/index.tsx`

- [ ] **Step 1: Update Chat screen to use `ChatComposer` and the re-skinned `AppHeader`**

Apply this edit: replace the `AppHeader` block and the bottom-composer block. Show the full new file so no drift:

Replace the entire contents of `packages/mobile/app/(tabs)/(chat)/index.tsx`:

```tsx
import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  type TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "heroui-native";
import { Plus } from "lucide-react-native";
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
import {
  PlanPreviewCard,
  type PlanPreviewData,
} from "../../../components/PlanPreviewCard";
import { EnableNotificationsModal } from "../../../components/EnableNotificationsModal";
import { ChatComposer } from "../../../components/ChatComposer";
import {
  getPermissionState,
  requestPermissionAndRegister,
  type PermissionState,
} from "../../../lib/push-permissions";
import { Screen, AppHeader, tokens } from "../../../components/ui";
import type { Message } from "@mise/shared";

export default function ChatScreen() {
  const {
    new: newParam,
    conversationId: conversationIdParam,
    seed: seedParam,
  } = useLocalSearchParams<{ new?: string; conversationId?: string; seed?: string }>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [showEnableNotifs, setShowEnableNotifs] = useState(false);
  const [buildErrors, setBuildErrors] = useState<Record<string, string>>({});
  const [hasPromptedNotifs, setHasPromptedNotifs] = useState(false);
  const [seedSent, setSeedSent] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const _insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === "ios" ? 88 : 64;

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

  useEffect(() => {
    getPermissionState().then(setPermission);
  }, []);

  useEffect(() => {
    if (conversationIdParam && conversationIdParam !== activeConversationId) {
      setActiveConversationId(conversationIdParam);
    }
  }, [conversationIdParam, activeConversationId, setActiveConversationId]);

  useEffect(() => {
    if (newParam !== "1") return;
    (async () => {
      try {
        const { conversationId, messages: initial } = await createConversation();
        setActiveConversationId(conversationId);
        setMessages(initial as Message[]);
        router.setParams({ new: undefined as never });
        setTimeout(() => inputRef.current?.focus(), 150);
      } catch (err) {
        console.error("[Chat] createConversation error:", err);
      }
    })();
  }, [newParam, setActiveConversationId]);

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

  useEffect(() => {
    if (!activeConversationId) return;
    getConversation(activeConversationId).then((convo) => {
      setMessages(convo.messages);
    });
  }, [activeConversationId]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text || isStreaming) return;

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
        let _fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          _fullText += chunk;
          appendStreamingText(chunk);
        }

        const convo = await getConversation(convoId);
        setMessages(convo.messages);
      } catch (err) {
        console.error("[Chat] send error:", err);
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [
      activeConversationId,
      isStreaming,
      setStreamingText,
      setActiveConversationId,
      setIsStreaming,
      appendStreamingText,
    ],
  );

  const handleSend = useCallback(() => sendText(input.trim()), [input, sendText]);

  // Auto-send seed message when arriving from Home composer / quick-start chip.
  useEffect(() => {
    if (!seedParam || seedSent || isStreaming) return;
    if (!activeConversationId) return;
    setSeedSent(true);
    sendText(seedParam);
    router.setParams({ seed: undefined as never });
  }, [seedParam, seedSent, isStreaming, activeConversationId, sendText]);

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
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== message.id) return m;
            const tc = Array.isArray(m.toolCalls) ? (m.toolCalls as never[]) : [];
            return {
              ...m,
              toolCalls: tc.map((entry: any) =>
                entry?.toolName === "propose_plan" &&
                entry.output?.proposalId === plan.proposalId
                  ? {
                      ...entry,
                      output: {
                        ...entry.output,
                        state: "confirmed",
                        createdCookId: cook.id,
                      },
                    }
                  : entry,
              ),
            };
          }),
        );
        setBuildErrors((e) => ({ ...e, [plan.proposalId]: "" }));

        if (!hasPromptedNotifs) {
          setHasPromptedNotifs(true);
          if (permission === "undetermined") setShowEnableNotifs(true);
        }
      } catch (err: any) {
        const msg =
          err?.status === 422
            ? "This plan is out of date — ask Mise to redo it."
            : (err?.message ?? "Failed to build — try again.");
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

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const toolCalls = Array.isArray(item.toolCalls) ? (item.toolCalls as any[]) : [];
      const planCall = toolCalls.find((t) => t?.toolName === "propose_plan");
      return (
        <View className="mb-2">
          {item.content ? <ChatBubble message={item} /> : null}
          {planCall?.output ? (
            <PlanPreviewCard
              data={planCall.output as PlanPreviewData}
              pushPermission={permission}
              onBuild={() => handleBuild(item, planCall.output as PlanPreviewData)}
              onViewCook={(cookId) => router.push(`/(tabs)/(cooks)/${cookId}` as never)}
              buildError={buildErrors[planCall.output.proposalId] || null}
            />
          ) : null}
        </View>
      );
    },
    [permission, buildErrors, handleBuild],
  );

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={tabBarHeight}
      >
        <AppHeader
          title="Mise"
          italic
          rightAction={
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={handleNewChat}
              className="rounded-full h-9 w-9 bg-transparent border border-[#E4DBC9]"
            >
              <Plus size={18} color={tokens.accent} strokeWidth={2.2} />
            </Button>
          }
        />

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 100 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
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

        <View
          className="px-5 pt-3 bg-background border-t border-[#EDE5D3]"
          style={{ paddingBottom: tabBarHeight + 20 }}
        >
          <ChatComposer
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            disabled={isStreaming}
          />
        </View>
      </KeyboardAvoidingView>

      <EnableNotificationsModal
        visible={showEnableNotifs}
        onEnable={handleEnableNotifs}
        onDismiss={() => setShowEnableNotifs(false)}
      />
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/app/\(tabs\)/\(chat\)/index.tsx
git commit -m "feat(mobile): reskin Chat screen with new AppHeader and ChatComposer"
```

---

## Task 14: Reskin Profile + Login + tab bar

**Files:**
- Modify: `packages/mobile/app/(tabs)/(profile)/index.tsx`
- Modify: `packages/mobile/app/(auth)/login.tsx`
- Modify: `packages/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Reskin Profile**

Replace the entire contents of `packages/mobile/app/(tabs)/(profile)/index.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { View, Text, Linking } from "react-native";
import { Card } from "heroui-native";
import { LogOut, Bell } from "lucide-react-native";
import { authClient } from "../../../lib/auth";
import {
  getPermissionState,
  requestPermissionAndRegister,
  type PermissionState,
} from "../../../lib/push-permissions";
import { Screen, AppHeader, ListRow, Display, Eyebrow, tokens } from "../../../components/ui";

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
  };

  const notifValue =
    permission === "granted" ? "On" : permission === "denied" ? "Off" : "Not set";

  return (
    <Screen edges={["top"]}>
      <AppHeader eyebrow="SETTINGS" title="Profile" italic />

      <View className="p-6 gap-5">
        <Card className="rounded-2xl border border-[#E4DBC9] bg-card">
          <Card.Body className="p-5">
            <Display size="sm" italic>
              {session?.user?.name || "User"}
            </Display>
            <Text
              className="text-[#6B635A] text-[13px] mt-1"
              style={{ fontFamily: "Geist_400Regular" }}
            >
              {session?.user?.email}
            </Text>
          </Card.Body>
        </Card>

        <View>
          <Eyebrow color="ink-tertiary">NOTIFICATIONS</Eyebrow>
          <View className="mt-2">
            <ListRow
              icon={<Bell size={18} color={tokens.accent} strokeWidth={2} />}
              title="Step reminders"
              value={notifValue}
              onPress={handleNotificationsTap}
            />
          </View>
        </View>

        <Card className="rounded-2xl border border-[#E4DBC9] bg-card">
          <Card.Body className="p-5">
            <Eyebrow color="ink-tertiary">ABOUT</Eyebrow>
            <Text
              className="text-foreground text-[14px] mt-3 leading-5"
              style={{ fontFamily: "Geist_400Regular" }}
            >
              Your warm cooking companion. Tell Mise what you want to cook and when — we'll
              build the timing plan.
            </Text>
            <Text
              className="text-[#9E9488] text-[11px] mt-3"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              v1.0.0
            </Text>
          </Card.Body>
        </Card>

        <ListRow
          icon={<LogOut size={18} color={tokens.danger} strokeWidth={2} />}
          title="Sign out"
          destructive
          onPress={handleSignOut}
        />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: Reskin Login**

Replace the entire contents of `packages/mobile/app/(auth)/login.tsx`:

```tsx
import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { authClient } from "../../lib/auth";
import { Screen, Eyebrow, Display } from "../../components/ui";

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <Screen>
      <View className="flex-1 px-8">
        <View className="pt-14 pl-2">
          <Text
            className="text-foreground text-[40px]"
            style={{ fontFamily: "Newsreader_600SemiBold" }}
          >
            mise.
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <Eyebrow>WELCOME</Eyebrow>
          <Display size="md" italic className="mt-2 text-center">
            Good to meet you.
          </Display>
          <Text
            className="text-[#6B635A] text-[14px] text-center mt-4 max-w-[280px]"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            Your AI kitchen chemist. Every cook, perfectly timed.
          </Text>
        </View>

        <View className="pb-12">
          <Button
            variant="primary"
            onPress={handleGoogleLogin}
            className="w-full rounded-xl h-12 bg-primary"
          >
            <Button.Label className="text-[#F4EDE1] font-semibold">
              Continue with Google
            </Button.Label>
          </Button>
        </View>
      </View>
    </Screen>
  );
}
```

- [ ] **Step 3: Tune the tab bar for light mode**

Replace the entire contents of `packages/mobile/app/(tabs)/_layout.tsx`:

```tsx
import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { MessageCircle, ChefHat, User } from "lucide-react-native";
import { tokens } from "../../components/ui/tokens";

function TabBarBackground() {
  if (Platform.OS === "android") {
    return (
      <View style={[StyleSheet.absoluteFill, styles.androidTabBarBg]}>
        <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  return <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  androidTabBarBg: {
    backgroundColor: tokens.tabBarBackgroundAndroid,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.hairlineBorder,
  },
});

export default function TabsLayout() {
  return (
    <View className="flex-1">
      <Tabs
        initialRouteName="(cooks)"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            position: "absolute",
            height: Platform.OS === "ios" ? 88 : 64,
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: tokens.accent,
          tabBarInactiveTintColor: tokens.inkTertiary,
          tabBarLabelStyle: {
            fontFamily: "Geist_500Medium",
            fontSize: 11,
            marginTop: -4,
            marginBottom: Platform.OS === "ios" ? 0 : 4,
          },
        }}
      >
        <Tabs.Screen
          name="(cooks)"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <ChefHat size={size - 2} color={color} strokeWidth={2.2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(chat)"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle size={size - 2} color={color} strokeWidth={2.2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <User size={size - 2} color={color} strokeWidth={2.2} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
cd packages/mobile && bun run typecheck
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/app/\(tabs\)/\(profile\)/index.tsx packages/mobile/app/\(auth\)/login.tsx packages/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): reskin Profile, Login, and tab bar for editorial theme"
```

---

## Task 15: Delete dead code + final verification

**Files:**
- Delete: `packages/mobile/lib/emoji-map.ts`
- Delete: `packages/mobile/components/StartNewCookCard.tsx`
- Delete: `packages/mobile/components/TimelineStep.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
cd packages/mobile && grep -rn "emoji-map\|StartNewCookCard\|TimelineStep" app components lib || echo "clean"
```
Expected: prints `clean`. If anything is found, remove the import/call site first.

- [ ] **Step 2: Delete the files**

```bash
cd packages/mobile
rm lib/emoji-map.ts components/StartNewCookCard.tsx components/TimelineStep.tsx
```

- [ ] **Step 3: Typecheck + tests + format**

```bash
cd packages/mobile
bun run typecheck
bun test
bun run fmt
```
Expected: typecheck exits 0; all tests pass; formatter exits 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(mobile): remove dead code superseded by editorial redesign"
```

- [ ] **Step 5: Push the branch**

```bash
git push -u origin editorial-redesign
```

---

## Post-plan verification (manual, single pass at the end per user preference)

After all tasks commit cleanly, run the app end-to-end and walk through every surface. Do **not** claim completion until each item below is confirmed in a running device/simulator.

- [ ] `cd packages/mobile && bun run ios` (or `bun run android`) launches without bundler errors.
- [ ] Login: Google sign-in button works; wordmark and "Good to meet you." display correctly in Newsreader.
- [ ] Home: date eyebrow renders; Newsreader greeting renders; if there are active cooks, HappeningNowCard appears and countdown ticks every second.
- [ ] Home: "On the schedule" lists upcoming steps; tapping a row pushes to the cook detail.
- [ ] Home: composer "What are you cooking?" submits → lands in Chat with the message already sent.
- [ ] Home: quick-start chips scroll horizontally and create a new conversation with the chip's prompt.
- [ ] Home: "Active cooks · N" footer row pushes to `/(cooks)/all`.
- [ ] `/(cooks)/all`: ACTIVE + COMPLETED sections render; cards show titles, progress, next-step.
- [ ] Cook detail: header eyebrow + italic title render; CookMeta strip shows Target/Steps/Started; Timeline shows day groups with vertical hairline; active step expands "Mark done".
- [ ] Chat: messages render with new bubble styles; PlanPreviewCard redesign renders; expand reveals the day-grouped Timeline.
- [ ] Profile: new card layout renders; notifications row toggles; sign-out works.
- [ ] Tab bar uses light blur + accent active color.
- [ ] Run `bun test` from `packages/mobile` and confirm the whole suite passes (two files: `time-format.test.ts`, `time-format.countdown.test.ts`).
- [ ] Run `bun run fmt:check` from repo root and confirm clean.

If any check fails, capture the specific failure and fix it before opening the PR.
