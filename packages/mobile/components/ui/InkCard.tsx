import type React from "react";
import { View, type ViewProps } from "react-native";

interface InkCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function InkCard({ children, className, ...rest }: InkCardProps) {
  return (
    <View {...rest} className={`bg-primary rounded-2xl p-5 ${className ?? ""}`}>
      {children}
    </View>
  );
}
