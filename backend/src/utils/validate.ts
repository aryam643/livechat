import { z } from "zod";

const MAX_CHARS = Number(process.env.MAX_MESSAGE_CHARS ?? 2000);

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(MAX_CHARS, `Message too long (max ${MAX_CHARS} chars)`),
  sessionId: z.string().trim().optional()
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
