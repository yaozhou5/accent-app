-- Let Accent's server (service role) use the early-access tables.
-- Some Supabase projects no longer grant new tables to API roles automatically.
-- anon and authenticated (the public key) still get nothing.
GRANT SELECT, INSERT, UPDATE ON public.newsletter_early_access TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.newsletter_early_access_answers TO service_role;
GRANT SELECT ON public.newsletter_early_access_overview TO service_role;
