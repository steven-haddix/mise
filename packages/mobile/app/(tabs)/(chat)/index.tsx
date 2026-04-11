import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Plus } from "lucide-react-native";
import { useStore } from "../../../lib/store";
import { sendMessage, getConversation, listConversations } from "../../../lib/api";
import { ChatBubble } from "../../../components/ChatBubble";
import { NewCookSheet } from "../../../components/NewCookSheet";
import type { Message } from "@mise/shared";

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewCook, setShowNewCook] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const {
    activeConversationId,
    setActiveConversationId,
    isStreaming,
    setIsStreaming,
    streamingText,
    setStreamingText,
    appendStreamingText,
  } = useStore();

  // Load conversation messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    getConversation(activeConversationId).then((convo) => {
      setMessages(convo.messages);
    });
  }, [activeConversationId]);

  const handleSend = useCallback(
    async (text?: string, targetTime?: string) => {
      const messageText = text || input.trim();
      if (!messageText || isStreaming) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        conversationId: activeConversationId || "",
        role: "user",
        content: messageText,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setStreamingText("");

      try {
        const { conversationId, stream } = await sendMessage({
          message: messageText,
          conversationId: activeConversationId || undefined,
          targetTime,
        });

        if (!activeConversationId) {
          setActiveConversationId(conversationId);
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          appendStreamingText(chunk);
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          conversationId,
          role: "assistant",
          content: fullText,
          toolCalls: null,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("[Chat] send error:", error);
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [input, activeConversationId, isStreaming],
  );

  const handleNewCook = (description: string, targetTime: string) => {
    setShowNewCook(false);
    setActiveConversationId(null);
    setMessages([]);
    handleSend(description, targetTime);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#c9a0dc" }}>Mise</Text>
          <Pressable
            onPress={() => setShowNewCook(true)}
            style={{
              backgroundColor: "#2a1a3a",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} color="#c9a0dc" />
            <Text style={{ color: "#c9a0dc", fontWeight: "600" }}>New Cook</Text>
          </Pressable>
        </View>

        {/* Messages */}
        {messages.length === 0 && !isStreaming ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🧪</Text>
            <Text
              style={{
                fontSize: 18,
                color: "#c9a0dc",
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Chef Catalyst at your service!
            </Text>
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 }}>
              Tell me what you want to cook and when you want to eat it, or tap "New Cook" to get
              started with the date picker.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isStreaming && streamingText ? (
                <ChatBubble
                  message={{
                    id: "streaming",
                    conversationId: "",
                    role: "assistant",
                    content: streamingText,
                    toolCalls: null,
                    createdAt: new Date().toISOString(),
                  }}
                />
              ) : null
            }
          />
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            padding: 12,
            paddingBottom: Platform.OS === "ios" ? 28 : 12,
            gap: 8,
            backgroundColor: "#0a0a0a",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message your kitchen chemist..."
            placeholderTextColor="#555"
            multiline
            style={{
              flex: 1,
              backgroundColor: "#1a1a2a",
              borderWidth: 1,
              borderColor: "#333",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: "#fff",
              fontSize: 15,
              maxHeight: 100,
            }}
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: input.trim() && !isStreaming ? "#6b3fa0" : "#333",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <NewCookSheet visible={showNewCook} onDismiss={() => setShowNewCook(false)} onSubmit={handleNewCook} />
    </SafeAreaView>
  );
}
