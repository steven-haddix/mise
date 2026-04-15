import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[];
  className?: string;
}

export function Screen({ children, edges, className }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1 }}>
      <View className={`flex-1 bg-background ${className ?? ""}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
