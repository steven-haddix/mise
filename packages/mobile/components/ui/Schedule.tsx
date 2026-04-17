import { View } from "react-native";
import { StepRow, type StepStatus } from "./StepRow";

export interface ScheduleItem {
  id: string;
  time: string;
  meridiem?: string;
  title: string;
  cookName: string;
  durationLabel?: string; // e.g. "3 min active"
  status: StepStatus;
}

interface ScheduleProps {
  steps: ScheduleItem[];
  onSelect?: (step: ScheduleItem) => void;
  limit?: number;
}

export function Schedule({ steps, onSelect, limit = 5 }: ScheduleProps) {
  const visible = steps.slice(0, limit);
  return (
    <View className="bg-card rounded-2xl border border-[#EDE5D3] overflow-hidden">
      {visible.map((step, i) => (
        <View key={step.id} className={i > 0 ? "border-t border-[#EDE5D3]" : ""}>
          <StepRow
            time={step.time}
            meridiem={step.meridiem}
            title={step.title}
            subtitle={
              step.durationLabel ? `${step.cookName} · ${step.durationLabel}` : step.cookName
            }
            status={step.status}
            onPress={onSelect ? () => onSelect(step) : undefined}
          />
        </View>
      ))}
    </View>
  );
}
