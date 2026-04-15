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
    <Card className="border-l-4 border-l-success">
      <Card.Body>
        <View className="flex-row items-center justify-between">
          <Text className="text-foreground text-base font-bold flex-1">
            {emoji} {cook.title}
          </Text>
          {isActive && (
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label>Active</Chip.Label>
            </Chip>
          )}
        </View>

        <Text className="text-muted-foreground text-xs mt-1">
          {subtitleLeft}
          {subtitleRight ? ` · ${subtitleRight}` : ""}
        </Text>

        {total > 0 && (
          <View className="mt-2.5">
            <View className="flex-row items-center gap-2.5">
              <View className="flex-1 h-1.5 bg-muted rounded-sm">
                <View
                  style={{ width: `${Math.round(progress * 100)}%` }}
                  className="h-1.5 bg-success rounded-sm"
                />
              </View>
              <Text className="text-muted-foreground text-xs font-semibold text-right min-w-[34px]">
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <Text className="text-muted-foreground text-xs mt-1">
              {completedSteps} of {total} steps complete
            </Text>
          </View>
        )}

        {isActive && (
          <View className="mt-3 bg-background rounded-lg p-2.5">
            {nextStep ? (
              <>
                <Text className="text-muted-foreground text-xs uppercase tracking-wider">Next</Text>
                <Text className="text-foreground text-sm font-semibold mt-0.5">
                  {nextStep.title}
                </Text>
                <Text className="text-success text-xs mt-0.5">
                  {formatTimeUntil(new Date(nextStep.scheduledAt), now)}
                </Text>
              </>
            ) : (
              <Text className="text-muted-foreground text-xs">
                All steps complete — mark cook done on detail screen.
              </Text>
            )}
          </View>
        )}
      </Card.Body>
    </Card>
  );
}
