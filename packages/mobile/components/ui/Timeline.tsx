import type React from "react";
import { View, Text } from "react-native";
import { type StepStatus } from "./StepRow";
import { Eyebrow } from "./Eyebrow";

export interface TimelineItem {
  id: string;
  time: string;
  meridiem?: string;
  title: string;
  description?: string;
  dayLabel: string | null;
  status: StepStatus;
  expanded?: React.ReactNode;
}

interface TimelineProps {
  steps: TimelineItem[];
}

interface Group {
  label: string;
  items: TimelineItem[];
}

const DOT: Record<StepStatus, string> = {
  upcoming: "bg-[#E4DBC9]",
  next: "bg-accent",
  active: "bg-accent",
  done: "bg-primary",
};

function groupByDay(steps: TimelineItem[]): Group[] {
  const groups: Group[] = [];
  for (const step of steps) {
    if (step.dayLabel) {
      groups.push({ label: step.dayLabel, items: [step] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].items.push(step);
    } else {
      groups.push({ label: "", items: [step] });
    }
  }
  return groups;
}

function TimelineRow({
  item,
  isFirst,
  isLast,
}: {
  item: TimelineItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <View className="flex-row items-start py-4 pl-5 pr-6 relative">
      {/* connector from row top down to dot top */}
      {!isFirst && (
        <View
          className="absolute bg-[#E4DBC9]"
          style={{ left: 25, top: 0, height: 24, width: 1 }}
        />
      )}
      {/* connector from dot bottom to row bottom */}
      {!isLast && (
        <View
          className="absolute bg-[#E4DBC9]"
          style={{ left: 25, top: 34, bottom: 0, width: 1 }}
        />
      )}
      {/* dot */}
      <View className="pt-2">
        <View className={`w-2.5 h-2.5 rounded-full ${DOT[item.status]}`} />
      </View>
      {/* time gutter */}
      <View className="w-[56px] ml-3">
        <Text
          className="text-foreground text-[18px]"
          style={{ fontFamily: "Geist_500Medium" }}
        >
          {item.time}
        </Text>
        {item.meridiem && (
          <Text
            className="text-[#9E9488] text-[11px] mt-0.5"
            style={{ fontFamily: "IBMPlexMono_400Regular" }}
          >
            {item.meridiem}
          </Text>
        )}
      </View>
      {/* main content */}
      <View className="flex-1 pl-3">
        <Text
          className={`text-[17px] leading-[22px] ${
            item.status === "upcoming" ? "text-[#6B635A]" : "text-foreground"
          }`}
          style={{ fontFamily: "Newsreader_400Regular_Italic" }}
        >
          {item.title}
        </Text>
        {item.description && (
          <Text
            className="text-[#6B635A] text-[13px] mt-1"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            {item.description}
          </Text>
        )}
        {item.expanded && <View className="mt-3">{item.expanded}</View>}
      </View>
    </View>
  );
}

export function Timeline({ steps }: TimelineProps) {
  const groups = groupByDay(steps);
  return (
    <View>
      {groups.map((group, gIdx) => (
        <View key={gIdx} className={gIdx > 0 ? "mt-6" : ""}>
          {group.label && (
            <View className="px-6 mb-2">
              <Eyebrow color="ink-tertiary">{group.label}</Eyebrow>
            </View>
          )}
          {group.items.map((item, i) => (
            <TimelineRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === group.items.length - 1}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
