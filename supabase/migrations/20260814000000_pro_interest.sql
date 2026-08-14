-- Captures interest in the not-yet-built Pro tier, shown as a non-gating
-- upgrade card below a generated draft in StandaloneWriteMode. Nothing
-- about the app changes based on rows here — this is a demand signal,
-- not a feature flag or entitlement table.

CREATE TABLE pro_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  wants_call boolean DEFAULT false NOT NULL,
  had_voice_profile boolean NOT NULL,
  draft_count integer NOT NULL
);

ALTER TABLE pro_interest ENABLE ROW LEVEL SECURITY;

-- Write-only from the client: someone submitting interest doesn't need to
-- read it back, same as log_entries/drafts insert policies elsewhere.
CREATE POLICY "Users can insert own pro interest" ON pro_interest FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pro_interest_created ON pro_interest(created_at DESC);
