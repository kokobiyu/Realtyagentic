"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation, Message } from "./Dashboard";

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  onModeToggle: (mode: "agent" | "human") => void;
  onSendMessage: (text: string) => void;
  onBack: () => void;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari Ini";
  if (diffDays === 1) return "Kemarin";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shouldShowDateSeparator(
  messages: Message[],
  index: number
): boolean {
  if (index === 0) return true;
  const current = new Date(messages[index].created_at).toDateString();
  const previous = new Date(messages[index - 1].created_at).toDateString();
  return current !== previous;
}

export default function ChatPanel({
  conversation,
  messages,
  loading,
  onModeToggle,
  onSendMessage,
  onBack,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  // Handle send
  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    const text = inputText.trim();
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    try {
      await onSendMessage(text);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      alert(error.message || "Gagal mengirim pesan. Silakan coba lagi.");
      // Put text back if it failed
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💬</div>
        <h2>Realty Agentic Dashboard</h2>
        <p>
          Pilih percakapan dari sidebar untuk melihat chat dan mengelola AI
          agent Anda.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "9999px",
              fontSize: "0.813rem",
              background: "var(--accent-green-glow)",
              color: "var(--accent-green)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            🤖 Mode Agent — AI Auto Reply
          </div>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "9999px",
              fontSize: "0.813rem",
              background: "var(--accent-amber-glow)",
              color: "var(--accent-amber)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
            }}
          >
            👤 Mode Human — Manual Reply
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <button
            className="mobile-back-btn"
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "4px",
            }}
            id="back-button"
          >
            ←
          </button>
          <div
            className="conversation-avatar"
            style={{
              width: "40px",
              height: "40px",
              minWidth: "40px",
              fontSize: "0.9rem",
            }}
          >
            {conversation.name && conversation.name !== "Unknown"
              ? conversation.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : conversation.phone.slice(-2)}
          </div>
          <div>
            <div className="chat-header-name">
              {conversation.name && conversation.name !== "Unknown"
                ? conversation.name
                : conversation.phone}
            </div>
            <div className="chat-header-phone">
              {conversation.phone}
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${conversation.mode === "agent" ? "active-agent" : ""}`}
            onClick={() => onModeToggle("agent")}
            id="mode-agent-btn"
          >
            🤖 Agent
          </button>
          <button
            className={`mode-toggle-btn ${conversation.mode === "human" ? "active-human" : ""}`}
            onClick={() => onModeToggle("human")}
            id="mode-human-btn"
          >
            👤 Human
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flex: 1,
            }}
          >
            <div className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              color: "var(--text-muted)",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🗨️</span>
            <p style={{ fontSize: "0.875rem" }}>Belum ada pesan dalam percakapan ini.</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={msg.id}>
                {/* Date Separator */}
                {shouldShowDateSeparator(messages, index) && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      margin: "16px 0",
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 14px",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`message-bubble ${msg.role}`}>
                  <div className="message-role">
                    {msg.role === "user" ? "Customer" : "AI Agent"}
                  </div>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">
                    {formatMessageTime(msg.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="message-input-area">
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder={
            conversation.mode === "human"
              ? "Ketik balasan manual..."
              : "Ketik pesan override..."
          }
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          id="message-input"
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
          id="send-button"
        >
          {sending ? (
            <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }} />
          ) : (
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
