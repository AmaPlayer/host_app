-- DANGER: This will delete existing chat messages to fix the schema
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participation CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- 1. Re-create Conversations
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  group_name TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Re-create Participation (Added UUID type)
CREATE TABLE conversation_participation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, 
  last_read_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 3. Re-create Messages (Added UUID type)
CREATE TABLE messages (
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

-- 4. Enable Permissions
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON conversations TO anon, authenticated, service_role;
GRANT ALL ON conversation_participation TO anon, authenticated, service_role;
GRANT ALL ON messages TO anon, authenticated, service_role;

CREATE POLICY "Public Access Convos" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Partic" ON conversation_participation FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Msgs" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Refresh Schema Cache
NOTIFY pgrst, 'reload config';
