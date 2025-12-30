<script lang="ts">
  import { onMount, tick } from "svelte";
  import { fade } from "svelte/transition";
  import type { ChatMessage } from "$lib/types";
  import { fetchHistory, sendMessage } from "$lib/api";
  import { getSessionId, setSessionId, clearSessionId } from "$lib/session";

  let messages: ChatMessage[] = [];
  let input = "";
  let sending = false;
  let typing = false;
  let errorMsg: string | null = null;
  let chatContainer: HTMLDivElement | null = null;

  const MAX_CHARS = 2000;

  const suggestions = [
    "What is your return policy?",
    "Do you ship internationally?",
    "What are your support hours?"
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function formatTime(ts?: string) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function loadHistory() {
    const sid = getSessionId();
    if (!sid) return;
    const history = await fetchHistory(sid);
    messages = history.map((m) => ({ 
      sender: m.sender, 
      text: m.text, 
      createdAt: m.createdAt 
    }));
    await scrollToBottom();
  }

  onMount(() => {
    loadHistory();
  });

  async function handleSend() {
    errorMsg = null;
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_CHARS) {
      errorMsg = `Message is too long (max ${MAX_CHARS} characters)`;
      return;
    }

    const sid = getSessionId();

    messages = [
      ...messages,
      { sender: "user", text: trimmed, createdAt: nowIso() }
    ];
    input = "";
    sending = true;
    typing = true;
    await scrollToBottom();

    const resp = await sendMessage({ message: trimmed, sessionId: sid });
    sending = false;

    if (!resp.ok) {
      typing = false;
      errorMsg = resp.error;
      messages = [
        ...messages,
        { sender: "ai", text: `Error: ${resp.error}`, createdAt: nowIso() }
      ];
      await scrollToBottom();
      return;
    }

    setSessionId(resp.sessionId);
    typing = false;
    messages = [
      ...messages,
      { sender: "ai", text: resp.reply, createdAt: nowIso() }
    ];
    await scrollToBottom();
  }

  async function sendSuggestion(text: string) {
    input = text;
    await handleSend();
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && input.trim()) {
        handleSend();
      }
    }
  }

  function clearChat() {
    clearSessionId();
    messages = [];
    errorMsg = null;
    input = "";
  }
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <h1>Support Chat</h1>
      <button class="btn-clear" on:click={clearChat}>New Chat</button>
    </div>
  </header>

  <main class="main">
    <div class="chat-container" bind:this={chatContainer}>
      {#if messages.length === 0}
        <div class="welcome">
          <h2>How can we help?</h2>
          <div class="suggestions">
            {#each suggestions as suggestion}
              <button class="suggestion-chip" on:click={() => sendSuggestion(suggestion)}>
                {suggestion}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="messages">
        {#each messages as message, idx (idx)}
          <div class="message-wrapper {message.sender}" in:fade={{ duration: 200 }}>
            <div class="message-content">
              <div class="message-bubble {message.sender}">
                <p class="message-text">{message.text}</p>
              </div>
              <span class="message-time">{formatTime(message.createdAt)}</span>
            </div>
          </div>
        {/each}

        {#if typing}
          <div class="message-wrapper ai">
            <div class="message-content">
              <div class="message-bubble ai typing-bubble">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if errorMsg}
      <div class="error-banner">{errorMsg}</div>
    {/if}

    <div class="input-area">
      <div class="input-container">
        <textarea
          bind:value={input}
          on:keydown={handleKeyPress}
          placeholder="Type your message..."
          disabled={sending}
          maxlength={MAX_CHARS}
          rows="1"
        ></textarea>
        <div class="input-actions">
          <span class="char-count">{input.length}/{MAX_CHARS}</span>
          <button 
            class="btn-send" 
            on:click={handleSend}
            disabled={sending || !input.trim()}
          >
            {#if sending}
              <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                </path>
              </svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
    background: #f5f5f5;
    min-height: 100vh;
  }

  .app {
    max-width: 1100px;
    margin: 0 auto;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: white;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.1);
  }

  .header {
    background: #000;
    color: white;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-content h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .btn-clear {
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #fff;
    border-radius: 6px;
    color: #000;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-clear:hover {
    background: #f5f5f5;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fafafa;
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    scroll-behavior: smooth;
  }

  .welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .welcome h2 {
    margin: 0 0 24px;
    font-size: 24px;
    font-weight: 600;
    color: #000;
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    max-width: 600px;
  }

  .suggestion-chip {
    padding: 10px 18px;
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 20px;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .suggestion-chip:hover {
    border-color: #000;
    color: #000;
    transform: translateY(-2px);
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .message-wrapper {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  .message-wrapper.user {
    flex-direction: row-reverse;
  }

  .message-content {
    display: flex;
    flex-direction: column;
    max-width: 65%;
    gap: 4px;
  }

  .message-wrapper.user .message-content {
    align-items: flex-end;
  }

  .message-bubble {
    padding: 12px 16px;
    border-radius: 18px;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .message-bubble.ai {
    background: white;
    border: 2px solid #e5e5e5;
    border-bottom-left-radius: 4px;
  }

  .message-bubble.user {
    background: #000;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message-text {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .message-time {
    font-size: 12px;
    color: #999;
    padding: 0 4px;
  }

  .typing-bubble {
    padding: 16px 20px;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #ccc;
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }

  .error-banner {
    padding: 12px 24px;
    background: #ffebee;
    color: #c62828;
    font-size: 14px;
    border-top: 2px solid #ef5350;
  }

  .input-area {
    padding: 16px 24px;
    background: white;
    border-top: 2px solid #e5e5e5;
  }

  .input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fafafa;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    padding: 12px;
    transition: border-color 0.2s;
  }

  .input-container:focus-within {
    border-color: #000;
  }

  textarea {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 15px;
    font-family: inherit;
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 120px;
    line-height: 1.5;
    color: #000;
  }

  textarea::placeholder {
    color: #999;
  }

  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .char-count {
    font-size: 12px;
    color: #999;
  }

  .btn-send {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: none;
    background: #000;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-send:hover:not(:disabled) {
    background: #333;
    transform: scale(1.05);
  }

  .btn-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .message-content {
      max-width: 80%;
    }
  }
</style>