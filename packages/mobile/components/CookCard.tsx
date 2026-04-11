import { View, Text } from "react-native";
import type { CookWithSteps } from "@mise/shared";

interface CookCardProps {
  cook: CookWithSteps;
}

export function CookCard({ cook }: CookCardProps) {
  const isActive = cook.status === "planning" || cook.status === "active";
  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const progress = cook.steps.length > 0 ? completedSteps / cook.steps.length : 0;

  // Find next pending step
  const now = new Date();
  const nextStep = cook.steps.find(
    (s) => s.status === "pending" || s.status === "notified",
  );

  const getTimeUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - now.getTime();
    if (diff < 0) return "now";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const accentColor = isActive ? "#4ade80" : "#666";

  return (
    <View
      style={{
        backgroundColor: isActive ? "#1a1a2a" : "#151515",
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        opacity: isActive ? 1 : 0.6,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>{cook.title}</Text>
      <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
        Target: {new Date(cook.targetTime).toLocaleString()}
      </Text>

      {isActive && nextStep && (
        <Text style={{ fontSize: 12, color: accentColor, marginTop: 6 }}>
          ⏱ Next: {nextStep.title} in {getTimeUntil(nextStep.scheduledAt)}
        </Text>
      )}

      {!isActive && (
        <Text style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
          Completed {new Date(cook.updatedAt).toLocaleDateString()} ✓
        </Text>
      )}

      {isActive && cook.steps.length > 0 && (
        <View
          style={{
            height: 4,
            backgroundColor: "#333",
            borderRadius: 2,
            marginTop: 8,
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: 4,
              backgroundColor: accentColor,
              borderRadius: 2,
            }}
          />
        </View>
      )}
    </View>
  );
}
