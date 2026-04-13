import { View, Text, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import { router } from "expo-router";

interface Props {
  variant?: "compact" | "prominent";
}

export function StartNewCookCard({ variant = "compact" }: Props) {
  const prominent = variant === "prominent";
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/(chat)?new=1" as any)}
      style={{
        backgroundColor: "#1a1a2a",
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#c9a0dc",
        paddingVertical: prominent ? 28 : 16,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: prominent ? 44 : 36,
          height: prominent ? 44 : 36,
          borderRadius: prominent ? 22 : 18,
          backgroundColor: "#2a1a3a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={prominent ? 24 : 20} color="#c9a0dc" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: prominent ? 17 : 15, fontWeight: "600" }}>
          {prominent ? "Tap to start your first cook" : "Start a new cook"}
        </Text>
        <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
          Tell Mise what you're making
        </Text>
      </View>
    </Pressable>
  );
}
