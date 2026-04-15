import { View, Text } from "react-native";
import type { Message } from "@mise/shared";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const alignClass = isUser ? "self-end" : "self-start";
  const bubbleClass = isUser ? "bg-primary" : "bg-card";
  const textClass = isUser ? "text-primary-foreground" : "text-card-foreground";
  const tailClass = isUser ? "rounded-br-sm" : "rounded-bl-sm";

  return (
    <View className={`${alignClass} max-w-[82%] my-1`}>
      <View className={`${bubbleClass} px-3.5 py-2.5 rounded-2xl ${tailClass}`}>
        <Text className={`${textClass} text-base leading-6`}>{message.content}</Text>
      </View>
    </View>
  );
}
