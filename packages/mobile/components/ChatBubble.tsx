import { View, Text } from "react-native";
import type { Message } from "@mise/shared";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const alignClass = isUser ? "self-end" : "self-start";
  const bubbleClass = isUser
    ? "bg-[#F3DDCC]"
    : "bg-card border border-[#EDE5D3]";

  return (
    <View className={`${alignClass} max-w-[85%] my-1.5`}>
      <View className={`${bubbleClass} px-4 py-3 rounded-2xl`}>
        <Text
          className="text-foreground text-[15px] leading-[22px]"
          style={{ fontFamily: "Geist_400Regular" }}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
