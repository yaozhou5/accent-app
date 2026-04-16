-- Add result tracking columns to agent_waitlist
alter table agent_waitlist
  add column if not exists result_type text,
  add column if not exists score integer;
