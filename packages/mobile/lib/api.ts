import { fetch as expoFetch } from "expo/fetch";
import { API_BASE_URL } from "./config";
import { authClient } from "./auth";
import type { Cook, CookWithSteps, Conversation, ConversationWithMessages } from "@mise/shared";

function authHeaders(): Record<string, string> {
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}

async function handleUnauthorized() {
  await authClient.signOut().catch(() => {});
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options?.headers,
    },
    credentials: "include",
  });

  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Chat
export async function sendMessage(body: {
  message: string;
  conversationId?: string;
  targetTime?: string;
}): Promise<{ conversationId: string; stream: ReadableStream<Uint8Array> }> {
  // Use expo/fetch — RN's built-in fetch buffers the response and doesn't
  // expose `body` as a ReadableStream, so `.getReader()` crashes.
  const res = await expoFetch(`${API_BASE_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

  const conversationId = res.headers.get("X-Conversation-Id") || "";
  if (!res.body) throw new Error("Chat response has no body");
  return { conversationId, stream: res.body };
}

export function listConversations() {
  return fetchApi<Conversation[]>("/api/v1/conversations");
}

export function getConversation(id: string) {
  return fetchApi<ConversationWithMessages>(`/api/v1/conversations/${id}`);
}

// Cooks
export function listCooks() {
  return fetchApi<{ active: CookWithSteps[]; completed: CookWithSteps[] }>("/api/v1/cooks");
}

export function getCook(id: string) {
  return fetchApi<CookWithSteps>(`/api/v1/cooks/${id}`);
}

export function updateCook(id: string, body: { status?: string; notes?: string }) {
  return fetchApi<Cook>(`/api/v1/cooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateStep(cookId: string, stepId: string, body: { status: string }) {
  return fetchApi(`/api/v1/cooks/${cookId}/steps/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Push tokens
export function registerPushToken(token: string, deviceId: string) {
  return fetchApi("/api/v1/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token, deviceId }),
  });
}

// Conversations (new)
export function createConversation() {
  return fetchApi<{ conversationId: string; messages: import("@mise/shared").Message[] }>(
    "/api/v1/conversations",
    { method: "POST" },
  );
}

export function patchMessage(
  conversationId: string,
  messageId: string,
  body: { proposalState: "confirmed" | "superseded"; createdCookId?: string },
) {
  return fetchApi<{ ok: true }>(`/api/v1/conversations/${conversationId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Cook creation from a confirmed plan
export async function createCook(
  proposalId: string,
  body: {
    conversationId: string;
    title: string;
    targetTime: string;
    steps: Array<{ title: string; description: string; scheduledAt: string }>;
  },
): Promise<import("@mise/shared").CookWithSteps> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cooks`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Proposal-Id": proposalId,
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), {
      status: res.status,
      notes: err.notes,
    });
  }
  return res.json();
}
