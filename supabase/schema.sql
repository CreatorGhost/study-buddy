-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

create table if not exists conversations (
  id text primary key,
  title text not null default 'New Chat',
  subject text not null default 'Physics',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast listing sorted by recent
create index if not exists idx_conversations_updated on conversations (updated_at desc);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

-- Enable Row Level Security (open for now — no auth)
alter table conversations enable row level security;

create policy "Allow all access" on conversations
  for all using (true) with check (true);
