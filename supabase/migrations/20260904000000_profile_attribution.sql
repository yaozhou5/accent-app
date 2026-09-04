-- Signup attribution: referrer and UTM params captured at signup time.
-- Nullable — existing users won't have these.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_referrer text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_utm_source text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_utm_medium text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_utm_campaign text;
