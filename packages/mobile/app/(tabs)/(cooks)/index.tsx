import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import { listCooks } from "../../../lib/api";
import { CookCard } from "../../../components/CookCard";

export default function CooksScreen() {
  const { activeCooks, completedCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (error) {
      console.error("[Cooks] fetch error:", error);
    }
  }, []);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#c9a0dc" }}>My Cooks</Text>
      </View>

      <FlatList
        data={[...activeCooks, ...completedCooks]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/(cooks)/${item.id}` as any)}>
            <CookCard cook={item} />
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a0dc" />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🍳</Text>
            <Text style={{ color: "#666", fontSize: 16, textAlign: "center" }}>
              No cooks yet.{"\n"}Start one in the Chat tab!
            </Text>
          </View>
        }
        ListHeaderComponent={
          activeCooks.length > 0 ? (
            <Text
              style={{
                fontSize: 12,
                color: "#7ec8e3",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Active
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
