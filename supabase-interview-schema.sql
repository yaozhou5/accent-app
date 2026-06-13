-- New profile columns for scripted interview onboarding
alter table profiles add column if not exists interview_q1 text;
alter table profiles add column if not exists interview_q2 text;
alter table profiles add column if not exists interview_q3 text;
alter table profiles add column if not exists interview_q4 text;
alter table profiles add column if not exists account_type text;
alter table profiles add column if not exists inferred_goal text;
alter table profiles add column if not exists account_type_confidence text;
