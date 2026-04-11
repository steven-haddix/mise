import type { Cook, CookStep, CookWithSteps, Conversation, Message } from "./cook.js";

// Chat
export interface ChatRequest {
  message: string;
  conversationId?: string;
  targetTime?: string;
}

// Cooks
export interface CookListResponse {
  active: Cook[];
  completed: Cook[];
}

export interface UpdateCookRequest {
  status?: Cook["status"];
  notes?: string;
}

export interface UpdateStepRequest {
  status: CookStep["status"];
}

// Push Tokens
export interface RegisterPushTokenRequest {
  token: string;
  deviceId: string;
}

// Health
export interface HealthResponse {
  ok: boolean;
  service: string;
}

// Re-export domain types for convenience
export type {
  Cook,
  CookStep,
  CookWithSteps,
  Conversation,
  Message,
};
