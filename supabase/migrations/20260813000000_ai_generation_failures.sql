-- Records failed and empty-response AI generations, separately from
-- ai_usage_log (which only ever records successful calls and has NOT NULL
-- token columns that a failure has no values for). Lets failure rate,
-- timeout rate, and time-to-failure be queried directly instead of
-- inferred from what's missing. Written server-side only (service role via
-- lib/ai-usage-log.ts) — no client-side access needed, same RLS pattern as
-- ai_usage_log.

CREATE TABLE ai_generation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  model text NOT NULL,
  reason text NOT NULL,
  duration_ms integer NOT NULL,
  detail text
);

ALTER TABLE ai_generation_failures ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_generation_failures_feature_created ON ai_generation_failures(feature, created_at DESC);
CREATE INDEX idx_ai_generation_failures_reason ON ai_generation_failures(reason);
