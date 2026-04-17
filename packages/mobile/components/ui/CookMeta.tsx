import { View, Text } from "react-native";
import { Eyebrow } from "./Eyebrow";

interface MetaColumn {
  label: string;
  value: string;
}

interface CookMetaProps {
  columns: MetaColumn[];
  progress?: number; // 0..1
  progressLabel?: string;
}

export function CookMeta({ columns, progress, progressLabel }: CookMetaProps) {
  return (
    <View className="px-6 py-4 border-b border-[#EDE5D3]">
      <View className="flex-row gap-6">
        {columns.map((c) => (
          <View key={c.label} className="flex-1">
            <Eyebrow color="ink-tertiary">{c.label}</Eyebrow>
            <Text
              className="text-foreground text-[16px] mt-1"
              style={{ fontFamily: "Geist_500Medium" }}
            >
              {c.value}
            </Text>
          </View>
        ))}
      </View>
      {typeof progress === "number" && (
        <View className="mt-4">
          <View className="h-[2px] bg-[#EDE5D3] rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          {progressLabel && (
            <Text
              className="text-[#9E9488] text-[11px] mt-2"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              {progressLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
