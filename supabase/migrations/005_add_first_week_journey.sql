-- First Week Journey Progress tracking table

CREATE TABLE IF NOT EXISTS first_week_journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_door INT NOT NULL DEFAULT 1,
  completed_doors INT[] DEFAULT '{}',
  private_reflections JSONB DEFAULT '{}',
  selected_intention TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE first_week_journey_progress ENABLE ROW LEVEL SECURITY;

-- Users can only read and update their own journey progress
CREATE POLICY "Users can read own journey progress"
  ON first_week_journey_progress FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own journey progress"
  ON first_week_journey_progress FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own journey progress"
  ON first_week_journey_progress FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create index for faster queries
CREATE INDEX idx_first_week_journey_user_id ON first_week_journey_progress(user_id);
