import { create } from "zustand";
import type { Cook, CookWithSteps, Conversation } from "@mise/shared";

interface MiseStore {
  // Conversations
  conversations: Conversation[];
  setConversations: (convos: Conversation[]) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Cooks
  activeCooks: CookWithSteps[];
  completedCooks: CookWithSteps[];
  setCooks: (active: CookWithSteps[], completed: CookWithSteps[]) => void;

  // Chat streaming state
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingText: string;
  setStreamingText: (text: string) => void;
  appendStreamingText: (chunk: string) => void;
}

export const useStore = create<MiseStore>((set) => ({
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  activeConversationId: null,
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),

  activeCooks: [],
  completedCooks: [],
  setCooks: (activeCooks, completedCooks) => set({ activeCooks, completedCooks }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  streamingText: "",
  setStreamingText: (streamingText) => set({ streamingText }),
  appendStreamingText: (chunk) =>
    set((state) => ({ streamingText: state.streamingText + chunk })),
}));
