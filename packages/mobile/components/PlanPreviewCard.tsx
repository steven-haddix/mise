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

interface Props {
  data: PlanPreviewData;
  pushPermission: PermissionState;
  onBuild: () => Promise<void>;
  onViewCook: (cookId: string) => void;
  buildError?: string | null;
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
    <Card className={`my-1.5 self-stretch ${isSuperseded ? "opacity-60" : ""}`}>
      <Card.Body>
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-foreground text-base font-bold flex-1 ${
              isSuperseded ? "line-through" : ""
            }`}
          >
            {emoji} {data.title} Plan
          </Text>
          {isSuperseded && (
            <Chip size="sm" color="danger" variant="soft">
              <Chip.Label>Revised</Chip.Label>
            </Chip>
          )}
          {isConfirmed && (
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label>Built ✓</Chip.Label>
            </Chip>
          )}
        </View>

        <View className="mt-2.5 gap-1.5">
          {firstStepAt && (
            <MetaRow icon="🕐" label={`Start time: ${formatClock(firstStepAt)}`} />
          )}
          {totalDurationSec > 0 && (
            <MetaRow icon="⏱️" label={`Total time: ${formatTotalDuration(totalDurationSec)}`} />
          )}
          <ReminderRow state={pushPermission} />
        </View>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-center gap-1 mt-2.5"
        >
          <Text className="text-primary text-xs">
            {expanded ? "Hide steps" : `Show ${data.steps.length} steps`}
          </Text>
          <ChevronDown
            size={14}
            color={tokens.primary}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        {expanded && (
          <View className="mt-2.5 gap-2">
            {data.steps.map((step, i) => {
              const stamp = stepStamps[i];
              return (
                <View key={i}>
                  {stamp && (
                    <Text className="text-muted-foreground text-xs uppercase">
                      {stamp.dayLabel ? `${stamp.dayLabel} · ${stamp.time}` : stamp.time}
                    </Text>
                  )}
                  <Text className="text-foreground text-sm font-semibold">{step.title}</Text>
                </View>
              );
            })}
          </View>
        )}

        {buildError && <Text className="text-danger text-xs mt-2.5">{buildError}</Text>}

        {data.state === "active" && (
          <Button variant="primary" onPress={handleBuild} isDisabled={loading} className="mt-3">
            {loading ? (
              <Spinner size="sm" color={tokens.foreground} />
            ) : (
              <Button.Label>Build it</Button.Label>
            )}
          </Button>
        )}
        {isConfirmed && data.createdCookId && (
          <Button
            variant="outline"
            onPress={() => onViewCook(data.createdCookId!)}
            className="mt-3"
          >
            <Button.Label>View cook →</Button.Label>
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <Text className="text-foreground text-sm opacity-80">
      {icon} {label}
    </Text>
  );
}

function ReminderRow({ state }: { state: PermissionState }) {
  if (state === "denied") {
    return (
      <Pressable onPress={() => Linking.openSettings()}>
        <Text className="text-warning text-sm">⚠️ Enable reminders in settings</Text>
      </Pressable>
    );
  }
  return <Text className="text-foreground text-sm opacity-80">🔔 With step reminders</Text>;
}
