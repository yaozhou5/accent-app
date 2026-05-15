CREATE TABLE log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own log entries" ON log_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own log entries" ON log_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own log entries" ON log_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own log entries" ON log_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_log_entries_user_created ON log_entries(user_id, created_at DESC);
