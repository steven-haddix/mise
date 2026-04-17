import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { Bell } from "lucide-react-native";
import { InkCard, Eyebrow, Display, tokens } from "./ui";
import { formatCountdown } from "../lib/time-format";

interface HappeningNowCardProps {
  stepTitle: string;
  cookSubtitle?: string;
  targetAt: Date;                 // when countdown reaches zero
  onMarkComplete: () => void | Promise<void>;
  onSnooze?: () => void;
  progress?: number;              // 0..1 — overall cook progress (optional)
  progressLabel?: string;
}

export function HappeningNowCard({
  stepTitle,
  cookSubtitle,
  targetAt,
  onMarkComplete,
  onSnooze,
  progress,
  progressLabel,
}: HappeningNowCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = Math.floor((targetAt.getTime() - now.getTime()) / 1000);
  const overdue = secondsLeft < 0;

  return (
    <InkCard>
      <View className="flex-row items-start justify-between">
        <Eyebrow color="ink-inverse-soft">
          {overdue ? "OVERDUE" : "HAPPENING NOW"}
        </Eyebrow>
        <Text
          className="text-[#F4EDE1] text-[22px]"
          style={{ fontFamily: "IBMPlexMono_500Medium" }}
        >
          {formatCountdown(Math.abs(secondsLeft))}
        </Text>
      </View>

      <View className="mt-3">
        <Display size="md" className="text-[#F4EDE1]">
          {stepTitle}
        </Display>
        {cookSubtitle && (
          <Text
            className="text-[#C9C4AE] text-[14px] mt-1"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            {cookSubtitle}
          </Text>
        )}
      </View>

      {typeof progress === "number" && (
        <View className="mt-4">
          <View className="h-[2px] bg-[#3C4B37] rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          {progressLabel && (
            <Text
              className="text-[#C9C4AE] text-[11px] mt-2"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              {progressLabel}
            </Text>
          )}
        </View>
      )}

      <View className="flex-row items-center gap-3 mt-5">
        <Button
          variant="primary"
          onPress={onMarkComplete}
          className="flex-1 rounded-xl h-12 bg-accent"
        >
          <Button.Label className="text-white font-semibold">
            Mark step complete
          </Button.Label>
        </Button>
        {onSnooze && (
          <Button
            isIconOnly
            variant="ghost"
            onPress={onSnooze}
            className="rounded-full h-12 w-12 bg-[#3C4B37] border border-[#C9C4AE]/20"
          >
            <Bell size={20} color={tokens.inkInverseSoft} strokeWidth={2} />
          </Button>
        )}
      </View>
    </InkCard>
  );
}
