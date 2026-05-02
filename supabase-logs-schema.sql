create table logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  content text not null
);

alter table logs enable row level security;

create policy "Users can read own logs"
  on logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on logs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own logs"
  on logs for delete
  using (auth.uid() = user_id);

create index logs_user_id_created_at_idx on logs (user_id, created_at desc);
