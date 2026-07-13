-- Server-verifiable admin role. Replaces the old client-side hardcoded
-- admin secret, which anyone could read out of the JS bundle and which
-- no API route ever re-checked.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
