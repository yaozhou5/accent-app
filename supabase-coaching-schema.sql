-- Coaching sessions: persists conversation state for note development
create table coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_ids text[] not null,
  messages jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_coaching_sessions_user on coaching_sessions(user_id, updated_at desc);
create index idx_coaching_sessions_entries on coaching_sessions using gin(entry_ids);

alter table coaching_sessions enable row level security;

create policy "Users can read own sessions" on coaching_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on coaching_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on coaching_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on coaching_sessions for delete using (auth.uid() = user_id);
