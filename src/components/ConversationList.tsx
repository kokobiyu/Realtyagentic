"use client";

import type { Conversation } from "./Dashboard";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffHours < 48) {
    return "Kemarin";
  }
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

function getInitials(name: string | null, phone: string): string {
  if (name && name !== "Unknown") {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return phone.slice(-2);
}

function getAvatarColor(id: string): string {
  const colors = [
    "linear-gradient(135deg, #1e3a5f, #2563eb)",
    "linear-gradient(135deg, #5b21b6, #8b5cf6)",
    "linear-gradient(135deg, #9f1239, #e11d48)",
    "linear-gradient(135deg, #065f46, #10b981)",
    "linear-gradient(135deg, #92400e, #f59e0b)",
    "linear-gradient(135deg, #1e40af, #3b82f6)",
  ];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>💬</div>
        <p style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
          Belum ada percakapan.
          <br />
          Kirim pesan WhatsApp untuk memulai.
        </p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map((conv, index) => (
        <div
          key={conv.id}
          className={`conversation-item ${conv.id === selectedId ? "active" : ""}`}
          onClick={() => onSelect(conv.id)}
          style={{ animationDelay: `${index * 30}ms`, animation: "slideIn 0.3s ease forwards" }}
          id={`conversation-${conv.id}`}
        >
          <div
            className="conversation-avatar"
            style={{ background: getAvatarColor(conv.id) }}
          >
            {getInitials(conv.name, conv.phone)}
          </div>

          <div className="conversation-info">
            <div className="conversation-name">
              {conv.name && conv.name !== "Unknown" ? conv.name : conv.phone}
              <span className={`mode-badge ${conv.mode}`}>
                {conv.mode === "agent" ? "🤖 AI" : "👤 Human"}
              </span>
            </div>
            <div className="conversation-preview">
              {conv.lastMessage ? (
                <>
                  {conv.lastMessage.role === "assistant" && (
                    <span style={{ color: "var(--accent-green)" }}>✓ </span>
                  )}
                  {conv.lastMessage.content}
                </>
              ) : (
                <span style={{ fontStyle: "italic" }}>Belum ada pesan</span>
              )}
            </div>
          </div>

          <div className="conversation-meta">
            {conv.lastMessage && (
              <span className="conversation-time">
                {formatTime(conv.lastMessage.created_at)}
              </span>
            )}
            {conv.unreadCount > 0 && (
              <span className="unread-badge">{conv.unreadCount}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
