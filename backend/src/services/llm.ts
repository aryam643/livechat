import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 15000);

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Keep server booting so evaluator can run without a key; runtime will return a friendly message.
    console.warn("[WARN] OPENAI_API_KEY not set. LLM replies will fail gracefully.");
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function generateReply(params: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}) {
  const { system, history, userMessage } = params;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = getClient();
    if (!client) {
      return {
        ok: false as const,
        reply: "LLM is not configured (missing API key). Please set OPENAI_API_KEY on the server."
      };
    }

    const resp = await client.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 300
      },
      { signal: controller.signal }
    );

    const reply = resp.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false as const, reply: "I couldn’t generate a reply. Please try again." };

    return { ok: true as const, reply };
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "The AI took too long to respond. Please try again."
        : "The AI service is temporarily unavailable. Please try again in a moment.";
    return { ok: false as const, reply: msg };
  } finally {
    clearTimeout(t);
  }
}
