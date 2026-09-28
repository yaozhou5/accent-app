-- Retention for ai_usage_log and ai_generation_failures: neither table had
-- anything deleting old rows, which would make the "kept 90 days" line on
-- /privacy false. A single daily pg_cron job deletes rows older than 90
-- days from both, keyed on created_at.
--
-- pg_cron itself can't be enabled by a plain CREATE EXTENSION here — on
-- Supabase it requires shared_preload_libraries, which is instance-level
-- config only exposed through the dashboard toggle: Database > Extensions
-- > search "pg_cron" > Enable. That toggle runs the CREATE EXTENSION for
-- you. Do that first, or this migration fails with something like
-- "pg_cron must be loaded via shared_preload_libraries". Once enabled,
-- the IF NOT EXISTS below is just a no-op safety net.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- cron.schedule() upserts by job name — reapplying this migration (or a
-- future one with the same name) reschedules rather than duplicating.
-- Runs as the role that owns the job (postgres by default here), which
-- isn't subject to these tables' RLS policies.
SELECT cron.schedule(
  'delete-old-ai-logs',
  '0 3 * * *', -- daily at 03:00 UTC
  $$
    DELETE FROM public.ai_usage_log WHERE created_at < now() - interval '90 days';
    DELETE FROM public.ai_generation_failures WHERE created_at < now() - interval '90 days';
  $$
);
