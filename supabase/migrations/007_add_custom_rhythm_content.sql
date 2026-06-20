-- Custom rhythm content storage (admin edits)

CREATE TABLE IF NOT EXISTS custom_rhythm_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE custom_rhythm_content ENABLE ROW LEVEL SECURITY;

-- Only admin users can read/write (in practice, check via application logic)
CREATE POLICY "Users can read own custom content"
  ON custom_rhythm_content FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own custom content"
  ON custom_rhythm_content FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own custom content"
  ON custom_rhythm_content FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create index for faster queries
CREATE INDEX idx_custom_rhythm_content_user_id ON custom_rhythm_content(user_id);
