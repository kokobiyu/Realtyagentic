-- =============================================
-- Lead Tracking & CTWA Attribution
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add source tracking columns to conversations (if not exist)
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'organic',
  ADD COLUMN IF NOT EXISTS meta_ad_id text,
  ADD COLUMN IF NOT EXISTS meta_campaign_id text,
  ADD COLUMN IF NOT EXISTS meta_adset_id text;

-- 2. Create leads table for funnel tracking
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'warm', 'survey', 'booking', 'closed', 'lost')),
  source text DEFAULT 'organic',
  meta_ad_id text,
  meta_campaign_id text,
  meta_adset_id text,
  referral_headline text,
  referral_body text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_conversation ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);

-- 4. Enable Realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- 5. Auto-update leads.updated_at on update
CREATE OR REPLACE FUNCTION update_lead_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_update
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_timestamp();
