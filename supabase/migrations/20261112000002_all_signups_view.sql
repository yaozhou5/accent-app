-- One read-only list of everyone: Accent account signups (auth.users) and the
-- newsletter early-access waitlist (production rows only), matched by email.
-- Nothing is merged or changed; it only reads both lists.
-- Lives in a private "admin" schema that the public API does not expose, so it's
-- visible in the Supabase dashboard only (Table Editor → schema "admin").

CREATE SCHEMA IF NOT EXISTS admin;
REVOKE ALL ON SCHEMA admin FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW admin.all_signups AS
WITH accounts AS (
  SELECT lower(email) AS email, created_at AS account_created_at, last_sign_in_at
  FROM auth.users
  WHERE email IS NOT NULL
),
waitlist AS (
  SELECT s.email,
         s.created_at AS joined_waitlist_at,
         s.is_test,
         string_agg(a.answer, ' | ' ORDER BY a.answered_at) AS waitlist_answers
  FROM public.newsletter_early_access s
  LEFT JOIN public.newsletter_early_access_answers a
    ON a.signup_id = s.id AND a.answer IS NOT NULL
  WHERE s.environment = 'production'
  GROUP BY s.id
)
SELECT coalesce(acc.email, wl.email) AS email,
       acc.email IS NOT NULL AS has_account,
       acc.account_created_at,
       acc.last_sign_in_at,
       wl.email IS NOT NULL AS on_newsletter_waitlist,
       wl.joined_waitlist_at,
       wl.waitlist_answers,
       coalesce(wl.is_test, false) AS is_test
FROM accounts acc
FULL OUTER JOIN waitlist wl ON wl.email = acc.email
ORDER BY greatest(acc.account_created_at, wl.joined_waitlist_at) DESC NULLS LAST;

REVOKE ALL ON admin.all_signups FROM PUBLIC, anon, authenticated;
