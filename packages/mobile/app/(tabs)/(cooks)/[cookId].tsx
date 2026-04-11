import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, MessageCircle, Check } from "lucide-react-native";
import { getCook, updateStep } from "../../../lib/api";
import { TimelineStep } from "../../../components/TimelineStep";
import type { CookWithSteps } from "@mise/shared";

export default function CookTimelineScreen() {
  const { cookId } = useLocalSearchParams<{ cookId: string }>();
  const [cook, setCook] = useState<CookWithSteps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cookId) return;
    getCook(cookId)
      .then(setCook)
      .finally(() => setLoading(false));
  }, [cookId]);

  const handleMarkComplete = async (stepId: string) => {
    if (!cookId) return;
    await updateStep(cookId, stepId, { status: "completed" });
    const updated = await getCook(cookId);
    setCook(updated);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#c9a0dc" />
      </View>
    );
  }

  if (!cook) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#666" }}>Cook not found</Text>
      </View>
    );
  }

  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const progress = cook.steps.length > 0 ? completedSteps / cook.steps.length : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color="#888" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff", flex: 1, textAlign: "center" }}>
          {cook.title}
        </Text>
        <Pressable
          onPress={() => {
            if (cook.conversationId) {
              router.push("/(tabs)/(chat)");
            }
          }}
          hitSlop={8}
        >
          <MessageCircle size={22} color="#c9a0dc" />
        </Pressable>
      </View>

      {/* Target time + progress */}
      <View style={{ alignItems: "center", paddingBottom: 16 }}>
        <Text style={{ color: "#888", fontSize: 13 }}>
          Target: {new Date(cook.targetTime).toLocaleString()}
        </Text>
        <View
          style={{
            width: "60%",
            height: 4,
            backgroundColor: "#333",
            borderRadius: 2,
            marginTop: 8,
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: 4,
              backgroundColor: "#4ade80",
              borderRadius: 2,
            }}
          />
        </View>
        <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>
          {completedSteps} / {cook.steps.length} steps complete
        </Text>
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {cook.steps.map((step, index) => (
          <TimelineStep
            key={step.id}
            step={step}
            isLast={index === cook.steps.length - 1}
            onMarkComplete={() => handleMarkComplete(step.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
