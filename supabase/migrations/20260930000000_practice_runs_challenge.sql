-- Weekly speaking challenges (lib/clock/challenges.ts). Only the challenge
-- id and which criteria were met leave the device — no transcript, no
-- audio, nothing about what was actually said.
ALTER TABLE practice_runs ADD COLUMN challenge_id text;
ALTER TABLE practice_runs ADD COLUMN criteria_met text[];
