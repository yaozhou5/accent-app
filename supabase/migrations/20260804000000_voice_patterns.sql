-- Closes the voice-learning loop: Voice Coach sessions are diffed and saved
-- here, then accumulated into a per-user learned profile that feeds back
-- into draft generation. Replaces the never-deployed voice_signals pipeline
-- (lib/supabase/drafts.ts, commit 4221b27) — that table was never created;
-- this supersedes it with a richer shape (Voice Coach's qualitative edge/
-- stretch output alongside the structural diff) and RLS from the start.

CREATE TABLE voice_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_id uuid REFERENCES drafts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  edge_cards jsonb DEFAULT '[]' NOT NULL,
  stretch_cards jsonb DEFAULT '[]' NOT NULL,
  substitutions jsonb DEFAULT '[]' NOT NULL,
  removals text[] DEFAULT '{}' NOT NULL,
  additions text[] DEFAULT '{}' NOT NULL,
  sentence_length_avg numeric,
  sentence_length_variance numeric
);

ALTER TABLE voice_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own voice patterns" ON voice_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice patterns" ON voice_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_voice_patterns_user_created ON voice_patterns(user_id, created_at DESC);

-- Accumulated, per-user profile derived from recurring patterns across
-- voice_patterns rows (anything appearing 3+ times gets promoted here).
-- One row per user, upserted after every Voice Coach session.
CREATE TABLE voice_profile_learned (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now() NOT NULL,
  preferred_words text[] DEFAULT '{}' NOT NULL,
  banned_words text[] DEFAULT '{}' NOT NULL,
  substitution_pairs jsonb DEFAULT '[]' NOT NULL,
  structural_habits jsonb DEFAULT '{}' NOT NULL,
  anti_patterns text[] DEFAULT '{}' NOT NULL,
  best_examples jsonb DEFAULT '[]' NOT NULL
);

ALTER TABLE voice_profile_learned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own learned voice profile" ON voice_profile_learned FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learned voice profile" ON voice_profile_learned FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learned voice profile" ON voice_profile_learned FOR UPDATE USING (auth.uid() = user_id);
