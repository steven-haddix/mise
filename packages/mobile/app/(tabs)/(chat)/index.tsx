import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  type TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "heroui-native";
import { Plus } from "lucide-react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { useStore } from "../../../lib/store";
import {
  sendMessage,
  getConversation,
  createConversation,
  createCook,
  patchMessage,
  listConversations,
} from "../../../lib/api";
import { ChatBubble } from "../../../components/ChatBubble";
import {
  PlanPreviewCard,
  type PlanPreviewData,
} from "../../../components/PlanPreviewCard";
import { EnableNotificationsModal } from "../../../components/EnableNotificationsModal";
import { ChatComposer } from "../../../components/ChatComposer";
import {
  getPermissionState,
  requestPermissionAndRegister,
  type PermissionState,
} from "../../../lib/push-permissions";
import { Screen, AppHeader, tokens } from "../../../components/ui";
import type { Message } from "@mise/shared";

export default function ChatScreen() {
  const {
    new: newParam,
    conversationId: conversationIdParam,
    seed: seedParam,
  } = useLocalSearchParams<{ new?: string; conversationId?: string; seed?: string }>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [showEnableNotifs, setShowEnableNotifs] = useState(false);
  const [buildErrors, setBuildErrors] = useState<Record<string, string>>({});
  const [hasPromptedNotifs, setHasPromptedNotifs] = useState(false);
  const [seedSent, setSeedSent] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const _insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === "ios" ? 88 : 64;

  const {
    activeConversationId,
    setActiveConversationId,
    isStreaming,
    setIsStreaming,
    streamingText,
    setStreamingText,
    appendStreamingText,
    mergeCook,
  } = useStore();

  useEffect(() => {
    getPermissionState().then(setPermission);
  }, []);

  useEffect(() => {
    if (conversationIdParam && conversationIdParam !== activeConversationId) {
      setActiveConversationId(conversationIdParam);
    }
  }, [conversationIdParam, activeConversationId, setActiveConversationId]);

  useEffect(() => {
    if (newParam !== "1") return;
    (async () => {
      try {
        const { conversationId, messages: initial } = await createConversation();
        setActiveConversationId(conversationId);
        setMessages(initial as Message[]);
        router.setParams({ new: undefined as never });
        setTimeout(() => inputRef.current?.focus(), 150);
      } catch (err) {
        console.error("[Chat] createConversation error:", err);
      }
    })();
  }, [newParam, setActiveConversationId]);

  useFocusEffect(
    useCallback(() => {
      if (newParam === "1") return;
      if (conversationIdParam) return;
      if (activeConversationId) return;
      (async () => {
        try {
          const convos = await listConversations();
          if (convos.length > 0) setActiveConversationId(convos[0].id);
        } catch (err) {
          console.error("[Chat] listConversations error:", err);
        }
      })();
    }, [activeConversationId, conversationIdParam, newParam, setActiveConversationId]),
  );

  useEffect(() => {
    if (!activeConversationId) return;
    getConversation(activeConversationId).then((convo) => {
      setMessages(convo.messages);
    });
  }, [activeConversationId]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text || isStreaming) return;

      let convoId = activeConversationId;
      if (!convoId) {
        const created = await createConversation();
        convoId = created.conversationId;
        setActiveConversationId(convoId);
        setMessages(created.messages as Message[]);
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        conversationId: convoId,
        role: "user",
        content: text,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setStreamingText("");

      try {
        const { stream } = await sendMessage({ message: text, conversationId: convoId });
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let _fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          _fullText += chunk;
          appendStreamingText(chunk);
        }

        const convo = await getConversation(convoId);
        setMessages(convo.messages);
      } catch (err) {
        console.error("[Chat] send error:", err);
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [
      activeConversationId,
      isStreaming,
      setStreamingText,
      setActiveConversationId,
      setIsStreaming,
      appendStreamingText,
    ],
  );

  const handleSend = useCallback(() => sendText(input.trim()), [input, sendText]);

  // Auto-send seed message when arriving from Home composer / quick-start chip.
  useEffect(() => {
    if (!seedParam || seedSent || isStreaming) return;
    if (!activeConversationId) return;
    setSeedSent(true);
    sendText(seedParam);
    router.setParams({ seed: undefined as never });
  }, [seedParam, seedSent, isStreaming, activeConversationId, sendText]);

  const handleNewChat = useCallback(async () => {
    try {
      const { conversationId, messages: initial } = await createConversation();
      setActiveConversationId(conversationId);
      setMessages(initial as Message[]);
      setTimeout(() => inputRef.current?.focus(), 150);
    } catch (err) {
      console.error("[Chat] new-chat error:", err);
    }
  }, [setActiveConversationId]);

  const handleBuild = useCallback(
    async (message: Message, plan: PlanPreviewData) => {
      try {
        const cook = await createCook(plan.proposalId, {
          conversationId: message.conversationId,
          title: plan.title,
          targetTime: plan.targetTime,
          steps: plan.steps.map(({ title, description, scheduledAt }) => ({
            title,
            description,
            scheduledAt,
          })),
        });
        mergeCook(cook);
        await patchMessage(message.conversationId, message.id, {
          proposalState: "confirmed",
          createdCookId: cook.id,
        });
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== message.id) return m;
            const tc = Array.isArray(m.toolCalls) ? (m.toolCalls as never[]) : [];
            return {
              ...m,
              toolCalls: tc.map((entry: any) =>
                entry?.toolName === "propose_plan" &&
                entry.output?.proposalId === plan.proposalId
                  ? {
                      ...entry,
                      output: {
                        ...entry.output,
                        state: "confirmed",
                        createdCookId: cook.id,
                      },
                    }
                  : entry,
              ),
            };
          }),
        );
        setBuildErrors((e) => ({ ...e, [plan.proposalId]: "" }));

        if (!hasPromptedNotifs) {
          setHasPromptedNotifs(true);
          if (permission === "undetermined") setShowEnableNotifs(true);
        }
      } catch (err: any) {
        const msg =
          err?.status === 422
            ? "This plan is out of date — ask Mise to redo it."
            : (err?.message ?? "Failed to build — try again.");
        setBuildErrors((e) => ({ ...e, [plan.proposalId]: msg }));
      }
    },
    [mergeCook, hasPromptedNotifs, permission],
  );

  const handleEnableNotifs = useCallback(async () => {
    setShowEnableNotifs(false);
    const newState = await requestPermissionAndRegister();
    setPermission(newState);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const toolCalls = Array.isArray(item.toolCalls) ? (item.toolCalls as any[]) : [];
      const planCall = toolCalls.find((t) => t?.toolName === "propose_plan");
      return (
        <View className="mb-2">
          {item.content ? <ChatBubble message={item} /> : null}
          {planCall?.output ? (
            <PlanPreviewCard
              data={planCall.output as PlanPreviewData}
              pushPermission={permission}
              onBuild={() => handleBuild(item, planCall.output as PlanPreviewData)}
              onViewCook={(cookId) => router.push(`/(tabs)/(cooks)/${cookId}` as never)}
              buildError={buildErrors[planCall.output.proposalId] || null}
            />
          ) : null}
        </View>
      );
    },
    [permission, buildErrors, handleBuild],
  );

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={tabBarHeight}
      >
        <AppHeader
          title="Mise"
          italic
          rightAction={
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={handleNewChat}
              className="rounded-full h-9 w-9 bg-transparent border border-[#E4DBC9]"
            >
              <Plus size={18} color={tokens.accent} strokeWidth={2.2} />
            </Button>
          }
        />

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 100 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
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

        <View
          className="px-5 pt-3 bg-background border-t border-[#EDE5D3]"
          style={{ paddingBottom: tabBarHeight + 20 }}
        >
          <ChatComposer
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            disabled={isStreaming}
          />
        </View>
      </KeyboardAvoidingView>

      <EnableNotificationsModal
        visible={showEnableNotifs}
        onEnable={handleEnableNotifs}
        onDismiss={() => setShowEnableNotifs(false)}
      />
    </Screen>
  );
}
