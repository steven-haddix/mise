export type CookStatus = "planning" | "active" | "completed" | "cancelled";

export type StepStatus = "pending" | "notified" | "completed" | "skipped";

export type MessageRole = "user" | "assistant";

export interface Cook {
  id: string;
  userId: string;
  conversationId: string;
  title: string;
  targetTime: string;
  status: CookStatus;
  notes: string | null;
  proposalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CookStep {
  id: string;
  cookId: string;
  stepNumber: number;
  title: string;
  description: string;
  scheduledAt: string;
  status: StepStatus;
  notifiedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  cookId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls: unknown | null;
  createdAt: string;
}

export interface CookWithSteps extends Cook {
  steps: CookStep[];
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
