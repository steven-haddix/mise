import type React from "react";
import { Text, type TextProps } from "react-native";

type DisplaySize = "xs" | "sm" | "md" | "lg" | "xl";

interface DisplayProps extends Omit<TextProps, "children"> {
  children: React.ReactNode;
  size?: DisplaySize;
  italic?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<DisplaySize, string> = {
  xs: "text-[20px] leading-[26px]",
  sm: "text-[24px] leading-[30px]",
  md: "text-[32px] leading-[38px]",
  lg: "text-[40px] leading-[46px]",
  xl: "text-[48px] leading-[54px]",
};

export function Display({ children, size = "md", italic, className, ...rest }: DisplayProps) {
  const fontFamily = italic ? "Newsreader_600SemiBold_Italic" : "Newsreader_500Medium";
  return (
    <Text
      {...rest}
      className={`text-foreground ${SIZE_CLASS[size]} ${className ?? ""}`}
      style={[{ fontFamily }, rest.style]}
    >
      {children}
    </Text>
  );
}
