import type { ReactNode } from "react";
import { View } from "react-native";
import { Button } from "heroui-native";
import { ArrowLeft } from "lucide-react-native";
import { Display } from "./Display";
import { Eyebrow } from "./Eyebrow";
import { tokens } from "./tokens";

interface AppHeaderProps {
  title?: string;
  eyebrow?: string;
  italic?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function AppHeader({ title, eyebrow, italic, onBack, rightAction }: AppHeaderProps) {
  return (
    <View className="px-6 pt-4 pb-4 border-b border-[#EDE5D3]">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {onBack && (
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onBack}
              className="rounded-full h-9 w-9 bg-transparent border border-[#E4DBC9] mb-3"
            >
              <ArrowLeft size={18} color={tokens.foreground} strokeWidth={2.2} />
            </Button>
          )}
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {title && (
            <Display size="sm" italic={italic} className={eyebrow ? "mt-1" : ""}>
              {title}
            </Display>
          )}
        </View>
        {rightAction && (
          <View className="flex-row items-center gap-2 pt-1">{rightAction}</View>
        )}
      </View>
    </View>
  );
}
