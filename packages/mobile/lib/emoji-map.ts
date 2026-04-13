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
