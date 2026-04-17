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
  {
    label: "Sourdough loaf",
    prompt: "Help me plan a country sourdough loaf for tomorrow afternoon.",
  },
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
          <Text className="text-accent text-[13px]" style={{ fontFamily: "Geist_500Medium" }}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
