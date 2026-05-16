-- Add new columns to log_entries for entry types and bookmarking
ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS type text DEFAULT 'note';
ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS bookmarked boolean DEFAULT false;

-- Drafts table for focused write mode
CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES content_plans(id) ON DELETE CASCADE,
  post_index integer,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts" ON drafts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id, updated_at DESC);
