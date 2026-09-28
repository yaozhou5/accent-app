-- Drops four tables from an earlier product iteration, all superseded
-- and unreferenced anywhere in current app code (checked via grep before
-- this was written):
--   voice_signals    -> superseded by voice_patterns
--   shelf_entries    -> superseded by log_entries
--   logs             -> superseded by log_entries
--   coaching_sessions -> superseded by voice_coach_cache
--
-- Row counts and most recent created_at at the time this was written
-- (queried directly via the service-role API, not assumed):
--   voice_signals: 2266 rows, most recent 2026-08-06
--   shelf_entries: 169 rows, most recent 2026-05-15
--   logs: 3 rows, most recent 2026-05-11
--   coaching_sessions: 105 rows, most recent 2026-07-10
--
-- None of these were empty, so "test data vs. real data" couldn't be
-- determined from row count or age alone — dropping all four was an
-- explicit decision by the project owner after seeing those counts,
-- not an inference made here.
--
-- No CASCADE: if anything unexpected still references one of these
-- tables, this should fail loudly rather than silently dropping further.
DROP TABLE IF EXISTS voice_signals;
DROP TABLE IF EXISTS shelf_entries;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS coaching_sessions;
