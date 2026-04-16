// Hex mirrors of the semantic CSS variables in global.css.
// Only use these in contexts that can't resolve Tailwind/Uniwind classes:
// Expo native config, RefreshControl tintColor, BlurView tint, Stack
// contentStyle, Spinner color prop, etc. Everywhere else, prefer
// className="bg-background text-foreground" over importing these.
// Keep this file in sync with global.css.

export const tokens = {
  background: "#111317", // hsl(220, 15%, 8%)
  foreground: "#f8f8f8",
  card: "#1a1d23", // hsl(220, 15%, 12%)
  primary: "#c89b82", // hsl(25, 40%, 65%)
  primaryForeground: "#1a120d", // hsl(25, 100%, 5%)
  primaryMuted: "#372d27", // hsl(25, 20%, 18%)
  secondary: "#32373e", // hsl(220, 10%, 22%)
  muted: "#292e35", // hsl(220, 10%, 18%)
  mutedForeground: "#a3abb8", // hsl(220, 5%, 65%)
  success: "#628362", // hsl(120, 15%, 45%)
  successMuted: "#263026", // hsl(120, 20%, 18%)
  warning: "#fbbf24",
  warningMuted: "#3d341a",
  danger: "#f87171",
  dangerMuted: "#3d1f1f",
  border: "#292e35", // hsl(220, 10%, 18%)
  // Native-chrome overlays (tab bar BlurView, hairline dividers) — keep rgba form.
  tabBarBackgroundAndroid: "rgba(17, 19, 23, 0.8)",
  hairlineBorder: "rgba(255, 255, 255, 0.08)",
} as const;
