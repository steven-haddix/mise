import { View, Text, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import { router } from "expo-router";
import { tokens } from "./ui/tokens";

interface Props {
  variant?: "compact" | "prominent";
}

export function StartNewCookCard({ variant = "compact" }: Props) {
  const prominent = variant === "prominent";
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/(chat)?new=1" as never)}
      className={`bg-card rounded-2xl border border-dashed border-primary flex-row items-center gap-3 px-4 ${
        prominent ? "py-7" : "py-4"
      }`}
    >
      <View
        className={`rounded-full bg-primary-muted items-center justify-center ${
          prominent ? "w-11 h-11" : "w-9 h-9"
        }`}
      >
        <Plus size={prominent ? 24 : 20} color={tokens.primary} />
      </View>
      <View className="flex-1">
        <Text className={`text-foreground font-semibold ${prominent ? "text-lg" : "text-base"}`}>
          {prominent ? "Tap to start your first cook" : "Start a new cook"}
        </Text>
        <Text className="text-muted-foreground text-xs mt-0.5">Tell Mise what you're making</Text>
      </View>
    </Pressable>
  );
}
