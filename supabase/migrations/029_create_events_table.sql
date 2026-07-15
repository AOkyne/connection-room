-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  time TEXT,
  location TEXT,
  format TEXT CHECK (format IN ('in-person', 'virtual', 'hybrid')),
  facilitator TEXT,
  attendee_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_interests table for user RSVPs
CREATE TABLE IF NOT EXISTS event_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  interested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events: Anyone can read public events
CREATE POLICY "Events are readable by everyone"
  ON events FOR SELECT
  USING (true);

-- RLS Policies for event_interests: Users can manage their own interests
CREATE POLICY "Users can view their own event interests"
  ON event_interests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own event interests"
  ON event_interests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own event interests"
  ON event_interests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
