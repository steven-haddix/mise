import type { ReactNode } from "react";
import { View, Text, type TextStyle, StyleSheet } from "react-native";
import { Button } from "heroui-native";
import { ArrowLeft } from "lucide-react-native";
import { tokens } from "./tokens";

interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  titleStyle?: TextStyle;
}

export function AppHeader({ title, onBack, rightAction, titleStyle }: AppHeaderProps) {
  return (
    <View className="relative flex-row items-center justify-center px-6 pt-4 pb-4 border-b border-border/10">
      {/* Left Action Slot */}
      <View className="absolute left-6 h-full justify-center z-10">
        {onBack && (
          <Button 
            isIconOnly 
            variant="ghost" 
            size="sm" 
            onPress={onBack} 
            className="rounded-xl h-10 w-10 bg-card/40 border border-border/10"
          >
            <ArrowLeft size={20} color={tokens.foreground} strokeWidth={2.5} />
          </Button>
        )}
      </View>

      {/* Center Title Slot */}
      {title && (
        <View className="flex-1 items-center px-16">
          <Text 
            className="text-foreground text-[14px] font-bold tracking-[3px] uppercase" 
            style={titleStyle}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}

      {/* Right Action Slot */}
      <View className="absolute right-6 h-full justify-center z-10">
        {rightAction && (
          <View className="flex-row items-center gap-2">
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
}
