-- Weekly retention cohorts for signed-in /practice users.
--
-- READ-ONLY. SELECT only, nothing here writes anything. Not yet run
-- against production — review before running.
--
-- Definition (as given): a user is "retained" if they have a run on a
-- calendar day AFTER their first run's calendar day, within the stated
-- window from that first run.
--
-- Timestamp used: created_at — the run's actual recorded time (client-side
-- Date.now() at record time, see components/clock/ClockApp.tsx's
-- handleFinished / lib/supabase/practice-runs.ts's toRow). NOT synced_at:
-- that column only reflects when the row was first written to Supabase
-- (defaults to now() at insert, and upsert-on-conflict doesn't touch it
-- afterward since it's never included in the upserted payload) — it can
-- lag well behind created_at for a run synced later via the sign-in
-- backfill, and says nothing about when the run actually happened.
-- Confirm this is the timestamp you want before running.
--
-- Scope: practice_runs only contains runs where the user reached a point
-- decision — pointStatus != 'unmarked' (see syncPracticeRuns's filter in
-- lib/supabase/practice-runs.ts). A recording abandoned before that point
-- is never synced and never appears here. "A run" below means "a run that
-- reached a point decision," not every recording attempt.
--
-- Calendar day: computed in UTC (AT TIME ZONE 'UTC'), since per-user
-- timezone isn't stored anywhere. This is an approximation — a run at
-- 11pm and one at 1am local time, on what the user experienced as the
-- same evening, can land on different UTC calendar days. The client-side
-- computation in part 2 of this plan (PostHog event properties) uses the
-- browser's actual local calendar day and won't have this skew; the two
-- won't always agree exactly for users near a UTC day boundary.
--
-- Cohort week: date_trunc('week', ...) on the first run, in UTC — ISO
-- week, starts Monday.
--
-- Week windows are CUMULATIVE from first run (W1 = returned within 7
-- days, W2 = within 14, W4 = within 28), not disjoint 7-day buckets —
-- the standard meaning for "week 1/2/4 retention" in product analytics.
-- If you want disjoint buckets instead (e.g. "returned specifically in
-- days 8-14, not before"), say so and this needs a different shape.
--
-- Cohort maturity: a cohort's week-N percentage only counts users whose
-- cohort week is already at least N weeks in the past — otherwise a
-- cohort from last week would show a misleadingly low week-4 number
-- simply because no one in it has had 4 weeks yet. Those cells are NULL,
-- not 0%, for immature cohorts.

WITH first_run AS (
  SELECT
    user_id,
    MIN(created_at) AS first_run_at
  FROM practice_runs
  GROUP BY user_id
),
cohorts AS (
  SELECT
    user_id,
    first_run_at,
    (first_run_at AT TIME ZONE 'UTC')::date AS first_run_day,
    date_trunc('week', first_run_at AT TIME ZONE 'UTC')::date AS cohort_week
  FROM first_run
),
retention_flags AS (
  SELECT
    c.user_id,
    c.cohort_week,
    EXISTS (
      SELECT 1 FROM practice_runs pr
      WHERE pr.user_id = c.user_id
        AND (pr.created_at AT TIME ZONE 'UTC')::date > c.first_run_day
        AND pr.created_at <= c.first_run_at + INTERVAL '7 days'
    ) AS retained_week1,
    EXISTS (
      SELECT 1 FROM practice_runs pr
      WHERE pr.user_id = c.user_id
        AND (pr.created_at AT TIME ZONE 'UTC')::date > c.first_run_day
        AND pr.created_at <= c.first_run_at + INTERVAL '14 days'
    ) AS retained_week2,
    EXISTS (
      SELECT 1 FROM practice_runs pr
      WHERE pr.user_id = c.user_id
        AND (pr.created_at AT TIME ZONE 'UTC')::date > c.first_run_day
        AND pr.created_at <= c.first_run_at + INTERVAL '28 days'
    ) AS retained_week4
  FROM cohorts c
)
SELECT
  cohort_week,
  COUNT(*) AS cohort_size,
  ROUND(
    100.0 * SUM(CASE WHEN now() >= cohort_week + INTERVAL '7 days' THEN retained_week1::int END)
      / NULLIF(SUM(CASE WHEN now() >= cohort_week + INTERVAL '7 days' THEN 1 END), 0),
    1
  ) AS pct_retained_week1,
  ROUND(
    100.0 * SUM(CASE WHEN now() >= cohort_week + INTERVAL '14 days' THEN retained_week2::int END)
      / NULLIF(SUM(CASE WHEN now() >= cohort_week + INTERVAL '14 days' THEN 1 END), 0),
    1
  ) AS pct_retained_week2,
  ROUND(
    100.0 * SUM(CASE WHEN now() >= cohort_week + INTERVAL '28 days' THEN retained_week4::int END)
      / NULLIF(SUM(CASE WHEN now() >= cohort_week + INTERVAL '28 days' THEN 1 END), 0),
    1
  ) AS pct_retained_week4
FROM retention_flags
GROUP BY cohort_week
ORDER BY cohort_week;
