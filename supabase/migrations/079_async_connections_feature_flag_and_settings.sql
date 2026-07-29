-- 079: Feature flag + configurable timing settings for async guided
-- connections, following the exact platform_settings pattern from
-- migration 026 (same table, same is_feature_enabled('async_connections')
-- helper, same public-read/admin-write policies -- nothing new added here).
--
-- Rollout plan for admins (documented in docs/ASYNC_CONNECTIONS.md too):
--   1. Leave `feature_async_connections_enabled` = false while this ships.
--   2. Flip to true for a small beta cohort via `connection_async_beta_user_ids`
--      (a JSON array of user_ids) -- when that array is non-empty, only
--      those users see the async flow; everyone else keeps the legacy
--      live-only experience. Application code (lib/featureFlags.ts) is
--      responsible for checking membership in this list.
--   3. Once satisfied, set `feature_async_connections_enabled` = true and
--      clear the beta list (or leave it -- an empty/absent list means "on
--      for everyone" once the top-level flag is true).
--   4. Flipping the top-level flag back to false disables the feature for
--      everyone without deleting any data.

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'feature_async_connections_enabled',
  'false'::jsonb,
  'Enable/disable the asynchronous Guided Connection Exchange. When false, Connections falls back to the legacy live-only 20-minute flow for everyone regardless of the beta list below.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'connection_async_beta_user_ids',
  '[]'::jsonb,
  'Optional allowlist of user_ids (JSON array) who see async Guided Connections while the top-level flag is being rolled out gradually. Ignored once feature_async_connections_enabled is true for everyone.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'connection_invitation_expiry_hours',
  '72'::jsonb,
  'Hours before an unanswered connection invitation expires.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'connection_round_response_hours',
  '48'::jsonb,
  'Default response window, in hours, for each guided-exchange round.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description, is_secret)
VALUES (
  'connection_extension_hours',
  '48'::jsonb,
  'Hours added to the current deadline when a member uses their one-time "I need more time" extension.',
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================================
-- ROLLBACK NOTES
--
-- DELETE FROM platform_settings WHERE setting_key IN (
--   'feature_async_connections_enabled', 'connection_async_beta_user_ids',
--   'connection_invitation_expiry_hours', 'connection_round_response_hours',
--   'connection_extension_hours'
-- );
--
-- get_connection_setting_hours() (migration 078) falls back to hardcoded
-- defaults if these rows are missing, so reverting this migration does not
-- break 078's RPCs -- it only removes admin configurability.
-- =====================================================================
