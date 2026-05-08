"use client";

import { useState } from "react";
import type { Lead } from "./Dashboard";

interface LeadTrackerProps {
  leads: Lead[];
  loading: boolean;
  onUpdateStatus: (leadId: string, status: string) => Promise<void>;
  onRefresh: () => void;
}

const STATUSES = [
  { key: "new", emoji: "🆕", label: "Baru", color: "var(--accent-blue)" },
  { key: "warm", emoji: "🔥", label: "Warm", color: "#f59e0b" },
  { key: "survey", emoji: "🏠", label: "Survey", color: "#10b981" },
  { key: "booking", emoji: "📝", label: "Booking", color: "#06b6d4" },
  { key: "closed", emoji: "✅", label: "Closed", color: "#22c55e" },
  { key: "lost", emoji: "❌", label: "Lost", color: "#ef4444" },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LeadTracker({
  leads,
  loading,
  onUpdateStatus,
  onRefresh,
}: LeadTrackerProps) {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [updatingLead, setUpdatingLead] = useState<string | null>(null);

  const filteredLeads = leads.filter((lead) => {
    if (filterSource === "all") return true;
    return lead.source === filterSource;
  });

  const getLeadsByStatus = (status: string) =>
    filteredLeads.filter((l) => l.status === status);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingLead(leadId);
    try {
      await onUpdateStatus(leadId, newStatus);
    } finally {
      setUpdatingLead(null);
    }
  };

  if (loading) {
    return (
      <div className="lead-tracker-loading">
        <div className="spinner" />
        <p>Memuat data leads...</p>
      </div>
    );
  }

  return (
    <div className="lead-tracker">
      {/* Header */}
      <div className="lead-tracker-header">
        <div className="lead-tracker-title">
          <h2>📊 Lead Tracking</h2>
          <p>Track leads dari WhatsApp & Meta Ads</p>
        </div>
        <div className="lead-tracker-actions">
          <div className="source-filter">
            <button
              className={`filter-btn ${filterSource === "all" ? "active" : ""}`}
              onClick={() => setFilterSource("all")}
            >
              Semua ({leads.length})
            </button>
            <button
              className={`filter-btn ctwa ${filterSource === "ctwa" ? "active" : ""}`}
              onClick={() => setFilterSource("ctwa")}
            >
              🎯 CTWA ({leads.filter((l) => l.source === "ctwa").length})
            </button>
            <button
              className={`filter-btn organic ${filterSource === "organic" ? "active" : ""}`}
              onClick={() => setFilterSource("organic")}
            >
              🌿 Organic ({leads.filter((l) => l.source === "organic").length})
            </button>
          </div>
          <button className="refresh-btn" onClick={onRefresh} id="refresh-leads">
            🔄
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="lead-stats-bar">
        {STATUSES.map(({ key, emoji, label, color }) => {
          const count = getLeadsByStatus(key).length;
          return (
            <div key={key} className="lead-stat-pill" style={{ borderColor: color }}>
              <span className="stat-emoji">{emoji}</span>
              <span className="stat-count" style={{ color }}>{count}</span>
              <span className="stat-label">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      {filteredLeads.length === 0 ? (
        <div className="lead-tracker-empty">
          <div className="empty-icon">📭</div>
          <h3>Belum ada leads</h3>
          <p>Lead akan otomatis muncul saat ada pesan WhatsApp masuk</p>
        </div>
      ) : (
        <div className="kanban-board">
          {STATUSES.map(({ key, emoji, label, color }) => {
            const statusLeads = getLeadsByStatus(key);
            return (
              <div key={key} className="kanban-column">
                <div className="kanban-column-header" style={{ borderBottomColor: color }}>
                  <span>{emoji} {label}</span>
                  <span className="kanban-count" style={{ background: color }}>
                    {statusLeads.length}
                  </span>
                </div>
                <div className="kanban-cards">
                  {statusLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`kanban-card ${updatingLead === lead.id ? "updating" : ""}`}
                    >
                      <div className="kanban-card-header">
                        <span className="kanban-card-name">
                          {lead.name || lead.phone}
                        </span>
                        <span className={`source-badge ${lead.source}`}>
                          {lead.source === "ctwa" ? "🎯" : "🌿"}
                        </span>
                      </div>
                      <div className="kanban-card-phone">{lead.phone}</div>
                      {lead.meta_ad_id && (
                        <div className="kanban-card-ad">
                          📢 Ad: {lead.meta_ad_id.substring(0, 12)}...
                        </div>
                      )}
                      {lead.referral_headline && (
                        <div className="kanban-card-headline">
                          &ldquo;{lead.referral_headline}&rdquo;
                        </div>
                      )}
                      <div className="kanban-card-date">
                        {formatDate(lead.created_at)}
                      </div>

                      {/* Status actions */}
                      <div className="kanban-card-actions">
                        <select
                          className="status-select"
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          disabled={updatingLead === lead.id}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.emoji} {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
