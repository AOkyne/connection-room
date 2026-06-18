-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  pronouns TEXT,
  location TEXT,
  age_range TEXT,
  relationship_status TEXT,
  orientation TEXT,
  profile_photo TEXT,
  member_type TEXT NOT NULL,
  what_brought_you_here TEXT,
  connection_hoping TEXT,
  interests TEXT[] DEFAULT '{}',
  pairing_comfort_level TEXT,
  pairing_boundaries TEXT,
  quiz_result TEXT,
  first_prompt_response TEXT,
  first_prompt_is_public BOOLEAN DEFAULT FALSE,
  completed_onboarding BOOLEAN DEFAULT FALSE,
  spaces_joined TEXT[] DEFAULT '{}',
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  member_count INTEGER DEFAULT 0,
  featured_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Space members (join table)
CREATE TABLE IF NOT EXISTS space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, space_id)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_pronouns TEXT,
  content TEXT NOT NULL,
  is_prompt_response BOOLEAN DEFAULT FALSE,
  reactions JSONB DEFAULT '{}',
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_pronouns TEXT,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pairings table
CREATE TABLE IF NOT EXISTS pairings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  partner_pronouns TEXT,
  partner_photo TEXT,
  partner_interests TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  shared_prompt TEXT,
  mutual_contact_opt_in BOOLEAN DEFAULT FALSE
);

-- Pairing preferences table
CREATE TABLE IF NOT EXISTS pairing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  frequency TEXT DEFAULT 'weekly',
  contact_mode TEXT DEFAULT 'text',
  opt_in_to_exchange_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pairing reports table
CREATE TABLE IF NOT EXISTS pairing_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pairing_id TEXT NOT NULL,
  concern TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  time TEXT,
  location TEXT,
  format TEXT,
  facilitator TEXT,
  attendee_count INTEGER DEFAULT 0
);

-- User event interests table
CREATE TABLE IF NOT EXISTS event_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id),
  interested_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for spaces
CREATE POLICY "Anyone can view spaces"
  ON spaces FOR SELECT
  USING (true);

-- Insert demo badges
INSERT INTO badges (id, name, description, icon, color) VALUES
  ('first-step', 'First Step', 'Completed onboarding', '👣', 'text-amber-600'),
  ('first-share', 'First Share', 'Made first post or prompt response', '💬', 'text-rose-600'),
  ('consent-champion', 'Consent Champion', 'Acknowledged community agreements', '🤝', 'text-green-600'),
  ('explorer', 'Explorer', 'Joined 3 or more spaces', '🗺️', 'text-blue-600'),
  ('connection-seeker', 'Connection Seeker', 'Participated in a pairing', '🔗', 'text-pink-600'),
  ('embodied', 'Embodied', 'Active in Embodiment Practice space', '🧘', 'text-emerald-600'),
  ('truth-teller', 'Truth Teller', 'Shared authentically in 5+ posts', '✨', 'text-purple-600'),
  ('self-aware', 'Self-Aware', 'Completed the Connection Assessment', '🧭', 'text-indigo-600'),
  ('vulnerability-warrior', 'Vulnerability Warrior', 'Responded to 10+ prompts', '💪', 'text-red-600'),
  ('bridge-builder', 'Bridge Builder', 'Engaged with couples and single spaces', '🌉', 'text-orange-600')
ON CONFLICT DO NOTHING;

-- Insert demo spaces
INSERT INTO spaces (id, name, description, icon, color) VALUES
  ('commons', 'The Commons', 'A welcoming space for introductions, questions, and general connection', 'commons', 'bg-amber-50'),
  ('start-here', 'Start Here', 'Orientation and first reflections for new members', 'start-here', 'bg-rose-50'),
  ('intimacy-patterns', 'Intimacy Patterns', 'Exploring attachment, desire, vulnerability, and relational patterns', 'intimacy-patterns', 'bg-blue-50'),
  ('touch-affection', 'Touch & Affection', 'Non-sexual touch, physical presence, and receiving affection', 'touch-affection', 'bg-orange-50'),
  ('spirituality-sexuality', 'Spirituality, Sexuality & Integration', 'Integrating spirit, sexuality, body, and emotion without shame', 'spirituality-sexuality', 'bg-purple-50'),
  ('dating-desire', 'Dating, Desire & Vulnerability', 'Single and exploring desire, dating, vulnerability, and authentic connection', 'dating-desire', 'bg-pink-50'),
  ('couples', 'Couples, Closeness & Repair', 'For partnered people: intimacy, communication, repair, and reigniting desire', 'couples', 'bg-teal-50'),
  ('embodiment', 'Embodiment Practice', 'Coming back to your body: breath, sensation, presence, aliveness', 'embodiment', 'bg-green-50'),
  ('workshops', 'Workshops & Retreats', 'Upcoming events, workshops, and retreat opportunities', 'workshops', 'bg-yellow-50')
ON CONFLICT DO NOTHING;

-- Insert demo events
INSERT INTO events (id, title, description, date, time, format, facilitator) VALUES
  ('event-001', 'Monthly Connection Circle', 'A gentle guided circle for authentic sharing and connection', NOW() + INTERVAL '7 days', '7:00 PM PT', 'virtual', 'Trevor James'),
  ('event-002', 'Embodiment Practice Lab', 'Breath work, body awareness, and coming home to presence', NOW() + INTERVAL '14 days', '6:00 PM PT', 'virtual', 'Dr. Somatic'),
  ('event-003', 'Touch, Affection & Receiving Workshop', 'Exploring non-sexual touch, giving, and receiving in safe ways', NOW() + INTERVAL '28 days', '2:00 PM PT', 'in-person', 'Trevor James')
ON CONFLICT DO NOTHING;
