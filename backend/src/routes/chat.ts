import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db.js";
import { chatMessageSchema } from "../utils/validate.js";
import { buildSystemPrompt, toChatHistory } from "../services/prompt.js";
import { generateReply } from "../services/llm.js";

const router = Router();

const MAX_HISTORY = Number(process.env.MAX_HISTORY_MESSAGES ?? 18);

// POST /chat/message
router.post("/message", async (req, res) => {
  const parsed = chatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues.map((i) => i.message).join("; ")
    });
  }

  const { message, sessionId } = parsed.data;
  const conversationId = sessionId?.length ? sessionId : randomUUID();

  try {
    await prisma.conversation.upsert({
      where: { id: conversationId },
      update: {},
      create: { id: conversationId }
    });

    // Persist user message
    await prisma.message.create({
      data: {
        id: randomUUID(),
        conversationId,
        sender: "user",
        text: message
      }
    });

    // Load FAQs + history
    const [faqs, history] = await Promise.all([
      prisma.faq.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" }
      })
    ]);

const recent = history.slice(Math.max(0, history.length - MAX_HISTORY));
const system = buildSystemPrompt(faqs);

const llm = await generateReply({
  system,
  history: toChatHistory(recent) as { role: "user" | "assistant"; content: string }[],
  userMessage: message
});

    // Persist AI reply (including friendly error replies)
    await prisma.message.create({
      data: {
        id: randomUUID(),
        conversationId,
        sender: "ai",
        text: llm.reply
      }
    });

    return res.json({ reply: llm.reply, sessionId: conversationId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
});

// GET /chat/history/:sessionId
router.get("/history/:sessionId", async (req, res) => {
  const sessionId = String(req.params.sessionId || "").trim();
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  try {
    const convo = await prisma.conversation.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });

    if (!convo) return res.json({ sessionId, messages: [] });

    return res.json({
      sessionId,
      messages: convo.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt
      }))
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
});

export default router;
