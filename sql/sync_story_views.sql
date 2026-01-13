-- 1. Create the Function to increment view_count
CREATE OR REPLACE FUNCTION public.update_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the view_count on the parent story row
  -- We use COALESCE to assume 0 if null, then add 1
  UPDATE public.stories
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = NEW.story_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger on story_views
DROP TRIGGER IF EXISTS on_story_view_insert ON public.story_views;

CREATE TRIGGER on_story_view_insert
AFTER INSERT ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.update_story_view_count();

-- 3. Backfill/Fix Schema: Ensure view_count is accurate for existing data
-- This sets view_count to the actual number of rows in story_views for each story
UPDATE public.stories s
SET view_count = (
    SELECT COUNT(*) 
    FROM public.story_views v 
    WHERE v.story_id = s.id
);

-- Note: This ensures that from now on, every valid insert into 'story_views'
-- will automatically update 'stories.view_count', keeping them in sync.
