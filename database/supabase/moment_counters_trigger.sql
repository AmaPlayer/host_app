-- Moment Comment Counter Trigger
-- Auto-increments/decrements comments_count when comments are added/removed
-- Matches the same pattern as post_counters_trigger.sql
-- Execute this in Supabase SQL Editor

-- Function to handle moment comment count updates
CREATE OR REPLACE FUNCTION public.handle_moment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment counter when comment is added
    UPDATE public.moments
    SET comments_count = comments_count + 1
    WHERE id = NEW.moment_id;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement counter when comment is deleted (never go below 0)
    UPDATE public.moments
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.moment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_moment_comment_count ON public.moment_comments;

-- Create trigger on moment_comments table
CREATE TRIGGER on_moment_comment_count
  AFTER INSERT OR DELETE ON public.moment_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_moment_comment_count();

-- Test query to verify trigger setup
SELECT
  'Trigger Created' as status,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_moment_comment_count';
