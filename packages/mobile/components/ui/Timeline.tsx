import type React from "react";
import { View } from "react-native";
import { StepRow, type StepStatus } from "./StepRow";
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
          <View className="relative">
            {/* vertical hairline connecting dots within a group */}
            <View
              className="absolute bg-[#E4DBC9]"
              style={{ right: 29, top: 20, bottom: 20, width: 1 }}
            />
            {group.items.map((item, i) => (
              <View key={item.id} className={i > 0 ? "border-t border-[#EDE5D3]" : ""}>
                <StepRow
                  time={item.time}
                  meridiem={item.meridiem}
                  title={item.title}
                  subtitle={item.description}
                  status={item.status}
                  expanded={item.expanded}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
