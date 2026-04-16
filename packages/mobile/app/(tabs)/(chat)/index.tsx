import { useState, useRef, useCallback, useEffect } from "react";
import {
	View,
	type TextInput,
	FlatList,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Screen, AppHeader, tokens } from "../../../components/ui";
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
				const { conversationId, messages: initial } =
					await createConversation();
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
		}, [
			activeConversationId,
			conversationIdParam,
			newParam,
			setActiveConversationId,
		]),
	);

	useEffect(() => {
		if (!activeConversationId) return;
		getConversation(activeConversationId).then((convo) => {
			setMessages(convo.messages);
		});
	}, [activeConversationId]);

	const handleSend = useCallback(async () => {
		const text = input.trim();
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
				setMessages((prev) =>
					prev.map((m) => {
						if (m.id !== message.id) return m;
						const tc = Array.isArray(m.toolCalls)
							? (m.toolCalls as never[])
							: [];
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
			const toolCalls = Array.isArray(item.toolCalls)
				? (item.toolCalls as any[])
				: [];
			const planCall = toolCalls.find((t) => t?.toolName === "propose_plan");
			return (
				<View className="mb-2">
					{item.content ? <ChatBubble message={item} /> : null}
					{planCall?.output ? (
						<PlanPreviewCard
							data={planCall.output as PlanPreviewData}
							pushPermission={permission}
							onBuild={() =>
								handleBuild(item, planCall.output as PlanPreviewData)
							}
							onViewCook={(cookId) =>
								router.push(`/(tabs)/(cooks)/${cookId}` as never)
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
		<Screen edges={["top"]}>
			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={tabBarHeight}
			>
				<AppHeader
				  title="Mise"
				  rightAction={
				    <Button isIconOnly variant="ghost" size="sm" onPress={handleNewChat} className="rounded-xl h-10 w-10 bg-card/40 border border-border/10">
				      <Plus size={24} color={tokens.primary} strokeWidth={2.5} />
				    </Button>
				  }
				/>

				<FlatList
					ref={flatListRef}
					data={messages}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={{
						padding: 24,
						paddingBottom: tabBarHeight + 100,
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

				<View
					className="flex-row items-end px-5 pt-3 gap-3 bg-background border-t border-border/10"
					style={{ paddingBottom: tabBarHeight + 20 }}
				>
					<Input
						ref={inputRef}
						value={input}
						onChangeText={setInput}
						placeholder="What are you cooking?"
						multiline
						className="flex-1 max-h-40 text-[16px] leading-5 rounded-2xl px-5 py-4 bg-card border-none shadow-none"
						onSubmitEditing={handleSend}
					/>
					<Button
						isIconOnly
						variant="primary"
						size="lg"
						className="rounded-2xl h-14 w-14"
						onPress={handleSend}
						isDisabled={!input.trim() || isStreaming}
					>
						<Send color={tokens.primaryForeground} size={25} strokeWidth={2} />
					</Button>
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
