"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import ConversationList from "./ConversationList";
import ChatPanel from "./ChatPanel";
import LeadTracker from "./LeadTracker";

export interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  mode: "agent" | "human";
  source?: string;
  meta_ad_id?: string;
  meta_campaign_id?: string;
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

export interface Lead {
  id: string;
  conversation_id: string;
  phone: string;
  name: string | null;
  status: string;
  source: string;
  meta_ad_id: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  referral_headline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type TabType = "chat" | "leads";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
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

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLeadsLoading(false);
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
    fetchLeads();
  }, [fetchConversations, fetchLeads]);

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

    // Listen for lead updates
    const leadsChannel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [selectedConversationId, fetchConversations, fetchLeads]);

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

  // Handle lead status update
  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status } : l))
        );
      }
    } catch (error) {
      console.error("Failed to update lead:", error);
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

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
            id="tab-chat"
          >
            💬 Chat
          </button>
          <button
            className={`tab-btn ${activeTab === "leads" ? "active" : ""}`}
            onClick={() => setActiveTab("leads")}
            id="tab-leads"
          >
            📊 Leads
            {leads.length > 0 && (
              <span className="tab-badge">{leads.length}</span>
            )}
          </button>
        </div>

        {activeTab === "chat" && (
          <>
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
          </>
        )}

        {activeTab === "leads" && (
          <div className="leads-sidebar">
            <LeadsSummary leads={leads} />
          </div>
        )}
      </div>

      <div className={`chat-panel ${!mobileShowChat ? "hidden-mobile" : ""}`}>
        {activeTab === "chat" ? (
          <ChatPanel
            conversation={selectedConversation || null}
            messages={messages}
            loading={messagesLoading}
            onModeToggle={handleModeToggle}
            onSendMessage={handleSendMessage}
            onBack={() => setMobileShowChat(false)}
          />
        ) : (
          <LeadTracker
            leads={leads}
            loading={leadsLoading}
            onUpdateStatus={handleUpdateLeadStatus}
            onRefresh={fetchLeads}
          />
        )}
      </div>
    </div>
  );
}

// Leads Summary Component for sidebar
function LeadsSummary({ leads }: { leads: Lead[] }) {
  const statusCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};

  leads.forEach((lead) => {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    sourceCounts[lead.source || "organic"] = (sourceCounts[lead.source || "organic"] || 0) + 1;
  });

  const statusLabels: Record<string, { emoji: string; label: string }> = {
    new: { emoji: "🆕", label: "Baru" },
    warm: { emoji: "🔥", label: "Warm" },
    survey: { emoji: "🏠", label: "Survey" },
    booking: { emoji: "📝", label: "Booking" },
    closed: { emoji: "✅", label: "Closed" },
    lost: { emoji: "❌", label: "Lost" },
  };

  return (
    <div className="leads-summary">
      <div className="leads-summary-header">
        <h3>📊 Ringkasan Leads</h3>
        <span className="leads-total">{leads.length} total</span>
      </div>

      <div className="leads-stats-grid">
        {Object.entries(statusLabels).map(([key, { emoji, label }]) => (
          <div key={key} className={`leads-stat-card ${key}`}>
            <div className="leads-stat-emoji">{emoji}</div>
            <div className="leads-stat-value">{statusCounts[key] || 0}</div>
            <div className="leads-stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="leads-source-section">
        <h4>Sumber Lead</h4>
        <div className="source-bars">
          {Object.entries(sourceCounts).map(([source, count]) => (
            <div key={source} className="source-bar-item">
              <div className="source-bar-label">
                <span>{source === "ctwa" ? "🎯 CTWA Ads" : "🌿 Organic"}</span>
                <span className="source-bar-count">{count}</span>
              </div>
              <div className="source-bar-bg">
                <div
                  className={`source-bar-fill ${source}`}
                  style={{
                    width: `${leads.length > 0 ? (count / leads.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
