import { View, Text } from "react-native";
import type { Message } from "@mise/shared";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const alignClass = isUser ? "self-end" : "self-start";
  const bubbleClass = isUser ? "bg-primary-muted border border-primary/20" : "bg-card";
  const textClass = isUser ? "text-foreground" : "text-card-foreground";

  return (
    <View className={`${alignClass} max-w-[85%] my-1.5`}>
      <View className={`${bubbleClass} px-4 py-3 rounded-xl`}>
        <Text className={`${textClass} text-[15px] leading-[22px]`}>{message.content}</Text>
      </View>
    </View>
  );
}
