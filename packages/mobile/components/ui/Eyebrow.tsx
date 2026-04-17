import { Text, type TextProps } from "react-native";

type EyebrowColor = "accent" | "ink-tertiary" | "ink-inverse-soft";

interface EyebrowProps extends Omit<TextProps, "children"> {
  children: string;
  color?: EyebrowColor;
  className?: string;
}

const COLOR_CLASS: Record<EyebrowColor, string> = {
  accent: "text-accent",
  "ink-tertiary": "text-[#9E9488]",
  "ink-inverse-soft": "text-[#C9C4AE]",
};

export function Eyebrow({ children, color = "accent", className, ...rest }: EyebrowProps) {
  return (
    <Text
      {...rest}
      className={`font-mono text-[11px] uppercase tracking-[1.5px] ${COLOR_CLASS[color]} ${className ?? ""}`}
      style={[{ fontFamily: "IBMPlexMono_500Medium" }, rest.style]}
    >
      {children}
    </Text>
  );
}
