-- Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  group_name TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Conversation Participation Table (Juction)
CREATE TABLE IF NOT EXISTS conversation_participation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  text TEXT,
  media_url TEXT,
  media_type TEXT,
  is_system_message BOOLEAN DEFAULT false,
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow public access for now (since we use Firebase Auth with Anon key)
-- Ideally we would verify the 'uid' in the custom claims, but for now open it up to unblock
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (DEV MODE)
CREATE POLICY "Allow Public Access Conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public Access Participation" ON conversation_participation FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public Access Messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Ensure Groups has RLS that allows public (if not already)
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow Public Access Groups" ON groups FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow Public Access Group Members" ON group_members FOR ALL USING (true) WITH CHECK (true);
