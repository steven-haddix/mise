import { useState, useCallback } from "react";
import { View, FlatList, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import { listCooks } from "../../../lib/api";
import { CookCard } from "../../../components/CookCard";
import { Screen, AppHeader, Eyebrow, tokens } from "../../../components/ui";

export default function AllCooksScreen() {
  const { activeCooks, completedCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (error) {
      console.error("[AllCooks] fetch error:", error);
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

  const sections = [
    ...(activeCooks.length ? [{ label: "ACTIVE", cooks: activeCooks }] : []),
    ...(completedCooks.length ? [{ label: "COMPLETED", cooks: completedCooks }] : []),
  ];

  return (
    <Screen edges={["top"]}>
      <AppHeader
        eyebrow="YOUR COOKS"
        title="All cooks"
        italic
        onBack={() => router.back()}
      />

      <FlatList
        data={sections}
        keyExtractor={(s) => s.label}
        renderItem={({ item }) => (
          <View className="mb-6">
            <View className="px-6 mb-2">
              <Eyebrow color="ink-tertiary">{item.label}</Eyebrow>
            </View>
            <View className="px-6 gap-3">
              {item.cooks.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/(tabs)/(cooks)/${c.id}` as never)}
                >
                  <CookCard cook={c} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.accent}
          />
        }
      />
    </Screen>
  );
}
