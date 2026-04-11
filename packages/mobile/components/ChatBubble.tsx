import { View, Text } from "react-native";
import type { Message } from "@mise/shared";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "82%",
        marginVertical: 4,
      }}
    >
      <View
        style={{
          backgroundColor: isUser ? "#2d5a3d" : "#2a2a4a",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
        }}
      >
        <Text style={{ color: "#e0e0e0", fontSize: 15, lineHeight: 22 }}>{message.content}</Text>
      </View>
    </View>
  );
}
