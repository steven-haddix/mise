import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useStore } from "../../../lib/store";
import { listCooks, createConversation } from "../../../lib/api";
import {
  Screen,
  Eyebrow,
  Display,
  SectionHead,
  Schedule,
  type ScheduleItem,
  type StepStatus,
  tokens,
} from "../../../components/ui";
import { HappeningNowCard } from "../../../components/HappeningNowCard";
import { ChatComposer } from "../../../components/ChatComposer";
import {
  QuickStartCards,
  DEFAULT_QUICK_START_CARDS,
  type QuickStartCardItem,
} from "../../../components/QuickStartCards";
import {
  getGreeting,
  formatClock,
  splitClock,
  formatStepTimestamps,
} from "../../../lib/time-format";
import type { CookWithSteps, CookStep } from "@mise/shared";

function todayEyebrow(now: Date, activeMultiDay?: { x: number; y: number } | null): string {
  const datePart = now
    .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase()
    .replace(",", " ·");
  if (activeMultiDay && activeMultiDay.y > 1) {
    return `${datePart} · DAY ${activeMultiDay.x} OF ${activeMultiDay.y}`;
  }
  return datePart;
}

interface ScheduleEntry extends ScheduleItem {
  cookId: string;
  scheduledAt: Date;
}

function buildSchedule(cooks: CookWithSteps[], now: Date, limit: number): ScheduleEntry[] {
  const flat: Array<{ cook: CookWithSteps; step: CookStep; scheduledAt: Date }> = [];
  for (const cook of cooks) {
    for (const step of cook.steps) {
      if (step.status === "completed") continue;
      flat.push({ cook, step, scheduledAt: new Date(step.scheduledAt) });
    }
  }
  flat.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const top = flat.slice(0, limit);
  const stamps = formatStepTimestamps(top.map((t) => t.scheduledAt), now);

  return top.map(({ cook, step, scheduledAt }, i) => {
    const { time, meridiem } = splitClock(formatClock(scheduledAt));
    const status: StepStatus = i === 0 ? "next" : "upcoming";
    return {
      id: step.id,
      time,
      meridiem,
      title: step.title,
      cookName: cook.title,
      durationLabel: undefined,
      status,
      cookId: cook.id,
      scheduledAt,
      dayLabel: stamps[i]?.dayLabel ?? null,
    };
  });
}

function findLiveStep(
  cooks: CookWithSteps[],
  now: Date,
): { cook: CookWithSteps; step: CookStep } | null {
  for (const cook of cooks) {
    for (const step of cook.steps) {
      if (step.status === "notified") return { cook, step };
    }
    for (const step of cook.steps) {
      if (step.status === "pending" && new Date(step.scheduledAt) <= now) {
        return { cook, step };
      }
    }
  }
  return null;
}

export default function HomeScreen() {
  const { activeCooks, setCooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const fetchCooks = useCallback(async () => {
    try {
      const data = await listCooks();
      setCooks(data.active, data.completed);
    } catch (err) {
      console.error("[Home] fetch error:", err);
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

  const now = new Date();
  const live = useMemo(() => findLiveStep(activeCooks, now), [activeCooks, now]);
  const schedule = useMemo(() => buildSchedule(activeCooks, now, 5), [activeCooks, now]);
  const activeCount = activeCooks.length;

  const startConversationFromPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || sending) return;
      setSending(true);
      try {
        const { conversationId } = await createConversation();
        setInput("");
        router.push({
          pathname: `/(tabs)/(chat)/${conversationId}`,
          params: { seed: trimmed },
        } as never);
      } catch (err) {
        console.error("[Home] start-conversation error:", err);
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const handleQuickStart = (item: QuickStartCardItem) => {
    startConversationFromPrompt(item.prompt);
  };

  const handleSend = () => startConversationFromPrompt(input);

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 160 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.accent}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6">
            <Eyebrow>{todayEyebrow(now)}</Eyebrow>
            <Display size="lg" className="mt-2">
              {getGreeting()}.
            </Display>
          </View>

          {live && (
            <View className="px-6 mt-6">
              <HappeningNowCard
                stepTitle={live.step.title}
                cookSubtitle={live.cook.title}
                targetAt={new Date(live.step.scheduledAt)}
                onMarkComplete={async () => {
                  router.push(`/(tabs)/(cooks)/${live.cook.id}` as never);
                }}
              />
            </View>
          )}

          {schedule.length > 0 ? (
            <View className="px-6 mt-8">
              <SectionHead title="On the schedule" count={schedule.length} countLabel="steps" />
              <View className="mt-3">
                <Schedule
                  steps={schedule}
                  onSelect={(step) => {
                    const entry = step as ScheduleEntry;
                    router.push(`/(tabs)/(cooks)/${entry.cookId}` as never);
                  }}
                />
              </View>
            </View>
          ) : !live ? (
            <View className="px-6 mt-10">
              <Display size="md" italic>
                What are we cooking today?
              </Display>
            </View>
          ) : null}

          <View className="px-6 mt-12">
            <SectionHead title="Start a prep" italic />
            <View className="mt-4">
              <ChatComposer
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                disabled={sending}
                placeholder="What are you cooking?"
              />
            </View>
            <View className="mt-5">
              <QuickStartCards
                items={DEFAULT_QUICK_START_CARDS}
                onSelect={handleQuickStart}
              />
            </View>
          </View>

          {activeCount > 0 && (
            <Pressable
              onPress={() => router.push("/(tabs)/(cooks)/all" as never)}
              className="mx-6 mt-10 bg-card border border-[#E4DBC9] rounded-xl px-4 py-4 flex-row items-center"
            >
              <View className="flex-1">
                <Eyebrow color="ink-tertiary">YOUR COOKS</Eyebrow>
                <Text
                  className="text-foreground text-[15px] mt-1"
                  style={{ fontFamily: "Geist_500Medium" }}
                >
                  Active cooks · {activeCount}
                </Text>
              </View>
              <ChevronRight size={18} color={tokens.inkTertiary} />
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
