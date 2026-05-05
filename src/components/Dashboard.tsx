"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import ConversationList from "./ConversationList";
import ChatPanel from "./ChatPanel";

export interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  mode: "agent" | "human";
  updated_at: string;
  created_at: string;
  lastMessage: {
    content: string;
    role: string;
    created_at: string;
  } | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  whatsapp_msg_id: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId, fetchMessages]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // Listen for new messages
    const messagesChannel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new as Message;

          // If it's for the selected conversation, add to messages
          if (newMessage.conversation_id === selectedConversationId) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }

          // Refresh conversation list to update last message & order
          fetchConversations();
        }
      )
      .subscribe();

    // Listen for conversation updates (mode changes)
    const conversationsChannel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [selectedConversationId, fetchConversations]);

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileShowChat(true);
  };

  // Handle mode toggle
  const handleModeToggle = async (mode: "agent" | "human") => {
    if (!selectedConversationId) return;
    try {
      await fetch(`/api/conversations/${selectedConversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      // Update local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId ? { ...c, mode } : c
        )
      );
    } catch (error) {
      console.error("Failed to toggle mode:", error);
    }
  };

  // Handle send message from dashboard
  const handleSendMessage = async (text: string) => {
    if (!selectedConversationId || !text.trim()) return;
    const res = await fetch(
      `/api/conversations/${selectedConversationId}/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      }
    );
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || "Gagal mengirim pesan");
    }
    
    if (data.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard">
      <div className={`sidebar ${mobileShowChat ? "hidden-mobile" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🏠</div>
          <div>
            <h1>Realty Agentic</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              WhatsApp AI Sales
            </p>
          </div>
        </div>

        <div className="search-box">
          <input
            className="search-input"
            type="text"
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-conversations"
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div className="spinner" />
          </div>
        ) : (
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      <div className={`chat-panel ${!mobileShowChat ? "hidden-mobile" : ""}`}>
        <ChatPanel
          conversation={selectedConversation || null}
          messages={messages}
          loading={messagesLoading}
          onModeToggle={handleModeToggle}
          onSendMessage={handleSendMessage}
          onBack={() => setMobileShowChat(false)}
        />
      </div>
    </div>
  );
}
