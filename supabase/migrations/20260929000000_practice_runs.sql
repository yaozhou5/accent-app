-- Stats-only sync for the practice page's optional accounts. Audio,
-- transcript and script stay in IndexedDB forever — this table only ever
-- holds the numbers (lib/supabase/practice-runs.ts is the only writer).
--
-- local_run_id is the IndexedDB run's own id (crypto.randomUUID(), stable
-- for the run's lifetime — see components/clock/ClockApp.tsx). The unique
-- constraint on (user_id, local_run_id) is the whole de-dup mechanism:
-- syncing is always an upsert on that key, so re-marking a run's point
-- updates the existing row, and backfilling on sign-in is naturally safe
-- to repeat.
CREATE TABLE practice_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  local_run_id text NOT NULL,
  created_at timestamptz NOT NULL,
  duration_ms integer NOT NULL,
  point_ms integer,
  point_status text NOT NULL,
  target_ms integer,
  synced_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, local_run_id)
);

ALTER TABLE practice_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own practice runs" ON practice_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own practice runs" ON practice_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice runs" ON practice_runs FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_practice_runs_user_created ON practice_runs(user_id, created_at DESC);
