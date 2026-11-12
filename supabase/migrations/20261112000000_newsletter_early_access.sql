-- Early-access list for the company-newsletter concept.
-- Deliberately separate from accounts (auth.users / profiles) and from email_captures.
-- Written only by the server routes in app/api/newsletter-early-access/ using the
-- service-role key. Row level security is ON with NO policies, and anon/authenticated
-- have no grants, so the public (publishable) key can neither read nor write these tables.

CREATE TABLE public.newsletter_early_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL CHECK (email = lower(email) AND char_length(email) <= 254),
  environment text NOT NULL CHECK (environment IN ('preview', 'production')),
  is_test boolean NOT NULL DEFAULT false,
  last_submitted_at timestamptz NOT NULL DEFAULT now(),
  submit_count integer NOT NULL DEFAULT 1,
  CONSTRAINT newsletter_early_access_email_env_key UNIQUE (email, environment)
);

-- One row per "join" submission, holding a one-time token so the optional answer
-- can be attached to that signup without the browser ever learning the signup id.
CREATE TABLE public.newsletter_early_access_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  signup_id uuid NOT NULL REFERENCES public.newsletter_early_access(id) ON DELETE CASCADE,
  answer_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  answer text CHECK (answer IS NULL OR char_length(answer) <= 2000),
  answered_at timestamptz
);

CREATE INDEX idx_nea_created ON public.newsletter_early_access (created_at DESC);
CREATE INDEX idx_nea_answers_signup ON public.newsletter_early_access_answers (signup_id);

ALTER TABLE public.newsletter_early_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_early_access_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_early_access FROM anon, authenticated;
REVOKE ALL ON public.newsletter_early_access_answers FROM anon, authenticated;

-- Read-only overview for the dashboard: one line per signup, plus any answers given.
CREATE VIEW public.newsletter_early_access_overview
WITH (security_invoker = true) AS
SELECT s.created_at, s.email, s.environment, s.is_test, s.submit_count,
       a.answer, a.answered_at
FROM public.newsletter_early_access s
LEFT JOIN public.newsletter_early_access_answers a
  ON a.signup_id = s.id AND a.answer IS NOT NULL
ORDER BY s.created_at DESC;

REVOKE ALL ON public.newsletter_early_access_overview FROM anon, authenticated;
