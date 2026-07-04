-- Connection features: Messages, Requests, and Connection records for Phase 2

-- Connection Requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_name TEXT NOT NULL,
  from_user_photo TEXT,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  shared_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Partial unique index for pending requests
CREATE UNIQUE INDEX idx_unique_pending_request ON connection_requests(from_user_id, to_user_id) WHERE status = 'pending';

-- Connections table (confirmed/active connections)
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_first_name TEXT,
  partner_last_name TEXT,
  partner_pronouns TEXT,
  partner_photo TEXT,
  partner_interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  partner_contact_mode TEXT CHECK (partner_contact_mode IN ('text', 'voice-video', 'local')),
  status TEXT NOT NULL DEFAULT 'pending_their_acceptance' CHECK (
    status IN ('pending_their_acceptance', 'confirmed', 'active', 'completed', 'declined')
  ),
  shared_prompt TEXT,
  mutual_contact_opt_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (user_id != partner_id)
);

-- Connection Messages table
CREATE TABLE IF NOT EXISTS connection_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection Preferences table
CREATE TABLE IF NOT EXISTS connection_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly', 'pause')),
  contact_mode TEXT DEFAULT 'text' CHECK (contact_mode IN ('text', 'voice-video', 'local')),
  opt_in_to_exchange_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security

-- Enable RLS on all tables
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_preferences ENABLE ROW LEVEL SECURITY;

-- Connection Requests Policies
-- Users can view their own incoming and sent requests
CREATE POLICY "Users can view their connection requests"
  ON connection_requests
  FOR SELECT
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id
  );

-- Users can create requests to others
CREATE POLICY "Users can send connection requests"
  ON connection_requests
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Users can only update their own requests (to accept/decline)
CREATE POLICY "Users can respond to connection requests"
  ON connection_requests
  FOR UPDATE
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- Connections Policies
-- Users can view their own connections
CREATE POLICY "Users can view their connections"
  ON connections
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = partner_id
  );

-- Users can create connections (system-managed)
CREATE POLICY "System can create connections"
  ON connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own connections
CREATE POLICY "Users can update their connections"
  ON connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Connection Messages Policies
-- Both participants can read messages in a connection
CREATE POLICY "Connection participants can read messages"
  ON connection_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_messages.connection_id
      AND (
        connections.user_id = auth.uid() OR
        connections.partner_id = auth.uid()
      )
    )
  );

-- Participants can send messages in their connections
CREATE POLICY "Connection participants can send messages"
  ON connection_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_messages.connection_id
      AND (
        connections.user_id = auth.uid() OR
        connections.partner_id = auth.uid()
      )
    )
  );

-- Connection Preferences Policies
-- Users can view their own preferences
CREATE POLICY "Users can view their connection preferences"
  ON connection_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create/update their own preferences
CREATE POLICY "Users can manage their connection preferences"
  ON connection_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their connection preferences"
  ON connection_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for Performance
CREATE INDEX idx_connection_requests_from_user_id ON connection_requests(from_user_id);
CREATE INDEX idx_connection_requests_to_user_id ON connection_requests(to_user_id);
CREATE INDEX idx_connection_requests_status ON connection_requests(status);
CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_partner_id ON connections(partner_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connection_messages_connection_id ON connection_messages(connection_id);
CREATE INDEX idx_connection_messages_from_user_id ON connection_messages(from_user_id);
CREATE INDEX idx_connection_messages_created_at ON connection_messages(created_at);
CREATE INDEX idx_connection_preferences_user_id ON connection_preferences(user_id);
