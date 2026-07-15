-- Fix RLS on events table to ensure authenticated users can create/update events
-- First, disable RLS temporarily to clear any conflicting policies
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can insert events" ON events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Admin can delete events" ON events;

-- Create fresh, permissive policies
CREATE POLICY "allow_authenticated_insert"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_update"
  ON events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_delete"
  ON events FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "allow_all_select"
  ON events FOR SELECT
  USING (true);
