-- Add tracking columns to conversations
alter table conversations 
add column if not exists status text default 'new' check (status in ('new', 'survei', 'booking', 'closed', 'lost')),
add column if not exists ad_id text,
add column if not exists adset_id text,
add column if not exists campaign_id text,
add column if not exists fbclid text,
add column if not exists metadata jsonb default '{}'::jsonb;

-- Update index for status
create index if not exists idx_conversations_status on conversations(status);
