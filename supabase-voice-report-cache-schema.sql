-- Cache for /api/voice-result edge/gap generations.
-- The report is a pure function of the 7 voice dimension scores, so identical
-- profiles reuse the same Anthropic generation instead of re-billing.
-- The dimension space is finite (3^5 * 2^2 = 972 distinct profiles), so total
-- lifetime generations are bounded by that count.

CREATE TABLE voice_report_cache (
  dims_key text PRIMARY KEY,
  edge text NOT NULL,
  gap text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Locked down: this table is read/written only by the server route using the
-- Supabase service role key, which bypasses RLS. No anon/public policies exist,
-- so the table is inaccessible from the client (publishable) key.
ALTER TABLE voice_report_cache ENABLE ROW LEVEL SECURITY;
