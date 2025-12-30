-- Enable Realtime for Chat Tables
-- This resolves the issue where messages only appear after refresh.

-- 1. Add tables to the publication
-- (Try/Catch wrapper not possible in standard SQL script without DO block, but ALTER PUBLICATION is idempotent-ish usually)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- 2. Verify Replica Identity (Good practice for UPDATE/DELETE events)
ALTER TABLE messages REPLICA IDENTITY FULL;
