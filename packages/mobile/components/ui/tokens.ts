// Hex mirrors of the semantic CSS variables in global.css.
// Only use these in contexts that can't resolve Tailwind/Uniwind classes:
// Expo native config, RefreshControl tintColor, BlurView tint, Stack
// contentStyle, Spinner color prop, etc. Everywhere else, prefer
// className="bg-background text-foreground" over importing these.
// Keep this file in sync with global.css.

export const tokens = {
  background: "#0a0a0a",
  foreground: "#f8f8f8",
  card: "#212121",
  primary: "#c9a0dc",
  primaryMuted: "#3b2a4a",
  secondary: "#383838",
  muted: "#383838",
  mutedForeground: "#8f8f8f",
  success: "#4ade80",
  successMuted: "#1f3a2a",
  warning: "#fbbf24",
  warningMuted: "#3d341a",
  danger: "#f87171",
  dangerMuted: "#3d1f1f",
  border: "#2d2d2d",
  // Native-chrome overlays (tab bar BlurView, hairline dividers) — keep rgba form.
  tabBarBackgroundAndroid: "rgba(10, 10, 10, 0.8)",
  hairlineBorder: "rgba(255, 255, 255, 0.08)",
} as const;
