import { useState, useEffect, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MessageCircle, Check } from "lucide-react-native";
import { Button, Spinner, Dialog } from "heroui-native";
import { getCook, updateStep, updateCook } from "../../../lib/api";
import { HappeningNowCard } from "../../../components/HappeningNowCard";
import {
  Screen,
  AppHeader,
  CookMeta,
  Timeline,
  type TimelineItem,
  type StepStatus,
  Display,
  tokens,
} from "../../../components/ui";
import { computeDayOfCook, formatClock, formatStepTimestamps } from "../../../lib/time-format";
import type { CookWithSteps, CookStep } from "@mise/shared";

function mapStatus(step: CookStep, now: Date): StepStatus {
  if (step.status === "completed") return "done";
  const due = new Date(step.scheduledAt) <= now;
  if (step.status === "notified" || (step.status === "pending" && due)) return "active";
  return "upcoming";
}

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

  const now = new Date();

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!cook) return [];
    const dates = cook.steps.map((s) => new Date(s.scheduledAt));
    const stamps = formatStepTimestamps(dates, now);
    return cook.steps.map((step, i) => {
      const stamp = stamps[i];
      const status = mapStatus(step, now);
      const [time, meridiem] = (stamp?.time ?? formatClock(dates[i])).split(" ");
      return {
        id: step.id,
        time,
        meridiem,
        title: step.title,
        description: step.description || undefined,
        dayLabel: stamp?.dayLabel ?? null,
        status,
        expanded:
          status === "active" ? (
            <Button
              variant="primary"
              size="sm"
              onPress={() => handleMarkComplete(step.id)}
              className="self-start rounded-lg h-9 bg-accent"
            >
              <Check size={14} color={tokens.accentForeground} strokeWidth={2.5} />
              <Button.Label className="text-white font-semibold ml-1">Mark done</Button.Label>
            </Button>
          ) : undefined,
      };
    });
  }, [cook, now]);

  const live = useMemo(() => {
    if (!cook) return null;
    const step =
      cook.steps.find((s) => s.status === "notified") ??
      cook.steps.find((s) => s.status === "pending" && new Date(s.scheduledAt) <= now);
    return step ?? null;
  }, [cook, now]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner color={tokens.accent} />
      </View>
    );
  }

  if (notFound || !cook) {
    return (
      <Screen>
        <AppHeader onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center p-6">
          <Display size="sm" italic>
            This cook was removed.
          </Display>
          <Button variant="secondary" onPress={() => router.back()} className="mt-4 rounded-xl">
            <Button.Label>Back</Button.Label>
          </Button>
        </View>
      </Screen>
    );
  }

  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const total = cook.steps.length;
  const progress = total > 0 ? completedSteps / total : 0;
  const dayInfo = computeDayOfCook(
    cook.steps.map((s) => new Date(s.scheduledAt)),
    now,
  );
  const startedAt = cook.steps[0] ? new Date(cook.steps[0].scheduledAt) : null;
  const targetAt = new Date(cook.targetTime);

  return (
    <Screen>
      <AppHeader
        eyebrow={dayInfo.y > 1 ? `COOK · DAY ${dayInfo.x} OF ${dayInfo.y}` : "COOK"}
        title={cook.title}
        italic
        onBack={() => router.back()}
        rightAction={
          cook.conversationId ? (
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() => router.push(`/(tabs)/(chat)/${cook.conversationId}` as never)}
              className="rounded-full h-9 w-9 bg-transparent border border-[#E4DBC9]"
            >
              <MessageCircle size={18} color={tokens.accent} strokeWidth={2.2} />
            </Button>
          ) : undefined
        }
      />

      <CookMeta
        columns={[
          {
            label: "TARGET",
            value: targetAt.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          },
          { label: "STEPS", value: `${total}` },
          {
            label: "STARTED",
            value: startedAt
              ? startedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—",
          },
        ]}
        progress={progress}
        progressLabel={`${completedSteps} / ${total} · ${Math.round(progress * 100)}%`}
      />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 140 }}>
        {live && (
          <View className="px-6 mb-6">
            <HappeningNowCard
              stepTitle={live.title}
              cookSubtitle={cook.title}
              targetAt={new Date(live.scheduledAt)}
              onMarkComplete={() => handleMarkComplete(live.id)}
            />
          </View>
        )}

        <Timeline steps={timelineItems} />

        {cook.status !== "cancelled" && cook.status !== "completed" && (
          <View className="px-6 mt-8">
            <Button variant="ghost" onPress={() => setCancelOpen(true)} className="self-center">
              <Button.Label className="text-danger">Cancel cook</Button.Label>
            </Button>
          </View>
        )}
      </ScrollView>

      <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="bg-card rounded-2xl">
            <Display size="sm" italic>
              Cancel cook?
            </Display>
            <Dialog.Description
              className="text-[#6B635A] text-[14px] leading-5 mt-2"
              style={{ fontFamily: "Geist_400Regular" }}
            >
              This will stop reminders and remove it from Home. You can't undo this.
            </Dialog.Description>
            <View className="flex-row gap-2.5 mt-4">
              <Button
                variant="tertiary"
                onPress={() => setCancelOpen(false)}
                className="flex-1 rounded-xl h-11"
              >
                <Button.Label>Keep cooking</Button.Label>
              </Button>
              <Button variant="danger" onPress={handleCancel} className="flex-1 rounded-xl h-11">
                <Button.Label className="text-white">Cancel cook</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
