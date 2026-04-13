import { useState, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { emojiForCookTitle } from "../lib/emoji-map";
import { formatClock, formatTotalDuration } from "../lib/time-format";
import type { PermissionState } from "../lib/push-permissions";

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

export function PlanPreviewCard({ data, pushPermission, onBuild, onViewCook, buildError }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstStep = data.steps[0];
  const totalDurationSec = useMemo(() => {
    if (!firstStep) return 0;
    return Math.floor(
      (new Date(data.targetTime).getTime() - new Date(firstStep.scheduledAt).getTime()) / 1000,
    );
  }, [data.targetTime, firstStep]);

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
    <View
      style={{
        backgroundColor: "#1a1a2a",
        borderRadius: 14,
        padding: 14,
        marginVertical: 6,
        opacity: isSuperseded ? 0.6 : 1,
        alignSelf: "stretch",
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#fff",
            textDecorationLine: isSuperseded ? "line-through" : "none",
            flex: 1,
          }}
        >
          {emoji} {data.title} Plan
        </Text>
        {isSuperseded && (
          <View style={{ backgroundColor: "#3a2a2a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: "#f87171", fontSize: 11, fontWeight: "600" }}>Revised</Text>
          </View>
        )}
        {isConfirmed && (
          <View style={{ backgroundColor: "#1a3a2a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: "#4ade80", fontSize: 11, fontWeight: "600" }}>Built ✓</Text>
          </View>
        )}
      </View>

      {/* Meta rows */}
      <View style={{ marginTop: 10, gap: 6 }}>
        {firstStep && (
          <MetaRow icon="🕐" label={`Start time: ${formatClock(new Date(firstStep.scheduledAt))}`} />
        )}
        <MetaRow icon="⏱️" label={`Total time: ${formatTotalDuration(totalDurationSec)}`} />
        <ReminderRow state={pushPermission} />
      </View>

      {/* Expand toggle */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }}
      >
        <Text style={{ color: "#c9a0dc", fontSize: 12 }}>
          {expanded ? "Hide steps" : `Show ${data.steps.length} steps`}
        </Text>
        <ChevronDown
          size={14}
          color="#c9a0dc"
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {data.steps.map((step, i) => (
            <View key={i}>
              <Text style={{ color: "#888", fontSize: 11, textTransform: "uppercase" }}>
                {formatClock(new Date(step.scheduledAt))}
              </Text>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{step.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Build error */}
      {buildError && (
        <Text style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{buildError}</Text>
      )}

      {/* Action */}
      {data.state === "active" && (
        <Pressable
          onPress={handleBuild}
          disabled={loading}
          style={{
            backgroundColor: "#4ade80",
            paddingVertical: 12,
            borderRadius: 10,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>Build it</Text>
          )}
        </Pressable>
      )}
      {isConfirmed && data.createdCookId && (
        <Pressable
          onPress={() => onViewCook(data.createdCookId!)}
          style={{
            borderWidth: 1,
            borderColor: "#4ade80",
            paddingVertical: 10,
            borderRadius: 10,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#4ade80", fontWeight: "600" }}>View cook →</Text>
        </Pressable>
      )}
    </View>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <Text style={{ color: "#bbb", fontSize: 13 }}>
      {icon}  {label}
    </Text>
  );
}

function ReminderRow({ state }: { state: PermissionState }) {
  if (state === "denied") {
    return (
      <Pressable onPress={() => Linking.openSettings()}>
        <Text style={{ color: "#fbbf24", fontSize: 13 }}>
          ⚠️  Enable reminders in settings
        </Text>
      </Pressable>
    );
  }
  return <Text style={{ color: "#bbb", fontSize: 13 }}>🔔  With step reminders</Text>;
}
