-- Adds a place to store the Zoom meeting's host "start URL", separate
-- from the existing events.online_url (the attendee "join URL").
--
-- lib/zoom.ts's createZoomMeeting() already receives both from Zoom's API
-- (join_url and start_url are two different links -- start_url signs the
-- opener in as the meeting's host, which is what actually lets the
-- account holder start/host the meeting; join_url is the plain attendee
-- link), but only join_url was ever persisted (as online_url) -- start_url
-- was fetched and immediately discarded. That's the reason there was no
-- reliable way to start hosting a meeting created by this app: only the
-- attendee link ever existed anywhere.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS zoom_start_url TEXT;

-- =====================================================================
-- ROLLBACK NOTES
--
-- ALTER TABLE events DROP COLUMN IF EXISTS zoom_start_url;
--
-- Nullable, additive column -- no data loss on rollback, existing rows
-- unaffected.
-- =====================================================================
