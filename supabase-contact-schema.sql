-- Contact requests table for privacy/contact form submissions
create table contact_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  email text not null,
  request_type text not null check (
    request_type in ('access', 'deletion', 'correction', 'other')
  ),
  message text not null
);

alter table contact_requests enable row level security;

-- Anyone can submit a contact request
create policy "Anyone can submit contact requests"
  on contact_requests for insert
  with check (true);
