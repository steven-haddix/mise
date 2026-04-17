import type React from "react";
import { View, Text, Pressable } from "react-native";

export type StepStatus = "upcoming" | "next" | "active" | "done";

interface StepRowProps {
  time: string; // "10:05"
  meridiem?: string; // "AM" / "PM" — optional (stacked under time when present)
  title: string;
  subtitle?: string;
  status: StepStatus;
  onPress?: () => void;
  trailing?: React.ReactNode;
  expanded?: React.ReactNode; // inline content under the row when active
}

const DOT: Record<StepStatus, string> = {
  upcoming: "bg-[#E4DBC9]",
  next: "bg-accent",
  active: "bg-accent",
  done: "bg-primary",
};

export function StepRow({
  time,
  meridiem,
  title,
  subtitle,
  status,
  onPress,
  trailing,
  expanded,
}: StepRowProps) {
  const inner = (
    <View className="flex-row items-start py-4 px-6">
      <View className="w-[56px]">
        <Text className="text-foreground text-[18px]" style={{ fontFamily: "Geist_500Medium" }}>
          {time}
        </Text>
        {meridiem && (
          <Text
            className="text-[#9E9488] text-[11px] mt-0.5"
            style={{ fontFamily: "IBMPlexMono_400Regular" }}
          >
            {meridiem}
          </Text>
        )}
      </View>
      <View className="flex-1 pr-3">
        <Text
          className={`text-[17px] leading-[22px] ${status === "upcoming" ? "text-[#6B635A]" : "text-foreground"}`}
          style={{ fontFamily: "Newsreader_400Regular_Italic" }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-[#6B635A] text-[13px] mt-1"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            {subtitle}
          </Text>
        )}
        {expanded && <View className="mt-3">{expanded}</View>}
      </View>
      <View className="items-center justify-center pt-2">
        {trailing ?? <View className={`w-2.5 h-2.5 rounded-full ${DOT[status]}`} />}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{inner}</Pressable>;
  }
  return inner;
}
