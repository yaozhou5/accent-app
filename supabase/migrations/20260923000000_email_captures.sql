-- Generic email-capture table, discriminated by `source` so different
-- features (starting with the /practice listener-request block) can write
-- to one table instead of each growing its own single-purpose one.
-- Write-only from the client via app/api/practice-email/route.ts — nobody
-- needs to read these back through the app.

CREATE TABLE email_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  email text NOT NULL,
  source text NOT NULL,
  run_index integer
);

ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an email capture" ON email_captures FOR INSERT WITH CHECK (true);

CREATE INDEX idx_email_captures_created ON email_captures(created_at DESC);
CREATE INDEX idx_email_captures_source ON email_captures(source);
