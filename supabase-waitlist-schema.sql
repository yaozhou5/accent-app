-- Voice waitlist table
create table voice_waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamptz default now() not null,
  session_count integer not null
);

-- Allow anyone (anon) to insert but not read
alter table voice_waitlist enable row level security;

create policy "Anyone can join waitlist"
  on voice_waitlist for insert
  with check (true);
