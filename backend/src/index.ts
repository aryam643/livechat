import "dotenv/config";
import express from "express";
import cors from "cors";
import pino from "pino";
import chatRoutes from "./routes/chat.js";

const logger = pino({
  transport: { target: "pino-pretty" }
});

const app = express();

app.use(express.json({ limit: "1mb" }));

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: false
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/chat", chatRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

const PORT = Number(process.env.PORT ?? 8080);
app.listen(PORT, () => logger.info(`Backend running on http://localhost:${PORT}`));
