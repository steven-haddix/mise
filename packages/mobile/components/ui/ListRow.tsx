import type { ReactNode } from "react";
import { Pressable, View, Text } from "react-native";

interface ListRowProps {
  icon?: ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  rightElement?: ReactNode;
}

export function ListRow({ icon, title, value, onPress, destructive, rightElement }: ListRowProps) {
  const titleClass = destructive ? "text-danger" : "text-foreground";
  const content = (
    <View className="flex-row items-center gap-3 bg-card rounded-xl p-4">
      {icon && <View>{icon}</View>}
      <View className="flex-1">
        <Text className={`${titleClass} text-base`}>{title}</Text>
      </View>
      {rightElement ??
        (value ? <Text className="text-muted-foreground text-sm">{value}</Text> : null)}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}
