interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotifications(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return [];

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error("[Push] Failed to send:", await response.text());
    return [];
  }

  const result = await response.json();
  return result.data ?? [];
}
