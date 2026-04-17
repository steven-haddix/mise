import { View, Pressable, Text } from "react-native";
import { Wheat, Flame, UtensilsCrossed, Coffee, type LucideIcon } from "lucide-react-native";

export interface QuickStartCardItem {
  label: string;
  prompt: string;
  icon: LucideIcon;
  washBg: string;
  iconColor: string;
}

export const DEFAULT_QUICK_START_CARDS: QuickStartCardItem[] = [
  {
    label: "Country sourdough",
    prompt: "Help me plan a country sourdough loaf for tomorrow afternoon.",
    icon: Wheat,
    washBg: "#F0DFC0",
    iconColor: "#C88A2E",
  },
  {
    label: "Smoked brisket",
    prompt: "I want to smoke a brisket that's ready by 6pm Saturday.",
    icon: Flame,
    washBg: "#DDE5D2",
    iconColor: "#2F3D2A",
  },
  {
    label: "Weeknight pasta",
    prompt: "Walk me through a 30-minute weeknight pasta for tonight.",
    icon: UtensilsCrossed,
    washBg: "#F3DDCC",
    iconColor: "#C55A31",
  },
  {
    label: "Cold-brew coffee",
    prompt: "Help me start a batch of cold-brew coffee for the week.",
    icon: Coffee,
    washBg: "#E4E6DA",
    iconColor: "#4A5D42",
  },
];

interface QuickStartCardsProps {
  items: QuickStartCardItem[];
  onSelect: (item: QuickStartCardItem) => void;
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export function QuickStartCards({ items, onSelect }: QuickStartCardsProps) {
  const rows = chunkPairs(items);
  return (
    <View className="gap-3">
      {rows.map((row, rIdx) => (
        <View key={rIdx} className="flex-row gap-3">
          {row.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                onPress={() => onSelect(item)}
                className="bg-card border border-[#E4DBC9] rounded-2xl overflow-hidden"
                style={{ flex: 1 }}
              >
                <View
                  className="aspect-square items-center justify-center"
                  style={{ backgroundColor: item.washBg }}
                >
                  <Icon size={48} color={item.iconColor} strokeWidth={1.5} />
                </View>
                <View className="px-4 pt-4 pb-5">
                  <Text
                    className="text-foreground text-[17px] leading-[22px]"
                    style={{ fontFamily: "Newsreader_400Regular_Italic" }}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}
