-- The weekly-challenge system was replaced by standalone opt-in chips
-- (lib/clock/chips.ts) before challenge_id ever shipped to production —
-- confirmed via `git grep challenge_id origin/master` returning nothing.
-- Safe to drop it in the same migration that adds its replacement.
ALTER TABLE practice_runs ADD COLUMN selected_chip_ids text[];
ALTER TABLE practice_runs DROP COLUMN challenge_id;
