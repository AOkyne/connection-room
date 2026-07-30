-- 085: CRITICAL FIX -- infinite recursion in connection_participants' own
-- RLS policy, breaking essentially every client-side read across the
-- entire async guided-connections feature since migration 078.
--
-- "Participants can view connection participants" (migration 078) reads:
--
--   USING (EXISTS (SELECT 1 FROM connection_participants me
--                   WHERE me.connection_id = connection_participants.connection_id
--                     AND me.user_id = auth.uid()))
--
-- This is a policy ON connection_participants whose own USING clause
-- queries connection_participants. That inner SELECT is itself subject to
-- every RLS policy on the table, including this same one -- evaluating it
-- re-triggers itself, forever. Postgres detects this and errors instead
-- of hanging: 42P17 "infinite recursion detected in policy for relation
-- connection_participants". This exact anti-pattern already broke
-- `profiles` once before in this repo (migration 039, fixed by 041) --
-- same root cause, same fix shape, different table.
--
-- Blast radius: every other new table's RLS policy from migration 078
-- (connection_rounds, connection_responses, connection_acknowledgments,
-- connection_availability, connection_live_sessions,
-- connection_live_session_participants) checks participation by
-- subquerying connection_participants -- so this one broken policy
-- silently poisoned every one of them too. SECURITY DEFINER RPCs
-- (accept_connection_invitation, submit_round_response, etc.) kept
-- working throughout, because they bypass RLS on their own internal
-- queries -- which is exactly why creating/accepting/submitting all
-- appeared to work while the dashboard list never actually showed
-- anything: getMyAsyncConnections()'s direct client-side SELECT (embedding
-- connection_participants) has been silently erroring and falling back to
-- an empty array this entire time, indistinguishable in the UI from
-- "you truly have no connections."
--
-- Fix: same shape as migration 041's is_admin() fix -- move the
-- membership check into a SECURITY DEFINER function, which runs with
-- elevated privilege and so does not re-trigger connection_participants'
-- own RLS when it queries the table internally, breaking the recursion.

CREATE OR REPLACE FUNCTION is_connection_participant(p_connection_id UUID, p_user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM connection_participants
    WHERE connection_id = p_connection_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Participants can view connection participants" ON connection_participants;
CREATE POLICY "Participants can view connection participants"
  ON connection_participants FOR SELECT
  USING (is_connection_participant(connection_id, auth.uid()));

-- =====================================================================
-- ROLLBACK NOTES
--
-- Reverting this policy to the migration 078 self-referencing form
-- restores the infinite-recursion bug -- do not do this. The new
-- function is additive; dropping it would break the policy above.
-- =====================================================================
