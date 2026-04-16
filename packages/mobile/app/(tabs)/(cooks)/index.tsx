import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import { listCooks } from "../../../lib/api";
import { CookCard } from "../../../components/CookCard";
import { StartNewCookCard } from "../../../components/StartNewCookCard";
import { getGreeting } from "../../../lib/time-format";
import { Screen, tokens } from "../../../components/ui";

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
    <Screen edges={["top"]}>
      <View className="px-6 pt-6 pb-2">
        <Text className="text-foreground text-[34px] font-bold tracking-tight">{getGreeting()}</Text>
        <Text className="text-muted-foreground text-[14px] font-medium mt-1 uppercase tracking-wider opacity-80">{subtitle}</Text>
      </View>

      <FlatList
        data={activeCooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/(cooks)/${item.id}` as never)}>
            <CookCard cook={item} />
          </Pressable>
        )}
        contentContainerStyle={{ padding: 24, paddingBottom: 140, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.primary}
          />
        }
        ListFooterComponent={
          <View className={count === 0 ? "mt-16" : "mt-2"}>
            <StartNewCookCard variant={count === 0 ? "prominent" : "compact"} />
          </View>
        }
      />
    </Screen>
  );
}
