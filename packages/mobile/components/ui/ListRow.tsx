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
  const titleColor = destructive ? "text-danger" : "text-foreground";
  const content = (
    <View className="flex-row items-center gap-3 bg-card border border-[#E4DBC9] rounded-xl px-4 py-4">
      {icon && <View>{icon}</View>}
      <View className="flex-1">
        <Text className={`${titleColor} text-[15px]`} style={{ fontFamily: "Geist_500Medium" }}>
          {title}
        </Text>
      </View>
      {rightElement ??
        (value ? (
          <Text
            className="text-[#9E9488] text-[14px]"
            style={{ fontFamily: "Newsreader_400Regular_Italic" }}
          >
            {value}
          </Text>
        ) : null)}
    </View>
  );

  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}
