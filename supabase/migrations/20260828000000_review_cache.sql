-- Caches Review mode results keyed on (user_id, hash of input text), so
-- pasting the same article twice returns the same analysis. No draft_id
-- here — Review mode deliberately creates no draft record.

CREATE TABLE review_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text_key text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, text_key)
);

ALTER TABLE review_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own review cache" ON review_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own review cache" ON review_cache FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_review_cache_user_key ON review_cache(user_id, text_key);
