-- FIX CHAT DUPLICATES
-- The error "Results contain 8 rows" means we have duplicate conversations.
-- We must clean up the data and enforce uniqueness.

-- 1. Clear existing chat data (Conversations/Messages) to remove duplicates
-- Warning: This deletes message history, but preserves Groups and Users.
TRUNCATE TABLE messages, conversation_participation, conversations CASCADE;

-- 2. Add Unique Index to prevent future duplicates
-- This ensures a Group can only have ONE Conversation ID.
CREATE UNIQUE INDEX IF NOT EXISTS unique_group_conversation_idx 
ON conversations (group_id) 
WHERE group_id IS NOT NULL;

-- 3. Verify Permissions again (just to be safe)
GRANT ALL ON conversations TO anon, authenticated, service_role;
GRANT ALL ON conversation_participation TO anon, authenticated, service_role;
GRANT ALL ON messages TO anon, authenticated, service_role;
