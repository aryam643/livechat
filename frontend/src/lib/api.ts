import type { ChatMessage } from "./types";

const BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";

export async function fetchHistory(sessionId: string): Promise<ChatMessage[]> {
  const r = await fetch(`${BASE}/chat/history/${encodeURIComponent(sessionId)}`);
  if (!r.ok) return [];
  const data = await r.json().catch(() => ({}));
  return (data.messages ?? []) as ChatMessage[];
}

export async function sendMessage(payload: { message: string; sessionId?: string | null }) {
  const r = await fetch(`${BASE}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: payload.message,
      sessionId: payload.sessionId ?? undefined
    })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false as const, error: data.error ?? "Request failed" };
  }
  return { ok: true as const, reply: data.reply as string, sessionId: data.sessionId as string };
}
