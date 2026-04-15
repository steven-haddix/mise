import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { ArrowLeft } from "lucide-react-native";
import { tokens } from "./tokens";

interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function AppHeader({ title, onBack, rightAction }: AppHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-row items-center gap-2 flex-1">
        {onBack && (
          <Button isIconOnly variant="ghost" size="sm" onPress={onBack}>
            <ArrowLeft size={20} color={tokens.foreground} />
          </Button>
        )}
        {title && (
          <Text className="text-foreground text-lg font-semibold flex-1" numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
      {rightAction}
    </View>
  );
}
