import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import { listCooks } from "../../../lib/api";
import { CookCard } from "../../../components/CookCard";
import { StartNewCookCard } from "../../../components/StartNewCookCard";
import { getGreeting } from "../../../lib/time-format";

export default function CooksScreen() {
  const { activeCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (error) {
      console.error("[Cooks] fetch error:", error);
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

  const count = activeCooks.length;
  const subtitle =
    count === 0
      ? "No cooks in progress."
      : count === 1
        ? "1 active cook today."
        : `${count} active cooks today.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#fff" }}>{getGreeting()}</Text>
        <Text style={{ fontSize: 14, color: "#888", marginTop: 4 }}>{subtitle}</Text>
      </View>

      <FlatList
        data={activeCooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/(cooks)/${item.id}` as any)}>
            <CookCard cook={item} />
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a0dc" />
        }
        ListFooterComponent={
          <View style={{ marginTop: count === 0 ? 80 : 4 }}>
            <StartNewCookCard variant={count === 0 ? "prominent" : "compact"} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
