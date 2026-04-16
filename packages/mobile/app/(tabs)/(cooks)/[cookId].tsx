import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { Button, Spinner, Dialog } from "heroui-native";
import { getCook, updateStep, updateCook } from "../../../lib/api";
import { TimelineStep } from "../../../components/TimelineStep";
import { Screen, AppHeader, tokens } from "../../../components/ui";
import type { CookWithSteps } from "@mise/shared";

export default function CookTimelineScreen() {
  const { cookId } = useLocalSearchParams<{ cookId: string }>();
  const [cook, setCook] = useState<CookWithSteps | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (!cookId) return;
    getCook(cookId)
      .then((c) => setCook(c))
      .catch((err) => {
        if (/HTTP 404/i.test(err?.message ?? "")) {
          setNotFound(true);
        } else {
          console.error("[CookDetail] fetch error:", err);
        }
      })
      .finally(() => setLoading(false));
  }, [cookId]);

  const handleMarkComplete = async (stepId: string) => {
    if (!cookId) return;
    await updateStep(cookId, stepId, { status: "completed" });
    const updated = await getCook(cookId);
    setCook(updated);
  };

  const handleCancel = async () => {
    if (!cook) return;
    try {
      await updateCook(cook.id, { status: "cancelled" });
      setCancelOpen(false);
      router.back();
    } catch (err) {
      console.error("[CookDetail] cancel error:", err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner color={tokens.primary} />
      </View>
    );
  }

  if (notFound || !cook) {
    return (
      <Screen>
        <AppHeader onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl mb-3">🍳</Text>
          <Text className="text-muted-foreground text-base text-center">
            This cook was removed.
          </Text>
          <Button variant="secondary" onPress={() => router.back()} className="mt-4">
            <Button.Label>Back</Button.Label>
          </Button>
        </View>
      </Screen>
    );
  }

  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const progress = cook.steps.length > 0 ? completedSteps / cook.steps.length : 0;

  return (
    <Screen>
      <AppHeader
        title={cook.title}
        onBack={() => router.back()}
        rightAction={
          cook.conversationId ? (
            <Button 
              isIconOnly 
              variant="ghost" 
              size="sm" 
              onPress={() => router.push(`/(tabs)/(chat)/${cook.conversationId}` as never)}
              className="rounded-xl h-10 w-10 bg-card/40 border border-border/10"
            >
              <MessageCircle size={22} color={tokens.primary} strokeWidth={2.5} />
            </Button>
          ) : undefined
        }
      />

      <View className="items-center py-6 border-b border-border/5">
        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">
          Estimated Completion
        </Text>
        <Text className="text-foreground text-[15px] font-bold mt-1">
          {new Date(cook.targetTime).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
        <View className="w-[120px] h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
          <View style={{ width: `${progress * 100}%` }} className="h-full bg-success rounded-full" />
        </View>
        <Text className="text-muted-foreground/60 text-[11px] font-bold mt-2 uppercase tracking-tighter">
          {completedSteps} / {cook.steps.length} steps complete · {Math.round(progress * 100)}%
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        {cook.steps.map((step, index) => (
          <TimelineStep
            key={step.id}
            step={step}
            isLast={index === cook.steps.length - 1}
            onMarkComplete={() => handleMarkComplete(step.id)}
          />
        ))}
        {cook.status !== "cancelled" && cook.status !== "completed" && (
          <Button variant="danger-soft" onPress={() => setCancelOpen(true)} className="mt-6">
            <Button.Label>Cancel cook</Button.Label>
          </Button>
        )}
      </ScrollView>

      <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title className="text-foreground text-lg font-bold">Cancel cook?</Dialog.Title>
            <Dialog.Description className="text-muted-foreground text-sm leading-5">
              This will stop reminders and remove it from Home. You can't undo this.
            </Dialog.Description>
            <View className="flex-row gap-2.5 mt-4">
              <Button variant="tertiary" onPress={() => setCancelOpen(false)} className="flex-1">
                <Button.Label>Keep cooking</Button.Label>
              </Button>
              <Button variant="danger" onPress={handleCancel} className="flex-1">
                <Button.Label>Cancel cook</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
