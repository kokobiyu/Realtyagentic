-- =============================================
-- WhatsApp AI Agent - Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  name text,
  mode text not null default 'agent' check (mode in ('agent', 'human')),
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  whatsapp_msg_id text unique,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_conversations_updated on conversations(updated_at desc);

-- Enable Realtime for both tables
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;

-- Function to auto-update updated_at on conversations when a new message is inserted
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations 
  set updated_at = now() 
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to call the function on message insert
create trigger on_message_insert
  after insert on messages
  for each row
  execute function update_conversation_timestamp();
