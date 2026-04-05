-- Shelf entries table
create table shelf_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  original text not null,
  improved text not null,
  lessons jsonb default '[]'::jsonb not null,
  mode text check (mode in ('quick', 'teach')) not null
);

-- Index for fast user lookups
create index shelf_entries_user_id_idx on shelf_entries(user_id);

-- Row Level Security
alter table shelf_entries enable row level security;

-- Users can only read their own entries
create policy "Users can read own entries"
  on shelf_entries for select
  using (auth.uid() = user_id);

-- Users can only insert their own entries
create policy "Users can insert own entries"
  on shelf_entries for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own entries
create policy "Users can delete own entries"
  on shelf_entries for delete
  using (auth.uid() = user_id);
