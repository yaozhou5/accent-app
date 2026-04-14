create table agent_waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamptz default now() not null,
  source text default 'agent_waitlist'
);

alter table agent_waitlist enable row level security;

create policy "Anyone can join agent waitlist"
  on agent_waitlist for insert
  with check (true);
