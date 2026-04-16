import { useState, useMemo } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Card, Chip, Button, Spinner } from "heroui-native";
import { emojiForCookTitle } from "../lib/emoji-map";
import { formatClock, formatStepTimestamps, formatTotalDuration } from "../lib/time-format";
import type { PermissionState } from "../lib/push-permissions";
import { tokens } from "./ui/tokens";

export interface PlanPreviewData {
  proposalId: string;
  title: string;
  targetTime: string;
  steps: Array<{
    title: string;
    description: string;
    scheduledAt: string;
    durationFromPrev?: number;
  }>;
  state: "active" | "superseded" | "confirmed";
  createdCookId: string | null;
}

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function PlanPreviewCard({ data, pushPermission, onBuild, onViewCook, buildError }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstStep = data.steps[0];
  const firstStepAt = firstStep ? parseDate(firstStep.scheduledAt) : null;
  const targetAt = parseDate(data.targetTime);
  const totalDurationSec = useMemo(() => {
    if (!firstStepAt || !targetAt) return 0;
    return Math.floor((targetAt.getTime() - firstStepAt.getTime()) / 1000);
  }, [firstStepAt, targetAt]);
  const stepStamps = useMemo(
    () => formatStepTimestamps(data.steps.map((s) => parseDate(s.scheduledAt))),
    [data.steps],
  );

  const groups = useMemo(() => {
    const result: Array<{ label: string; steps: Array<{ step: any; time: string }> }> = [];
    data.steps.forEach((step, i) => {
      const stamp = stepStamps[i];
      if (stamp?.dayLabel) {
        result.push({ label: stamp.dayLabel, steps: [] });
      }
      if (result.length > 0) {
        result[result.length - 1].steps.push({ step, time: stamp?.time || "" });
      }
    });
    return result;
  }, [data.steps, stepStamps]);

  const emoji = emojiForCookTitle(data.title);

  const handleBuild = async () => {
    setLoading(true);
    try {
      await onBuild();
    } finally {
      setLoading(false);
    }
  };

  const isSuperseded = data.state === "superseded";
  const isConfirmed = data.state === "confirmed";

  return (
    <Card className={`my-2 self-stretch rounded-xl border-t border-b border-dashed border-border/40 ${isSuperseded ? "opacity-50" : ""}`}>
      <Card.Body className="p-4">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-foreground text-[16px] font-bold flex-1 ${
              isSuperseded ? "line-through" : ""
            }`}
          >
            {emoji} {data.title} Plan
          </Text>
          {isSuperseded && (
            <Chip size="sm" color="danger" variant="soft" className="rounded-md">
              <Chip.Label>Revised</Chip.Label>
            </Chip>
          )}
          {isConfirmed && (
            <Chip size="sm" color="success" variant="soft" className="rounded-md">
              <Chip.Label>Built ✓</Chip.Label>
            </Chip>
          )}
        </View>

        <View className="mt-3 gap-1.5">
          {firstStepAt && (
            <MetaRow icon="🕐" label={`Start: ${formatClock(firstStepAt)}`} />
          )}
          {totalDurationSec > 0 && (
            <MetaRow icon="⏱️" label={`Total: ${formatTotalDuration(totalDurationSec)}`} />
          )}
          <ReminderRow state={pushPermission} />
        </View>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-center gap-1 mt-3"
        >
          <Text className="text-primary text-[12px] font-medium">
            {expanded ? "Hide steps" : `Show ${data.steps.length} steps`}
          </Text>
          <ChevronDown
            size={14}
            color={tokens.primary}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        {expanded && (
          <View className="mt-4 border-t border-border/10 pt-5">
            {groups.map((group, gIdx) => (
              <View key={gIdx} className={gIdx > 0 ? "mt-4" : ""}>
                <Text className="text-muted-foreground text-[10px] font-bold tracking-[2px] uppercase mb-4 px-1">
                  {group.label}
                </Text>
                <View>
                  {group.steps.map((item, sIdx) => {
                    const isLastInGroup = sIdx === group.steps.length - 1;
                    const isLastOverall = gIdx === groups.length - 1 && isLastInGroup;
                    return (
                      <View key={sIdx} className="flex-row">
                        {/* Timeline Column */}
                        <View className="w-3 items-center mr-4">
                          <View className="z-10 w-2 h-2 rounded-full bg-primary mt-1.5" />
                          {!isLastOverall && (
                            <View className="absolute top-1.5 bottom-0 w-[0.5px] bg-primary/20" />
                          )}
                        </View>
                        
                        <View className={`flex-1 ${isLastInGroup ? "pb-2" : "pb-5"}`}>
                          <View className="flex-row items-baseline gap-2">
                            <Text className="text-foreground text-[13px] font-bold opacity-60">
                              {item.time}
                            </Text>
                            <Text className="text-foreground text-[14px] font-semibold flex-1">
                              {item.step.title}
                            </Text>
                          </View>
                          {item.step.description && (
                            <Text className="text-muted-foreground text-[11px] mt-1 leading-4" numberOfLines={2}>
                              {item.step.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {buildError && <Text className="text-danger text-[11px] mt-2.5 font-medium">{buildError}</Text>}

        {data.state === "active" && (
          <Button variant="primary" onPress={handleBuild} isDisabled={loading} className="mt-4 rounded-lg h-10">
            {loading ? (
              <Spinner size="sm" color={tokens.primaryForeground} />
            ) : (
              <Button.Label className="font-bold text-sm">Build it</Button.Label>
            )}
          </Button>
        )}
        {isConfirmed && data.createdCookId && (
          <Button
            variant="outline"
            onPress={() => onViewCook(data.createdCookId!)}
            className="mt-4 rounded-lg h-10 border-primary/30"
          >
            <Button.Label className="text-primary font-bold text-sm">View cook →</Button.Label>
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-[14px]">{icon}</Text>
      <Text className="text-foreground text-[14px] font-medium opacity-90">
        {label}
      </Text>
    </View>
  );
}

function ReminderRow({ state }: { state: PermissionState }) {
  if (state === "denied") {
    return (
      <Pressable onPress={() => Linking.openSettings()} className="flex-row items-center gap-2">
        <Text className="text-[14px]">⚠️</Text>
        <Text className="text-warning text-[14px] font-medium">Enable reminders in settings</Text>
      </Pressable>
    );
  }
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-[14px]">🔔</Text>
      <Text className="text-foreground text-[14px] font-medium opacity-90">With step reminders</Text>
    </View>
  );
}

interface Props {
  data: PlanPreviewData;
  pushPermission: PermissionState;
  onBuild: () => Promise<void>;
  onViewCook: (cookId: string) => void;
  buildError?: string | null;
}
