-- Caches Voice Coach results keyed on (draft_id, hash of original_draft +
-- current_draft), so re-running "How did I do?" on unchanged text returns
-- the same analysis instead of a fresh, temperature-driven sample.
--
-- NOT the same shape as the deleted edge/gap cache (voice_report_cache,
-- dropped 2026-07-25): that was keyed on 7 rounded dimension scores, a
-- small space (~110 combinations) shared across every user, which is
-- exactly why it collided — two strangers landing on the same scores got
-- the same cached "personal" text. This key is a hash of one draft's own
-- full text, scoped to draft_id, which already belongs to exactly one
-- user. The key space here is as large as the space of possible draft
-- text — there's no cross-user collision surface.

CREATE TABLE voice_coach_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_id uuid REFERENCES drafts(id) ON DELETE CASCADE NOT NULL,
  text_key text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (draft_id, text_key)
);

ALTER TABLE voice_coach_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own voice coach cache" ON voice_coach_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice coach cache" ON voice_coach_cache FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_voice_coach_cache_draft_key ON voice_coach_cache(draft_id, text_key);
