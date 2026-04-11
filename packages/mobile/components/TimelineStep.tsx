import { View, Text, Pressable } from "react-native";
import { Check } from "lucide-react-native";
import type { CookStep } from "@mise/shared";

interface TimelineStepProps {
  step: CookStep;
  isLast: boolean;
  onMarkComplete: () => void;
}

export function TimelineStep({ step, isLast, onMarkComplete }: TimelineStepProps) {
  const isCompleted = step.status === "completed";
  const isCurrent = step.status === "notified" || step.status === "pending";
  const isPending = step.status === "pending";
  const now = new Date();
  const scheduledTime = new Date(step.scheduledAt);
  const isDue = scheduledTime <= now;
  const isActive = isCurrent && isDue;

  const dotColor = isCompleted ? "#4ade80" : isActive ? "#c9a0dc" : "#333";
  const textColor = isCompleted ? "#4ade80" : isActive ? "#c9a0dc" : "#555";

  return (
    <View style={{ flexDirection: "row", paddingBottom: isLast ? 0 : 4 }}>
      {/* Timeline line + dot */}
      <View style={{ width: 32, alignItems: "center" }}>
        <View
          style={{
            width: isActive ? 14 : 12,
            height: isActive ? 14 : 12,
            borderRadius: 7,
            backgroundColor: dotColor,
            zIndex: 1,
            ...(isActive
              ? {
                  shadowColor: "#c9a0dc",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                }
              : {}),
          }}
        >
          {isCompleted && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Check size={8} color="#0a0a0a" strokeWidth={3} />
            </View>
          )}
        </View>
        {!isLast && (
          <View
            style={{
              width: 2,
              flex: 1,
              backgroundColor: isCompleted ? "#4ade80" : "#333",
              marginTop: 2,
            }}
          />
        )}
      </View>

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingLeft: 12,
          paddingBottom: isLast ? 0 : 24,
          opacity: isCompleted || isActive ? 1 : 0.5,
        }}
      >
        <Text style={{ fontSize: 11, color: textColor, textTransform: "uppercase" }}>
          {scheduledTime.toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          {isActive ? " — NOW" : ""}
          {isCompleted ? " ✓" : ""}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: isActive ? "#c9a0dc" : isCompleted ? "#fff" : "#888",
            marginTop: 2,
          }}
        >
          {step.title}
        </Text>
        <Text style={{ fontSize: 13, color: "#888", marginTop: 4, lineHeight: 18 }}>
          {step.description}
        </Text>

        {isActive && !isCompleted && (
          <Pressable
            onPress={onMarkComplete}
            style={{
              backgroundColor: "#2a1a3a",
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 14,
              marginTop: 10,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Check size={14} color="#c9a0dc" />
            <Text style={{ color: "#c9a0dc", fontWeight: "600", fontSize: 13 }}>Mark as done</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
