import { useState, useMemo } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { ChevronDown, Clock, Timer, Bell, AlertTriangle } from "lucide-react-native";
import { Card, Chip, Button, Spinner } from "heroui-native";
import {
  formatClock,
  formatStepTimestamps,
  formatTotalDuration,
  splitClock,
} from "../lib/time-format";
import type { PermissionState } from "../lib/push-permissions";
import { Display, Eyebrow, Timeline, type TimelineItem, tokens } from "./ui";

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

  const timelineItems: TimelineItem[] = useMemo(() => {
    const stamps = formatStepTimestamps(data.steps.map((s) => parseDate(s.scheduledAt)));
    return data.steps.map((step, i) => {
      const stamp = stamps[i];
      const { time, meridiem } = splitClock(stamp?.time ?? step.scheduledAt);
      return {
        id: String(i),
        time,
        meridiem,
        title: step.title,
        description: step.description || undefined,
        dayLabel: stamp?.dayLabel ?? null,
        status: "upcoming" as const,
      };
    });
  }, [data.steps]);

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

  const stripLabel = isSuperseded ? "REVISED" : isConfirmed ? "BUILT" : "PROPOSAL";

  return (
    <Card
      className={`my-2 self-stretch rounded-2xl border border-[#E4DBC9] overflow-hidden ${
        isSuperseded ? "opacity-60" : ""
      }`}
    >
      {/* Ink strip */}
      <View className="bg-primary px-4 py-3 flex-row items-center justify-between">
        <Eyebrow color="ink-inverse-soft">{stripLabel}</Eyebrow>
        <Text
          className="text-[#C9C4AE] text-[12px]"
          style={{ fontFamily: "Geist_500Medium" }}
          numberOfLines={1}
        >
          {data.title}
        </Text>
      </View>

      <Card.Body className="p-5 bg-card">
        <Display size="sm" italic>
          {data.title}
        </Display>

        <View className="gap-2 mt-3">
          {firstStepAt && (
            <MetaRow
              icon={<Clock size={14} color={tokens.inkTertiary} strokeWidth={2} />}
              label={`Start: ${formatClock(firstStepAt)}`}
            />
          )}
          {totalDurationSec > 0 && (
            <MetaRow
              icon={<Timer size={14} color={tokens.inkTertiary} strokeWidth={2} />}
              label={`Total: ${formatTotalDuration(totalDurationSec)}`}
            />
          )}
          <ReminderRow state={pushPermission} />
        </View>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-center gap-1 mt-4"
        >
          <Text className="text-accent text-[13px]" style={{ fontFamily: "Geist_500Medium" }}>
            {expanded ? "Hide steps" : `Show ${data.steps.length} steps`}
          </Text>
          <ChevronDown
            size={14}
            color={tokens.accent}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        {expanded && (
          <View className="mt-4 -mx-5 border-t border-[#EDE5D3] pt-4">
            <Timeline steps={timelineItems} />
          </View>
        )}

        {buildError && (
          <Text className="text-danger text-[12px] mt-3" style={{ fontFamily: "Geist_500Medium" }}>
            {buildError}
          </Text>
        )}

        {data.state === "active" && (
          <Button
            variant="primary"
            onPress={handleBuild}
            isDisabled={loading}
            className="mt-5 rounded-xl h-12 bg-accent"
          >
            {loading ? (
              <Spinner size="sm" color={tokens.accentForeground} />
            ) : (
              <Button.Label className="text-white font-semibold">Build it</Button.Label>
            )}
          </Button>
        )}
        {isConfirmed && data.createdCookId && (
          <Button
            variant="outline"
            onPress={() => onViewCook(data.createdCookId!)}
            className="mt-5 rounded-xl h-12 border-[#E4DBC9]"
          >
            <Button.Label className="text-accent font-semibold">View cook →</Button.Label>
          </Button>
        )}
      </Card.Body>

      {/* Status chip for non-active states — top-right floating */}
      {isConfirmed && (
        <View className="absolute top-3 right-4">
          <Chip
            size="sm"
            color="success"
            variant="soft"
            className="rounded-md h-5 px-1.5 bg-[#DDE5D2] border-0"
          >
            <Chip.Label className="text-[9px] font-semibold text-[#2F3D2A] uppercase tracking-widest">
              Built
            </Chip.Label>
          </Chip>
        </View>
      )}
    </Card>
  );
}

function MetaRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className="text-foreground text-[14px]" style={{ fontFamily: "Geist_500Medium" }}>
        {label}
      </Text>
    </View>
  );
}

function ReminderRow({ state }: { state: PermissionState }) {
  if (state === "denied") {
    return (
      <Pressable onPress={() => Linking.openSettings()} className="flex-row items-center gap-2">
        <AlertTriangle size={14} color={tokens.warning} strokeWidth={2} />
        <Text className="text-warning text-[14px]" style={{ fontFamily: "Geist_500Medium" }}>
          Enable reminders in settings
        </Text>
      </Pressable>
    );
  }
  return (
    <View className="flex-row items-center gap-2">
      <Bell size={14} color={tokens.inkTertiary} strokeWidth={2} />
      <Text className="text-foreground text-[14px]" style={{ fontFamily: "Geist_500Medium" }}>
        With step reminders
      </Text>
    </View>
  );
}
