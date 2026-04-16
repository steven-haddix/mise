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
      className={`bg-card rounded-xl border border-dashed border-primary/40 flex-row items-center gap-4 px-4 ${
        prominent ? "py-8" : "py-4"
      }`}
    >
      <View
        className={`rounded-lg bg-primary/10 items-center justify-center border border-primary/20 ${
          prominent ? "w-11 h-11" : "w-9 h-9"
        }`}
      >
        <Plus size={prominent ? 22 : 18} color={tokens.primary} strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <Text className={`text-foreground font-bold tracking-tight ${prominent ? "text-lg" : "text-base"}`}>
          {prominent ? "Tap to start your first cook" : "Start a new cook"}
        </Text>
        <Text className="text-muted-foreground text-[12px] font-medium mt-0.5 opacity-80">Tell Mise what you're making</Text>
      </View>
    </Pressable>
  );
}
