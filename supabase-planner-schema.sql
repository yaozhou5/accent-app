-- Update profiles table for content planner onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS party_pitch text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goals text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posting_frequency text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posting_challenges text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Weekly dumps
CREATE TABLE weekly_dumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE weekly_dumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dumps" ON weekly_dumps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dumps" ON weekly_dumps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own dumps" ON weekly_dumps FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_dumps_user_week ON weekly_dumps(user_id, week_start DESC);

-- Content plans
CREATE TABLE content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dump_id uuid REFERENCES weekly_dumps(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  plan jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plans" ON content_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON content_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON content_plans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_content_plans_user_week ON content_plans(user_id, week_start DESC);
