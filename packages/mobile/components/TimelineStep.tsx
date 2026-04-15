import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { Check } from "lucide-react-native";
import type { CookStep } from "@mise/shared";
import { tokens } from "./ui/tokens";

interface TimelineStepProps {
  step: CookStep;
  isLast: boolean;
  onMarkComplete: () => void;
}

export function TimelineStep({ step, isLast, onMarkComplete }: TimelineStepProps) {
  const isCompleted = step.status === "completed";
  const isCurrent = step.status === "notified" || step.status === "pending";
  const now = new Date();
  const scheduledTime = new Date(step.scheduledAt);
  const isDue = scheduledTime <= now;
  const isActive = isCurrent && isDue;

  const dotBg = isCompleted ? "bg-success" : isActive ? "bg-primary" : "bg-muted";
  const timestampColor = isCompleted
    ? "text-success"
    : isActive
      ? "text-primary"
      : "text-muted-foreground";
  const titleColor = isActive
    ? "text-primary"
    : isCompleted
      ? "text-foreground"
      : "text-muted-foreground";

  return (
    <View className={`flex-row ${isLast ? "" : "pb-1"}`}>
      <View className="w-8 items-center">
        <View
          className={`${dotBg} rounded-full ${isActive ? "w-3.5 h-3.5" : "w-3 h-3"} z-10`}
          style={
            isActive
              ? {
                  shadowColor: tokens.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                }
              : undefined
          }
        >
          {isCompleted && (
            <View className="flex-1 items-center justify-center">
              <Check size={8} color={tokens.background} strokeWidth={3} />
            </View>
          )}
        </View>
        {!isLast && (
          <View className={`w-0.5 flex-1 mt-0.5 ${isCompleted ? "bg-success" : "bg-muted"}`} />
        )}
      </View>

      <View
        className={`flex-1 pl-3 ${isLast ? "" : "pb-6"} ${
          isCompleted || isActive ? "" : "opacity-50"
        }`}
      >
        <Text className={`text-xs uppercase ${timestampColor}`}>
          {scheduledTime.toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          {isActive ? " — NOW" : ""}
          {isCompleted ? " ✓" : ""}
        </Text>
        <Text className={`text-base font-semibold mt-0.5 ${titleColor}`}>{step.title}</Text>
        <Text className="text-sm text-muted-foreground mt-1 leading-5">{step.description}</Text>

        {isActive && !isCompleted && (
          <Button
            variant="primary"
            size="sm"
            onPress={onMarkComplete}
            className="mt-2.5 self-start"
          >
            <Check size={14} color={tokens.foreground} />
            <Button.Label>Mark as done</Button.Label>
          </Button>
        )}
      </View>
    </View>
  );
}
