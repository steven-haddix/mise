import { View } from "react-native";
import { StepRow, type StepStatus } from "./StepRow";
import { Eyebrow } from "./Eyebrow";

export interface ScheduleItem {
  id: string;
  time: string;
  meridiem?: string;
  title: string;
  cookName: string;
  durationLabel?: string;
  status: StepStatus;
  dayLabel: string | null;
}

interface ScheduleProps {
  steps: ScheduleItem[];
  onSelect?: (step: ScheduleItem) => void;
  limit?: number;
}

interface Group {
  label: string;
  items: ScheduleItem[];
}

function groupByDay(items: ScheduleItem[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    if (item.dayLabel) {
      groups.push({ label: item.dayLabel, items: [item] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].items.push(item);
    } else {
      groups.push({ label: "", items: [item] });
    }
  }
  return groups;
}

export function Schedule({ steps, onSelect, limit = 5 }: ScheduleProps) {
  const visible = steps.slice(0, limit);
  const groups = groupByDay(visible);
  const multipleDays = groups.length > 1;

  return (
    <View className="gap-5">
      {groups.map((group, gIdx) => (
        <View key={gIdx}>
          {multipleDays && group.label && (
            <View className="mb-2 px-1">
              <Eyebrow color="ink-tertiary">{group.label}</Eyebrow>
            </View>
          )}
          <View className="bg-card rounded-2xl border border-[#EDE5D3] overflow-hidden">
            {group.items.map((step, i) => (
              <View key={step.id} className={i > 0 ? "border-t border-[#EDE5D3]" : ""}>
                <StepRow
                  time={step.time}
                  meridiem={step.meridiem}
                  title={step.title}
                  subtitle={
                    step.durationLabel
                      ? `${step.cookName} · ${step.durationLabel}`
                      : step.cookName
                  }
                  status={step.status}
                  onPress={onSelect ? () => onSelect(step) : undefined}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
