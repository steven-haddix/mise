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
