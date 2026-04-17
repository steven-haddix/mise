import { View } from "react-native";
import { Chip } from "heroui-native";
import { Display } from "./Display";

interface SectionHeadProps {
  title: string;
  count?: number;
  countLabel?: string;
  italic?: boolean;
}

export function SectionHead({ title, count, countLabel, italic }: SectionHeadProps) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Display size="md" italic={italic}>{title}</Display>
      {typeof count === "number" && (
        <Chip size="sm" color="success" variant="soft" className="rounded-md h-6 px-2 bg-[#DDE5D2] border-0">
          <Chip.Label className="text-[11px] font-medium text-[#2F3D2A]">
            {count} {countLabel ?? (count === 1 ? "item" : "items")}
          </Chip.Label>
        </Chip>
      )}
    </View>
  );
}
