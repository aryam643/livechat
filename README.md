# AI Live Chat Agent (Production-ready Take-Home)

Mini web app that simulates a customer support chat widget where an AI agent answers questions using a real LLM API.

- Frontend: SvelteKit (Vite)
- Backend: Node.js + TypeScript + Express
- DB: SQLite via Prisma (easy local + deploy demo)
- LLM: OpenAI (via environment variables)

## Features
- Chat UI: scrollable, user/agent distinction, Enter-to-send, auto-scroll, typing indicator, disabled send while in-flight
- API:
  - `POST /chat/message` → `{ reply, sessionId }`
  - `GET /chat/history/:sessionId` → messages
- Persists conversations + messages (user + ai)
- Restores history on reload (sessionId stored in localStorage)
- Seeded FAQ knowledge base (shipping/returns/support hours) injected into the system prompt
- Guardrails: message length cap, history cap, max tokens, request timeout, graceful error handling

---

## 1) Run locally (Backend)

### Prereqs
- Node 18+ (or 20+)
- OpenAI API key

### Steps
```bash
cd backend
cp .env.example .env
npm i
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend runs at: `http://localhost:8080`  
Health: `GET /health`

---

## 2) Run locally (Frontend)

```bash
cd frontend
cp .env.example .env
npm i
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Environment Variables

### Backend (`backend/.env`)
- `OPENAI_API_KEY` (required; do NOT commit secrets)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `WEB_ORIGIN` (default: `http://localhost:5173`)
- `MAX_MESSAGE_CHARS` (default: `2000`)
- `MAX_HISTORY_MESSAGES` (default: `18`)
- `LLM_TIMEOUT_MS` (default: `15000`)

### Frontend (`frontend/.env`)
- `VITE_BACKEND_URL` (default: `http://localhost:8080`)

---

## API

### POST /chat/message
Request:
```json
{ "message": "Do you ship to USA?", "sessionId": "optional" }
```
Response:
```json
{ "reply": "Yes, USA delivery typically...", "sessionId": "..." }
```

### GET /chat/history/:sessionId
Response:
```json
{
  "sessionId": "...",
  "messages": [
    { "id": "...", "sender": "user", "text": "...", "createdAt": "..." },
    { "id": "...", "sender": "ai", "text": "...", "createdAt": "..." }
  ]
}
```

---

## Architecture Overview

### Backend layering
- `routes/` — HTTP endpoints (thin controllers)
- `services/llm.ts` — OpenAI call + timeout + graceful errors
- `services/prompt.ts` — system prompt + history mapping
- `utils/validate.ts` — Zod validation
- `prisma/` — schema + seed

### Prompting
- System prompt: helpful e-commerce support agent.
- FAQ knowledge base appended to system prompt.
- Recent conversation history included (capped).

### Guardrails / cost control
- Cap user message length (`MAX_MESSAGE_CHARS`)
- Cap history size (`MAX_HISTORY_MESSAGES`)
- LLM timeout (`LLM_TIMEOUT_MS`)
- `max_tokens` and low temperature for concise answers

---

## If I had more time
- Streaming responses (SSE) for “typing” realism
- Minimal FAQ retrieval (keyword match) instead of injecting full FAQ each time
- More test coverage (route + service unit tests)
- Observability (request IDs, structured logs)

---

## Security & Seeds
- Secrets: `.env` files are git‑ignored and `backend/.env.example` uses placeholders. Rotate keys if any were previously committed.
- Seed data: The 4 FAQ rows (shipping, international shipping to USA, return/refund policy, support hours) are sufficient for the assignment. Add more by editing `backend/prisma/seed.ts` if desired.

---

## Quick test (curl)
```bash
curl -X POST http://localhost:8080/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"What is your return policy?"}'
```
