import { View, Text } from "react-native";
import { Card, Chip } from "heroui-native";
import type { CookWithSteps } from "@mise/shared";
import { emojiForCookTitle } from "../lib/emoji-map";
import { computeDayOfCook, formatStartDate, formatTimeUntil } from "../lib/time-format";

interface CookCardProps {
  cook: CookWithSteps;
}

export function CookCard({ cook }: CookCardProps) {
  const isActive = cook.status === "planning" || cook.status === "active";
  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const total = cook.steps.length;
  const progress = total > 0 ? completedSteps / total : 0;

  const now = new Date();
  const nextStep = cook.steps.find((s) => s.status === "pending" || s.status === "notified");
  const stepDates = cook.steps.map((s) => new Date(s.scheduledAt));
  const dayInfo = computeDayOfCook(stepDates, now);
  const firstStepDate = stepDates.length > 0 ? stepDates[0] : null;
  const emoji = emojiForCookTitle(cook.title);

  const subtitleLeft = dayInfo.label;
  const subtitleRight = firstStepDate ? `Started ${formatStartDate(firstStepDate)}` : "";

  return (
    <Card className="rounded-xl border-l-[3px] border-l-success bg-card shadow-none">
      <Card.Body className="p-3.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-foreground text-[16px] font-bold flex-1">
            {emoji} {cook.title}
          </Text>
          {isActive && (
            <Chip size="sm" color="success" variant="soft" className="rounded-md h-5 px-1.5 border-success/30">
              <Chip.Label className="text-[9px] font-bold tracking-wider uppercase">Active</Chip.Label>
            </Chip>
          )}
        </View>

        <Text className="text-muted-foreground text-[12px] font-medium mt-0.5">
          {subtitleLeft}
          {subtitleRight ? ` · ${subtitleRight}` : ""}
        </Text>

        {total > 0 && (
          <View className="mt-3">
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <View
                  style={{ width: `${Math.round(progress * 100)}%` }}
                  className="h-full bg-success rounded-full"
                />
              </View>
              <Text className="text-muted-foreground text-[11px] font-bold text-right min-w-[34px]">
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
        )}

        {isActive && (
          <View className="mt-3 bg-background/50 rounded-lg p-2.5 border border-border/10">
            {nextStep ? (
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest">Next</Text>
                  <Text className="text-foreground text-[14px] font-semibold mt-0.5" numberOfLines={1}>
                    {nextStep.title}
                  </Text>
                </View>
                <Text className="text-success text-[12px] font-bold ml-2">
                  {formatTimeUntil(new Date(nextStep.scheduledAt), now)}
                </Text>
              </View>
            ) : (
              <Text className="text-muted-foreground text-[12px] font-medium italic">
                All steps complete.
              </Text>
            )}
          </View>
        )}
      </Card.Body>
    </Card>
  );
}
