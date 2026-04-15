import { useState, useRef, useCallback, useEffect } from "react";
import {
	View,
	Text,
	type TextInput,
	FlatList,
	Pressable,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Input, Button } from "heroui-native";
import { Send, Plus } from "lucide-react-native";
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
import {
	getPermissionState,
	requestPermissionAndRegister,
	type PermissionState,
} from "../../../lib/push-permissions";
import type { Message } from "@mise/shared";

export default function ChatScreen() {
	const { new: newParam, conversationId: conversationIdParam } =
		useLocalSearchParams<{
			new?: string;
			conversationId?: string;
		}>();
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [permission, setPermission] = useState<PermissionState>("undetermined");
	const [showEnableNotifs, setShowEnableNotifs] = useState(false);
	const [buildErrors, setBuildErrors] = useState<Record<string, string>>({});
	const [hasPromptedNotifs, setHasPromptedNotifs] = useState(false);
	const flatListRef = useRef<FlatList>(null);
	const inputRef = useRef<TextInput>(null);
	const insets = useSafeAreaInsets();
	const tabBarHeight = (Platform.OS === "ios" ? 49 : 56) + insets.bottom;
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

	// Load push permission state on mount.
	useEffect(() => {
		getPermissionState().then(setPermission);
	}, []);

	// Deep link: /chat/[conversationId] → set this as the active conversation.
	useEffect(() => {
		if (conversationIdParam && conversationIdParam !== activeConversationId) {
			setActiveConversationId(conversationIdParam);
		}
	}, [conversationIdParam, activeConversationId, setActiveConversationId]);

	// Handle `?new=1` — create a fresh conversation and focus input.
	useEffect(() => {
		if (newParam !== "1") return;
		(async () => {
			try {
				const { conversationId, messages: initial } =
					await createConversation();
				setActiveConversationId(conversationId);
				setMessages(initial as Message[]);
				// Strip the `new=1` param so a re-render doesn't loop.
				router.setParams({ new: undefined as any });
				setTimeout(() => inputRef.current?.focus(), 150);
			} catch (err) {
				console.error("[Chat] createConversation error:", err);
			}
		})();
	}, [newParam, setActiveConversationId]);

	// On focus, if there's no active conversation (and no deep-link param), load the most recent.
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
		}, [
			activeConversationId,
			conversationIdParam,
			newParam,
			setActiveConversationId,
		]),
	);

	// Load messages when activeConversationId changes.
	useEffect(() => {
		if (!activeConversationId) return;
		getConversation(activeConversationId).then((convo) => {
			setMessages(convo.messages);
		});
	}, [activeConversationId]);

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || isStreaming) return;

		// Make sure we have a conversation.
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
			const { stream } = await sendMessage({
				message: text,
				conversationId: convoId,
			});
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

			// Refetch conversation to pick up the assistant message (including toolCalls) persisted server-side.
			const convo = await getConversation(convoId);
			setMessages(convo.messages);
		} catch (err) {
			console.error("[Chat] send error:", err);
		} finally {
			setIsStreaming(false);
			setStreamingText("");
		}
	}, [
		input,
		activeConversationId,
		isStreaming,
		setStreamingText,
		setActiveConversationId,
		setIsStreaming,
		appendStreamingText,
	]);

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
				// Patch the local message so the card re-renders as confirmed.
				setMessages((prev) =>
					prev.map((m) => {
						if (m.id !== message.id) return m;
						const tc = Array.isArray(m.toolCalls) ? (m.toolCalls as any[]) : [];
						return {
							...m,
							toolCalls: tc.map((entry) =>
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

				// First successful Build it → prompt for notifications if undetermined.
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

	// Render a single message (optionally accompanied by a PlanPreviewCard).
	const renderItem = useCallback(
		({ item }: { item: Message }) => {
			const toolCalls = Array.isArray(item.toolCalls)
				? (item.toolCalls as any[])
				: [];
			const planCall = toolCalls.find((t) => t?.toolName === "propose_plan");
			return (
				<View>
					{item.content ? <ChatBubble message={item} /> : null}
					{planCall?.output ? (
						<PlanPreviewCard
							data={planCall.output as PlanPreviewData}
							pushPermission={permission}
							onBuild={() =>
								handleBuild(item, planCall.output as PlanPreviewData)
							}
							onViewCook={(cookId) =>
								router.push(`/(tabs)/(cooks)/${cookId}` as any)
							}
							buildError={buildErrors[planCall.output.proposalId] || null}
						/>
					) : null}
				</View>
			);
		},
		[permission, buildErrors, handleBuild],
	);

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: "#0a0a0a" }}
			edges={["top"]}
		>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={tabBarHeight}
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
					<View style={{ width: 40 }} />
					<Text style={{ fontSize: 22, fontWeight: "700", color: "#c9a0dc" }}>
						Mise
					</Text>
					<Pressable
						onPress={handleNewChat}
						hitSlop={8}
						style={{
							width: 40,
							height: 40,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Plus size={22} color="#c9a0dc" />
					</Pressable>
				</View>

				{/* Messages */}
				<FlatList
					ref={flatListRef}
					data={messages}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={{
						padding: 16,
						paddingBottom: tabBarHeight + 80,
					}}
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

				{/* Input */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "flex-end",
						paddingHorizontal: 16,
						paddingTop: 12,
						paddingBottom: tabBarHeight + 12,
						gap: 10,
						backgroundColor: "#0a0a0a",
					}}
				>
					<Input
						ref={inputRef}
						value={input}
						onChangeText={setInput}
						placeholder="What are you cooking?"
						multiline
						className="flex-1 max-h-35 text-base leading-5 rounded-3xl px-4 py-3.5"
						onSubmitEditing={handleSend}
					/>
					<Button
						isIconOnly
						onPress={handleSend}
						isDisabled={!input.trim() || isStreaming}
					>
						<Send color="#fff" />
					</Button>
				</View>
			</KeyboardAvoidingView>

			<EnableNotificationsModal
				visible={showEnableNotifs}
				onEnable={handleEnableNotifs}
				onDismiss={() => setShowEnableNotifs(false)}
			/>
		</SafeAreaView>
	);
}
