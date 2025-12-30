-- Stories Feature Enhancements
-- Adds view counting and viewer tracking support

-- 1. Add a view_count column to the existing stories table
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Create a new table to track who viewed which story
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id) -- Ensures a user only counts as 1 view
);

-- 3. Create a function to auto-increment view_count
CREATE OR REPLACE FUNCTION public.increment_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stories
  SET view_count = view_count + 1
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger the function when a new view is added
DROP TRIGGER IF EXISTS on_story_view_added ON public.story_views;
CREATE TRIGGER on_story_view_added
  AFTER INSERT ON public.story_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_story_view_count();
