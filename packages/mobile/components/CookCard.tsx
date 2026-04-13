import { View, Text } from "react-native";
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

  const subtitleLeft = dayInfo.startsInFuture ? dayInfo.label : dayInfo.label;
  const subtitleRight = firstStepDate ? `Started ${formatStartDate(firstStepDate)}` : "";

  return (
    <View
      style={{
        backgroundColor: "#1a1a2a",
        borderRadius: 14,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: "#4ade80",
      }}
    >
      {/* Header row */}
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff", flex: 1 }}>
          {emoji} {cook.title}
        </Text>
        {isActive && (
          <View
            style={{ backgroundColor: "#1a3a2a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}
          >
            <Text style={{ color: "#4ade80", fontSize: 11, fontWeight: "700" }}>Active</Text>
          </View>
        )}
      </View>

      {/* Day X of Y · Started */}
      <Text style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        {subtitleLeft}
        {subtitleRight ? ` · ${subtitleRight}` : ""}
      </Text>

      {/* Progress bar + % */}
      {total > 0 && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                flex: 1,
                height: 6,
                backgroundColor: "#333",
                borderRadius: 3,
              }}
            >
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: 6,
                  backgroundColor: "#4ade80",
                  borderRadius: 3,
                }}
              />
            </View>
            <Text style={{ color: "#888", fontSize: 12, fontWeight: "600", minWidth: 34, textAlign: "right" }}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>
            {completedSteps} of {total} steps complete
          </Text>
        </View>
      )}

      {/* Next step box */}
      {isActive && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#12121f",
            borderRadius: 10,
            padding: 10,
          }}
        >
          {nextStep ? (
            <>
              <Text style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Next
              </Text>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 }}>
                {nextStep.title}
              </Text>
              <Text style={{ color: "#4ade80", fontSize: 12, marginTop: 2 }}>
                {formatTimeUntil(new Date(nextStep.scheduledAt), now)}
              </Text>
            </>
          ) : (
            <Text style={{ color: "#888", fontSize: 12 }}>
              All steps complete — mark cook done on detail screen.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
