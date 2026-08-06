-- Capture plumbing for voice learning: preserves the states needed to later
-- diff generated_v0 -> final_draft -> published, per draft. No analysis here —
-- `drafts.original_draft` already holds the AI-generated v0 (set once at
-- creation, never overwritten by edits) and feeds the voice_patterns pipeline
-- (lib/voice-patterns.ts, supabase/migrations/20260804000000_voice_patterns.sql).
-- This migration only adds the two missing snapshot columns; RLS already
-- covers `drafts` as a whole.

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS final_draft text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS captured_published_text text;
