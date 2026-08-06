-- Records token usage for every AI generation across the app, so cost per
-- generation/feature can be computed after the fact. Written server-side
-- only (service role via lib/ai-usage-log.ts) — no client-side access
-- needed, so RLS is enabled with zero policies, same pattern as
-- voice_report_cache.

CREATE TABLE ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_usage_log_feature_created ON ai_usage_log(feature, created_at DESC);
CREATE INDEX idx_ai_usage_log_created ON ai_usage_log(created_at DESC);
