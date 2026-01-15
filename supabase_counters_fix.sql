-- ==========================================
-- AUTOMATIC COUNTER UPDATES FOR USERS
-- ==========================================

-- 1. Create Function to Update Post Counts
CREATE OR REPLACE FUNCTION public.handle_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.users
    SET posts_count = posts_count + 1
    WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.users
    SET posts_count = GREATEST(0, posts_count - 1)
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Function to Update Story (Moment) Counts
CREATE OR REPLACE FUNCTION public.handle_moment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.users
    SET stories_count = stories_count + 1
    WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.users
    SET stories_count = GREATEST(0, stories_count - 1)
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Triggers (Drop first to avoid errors if re-running)

DROP TRIGGER IF EXISTS on_post_created_or_deleted ON public.posts;
CREATE TRIGGER on_post_created_or_deleted
AFTER INSERT OR DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.handle_post_count();

DROP TRIGGER IF EXISTS on_moment_created_or_deleted ON public.moments;
CREATE TRIGGER on_moment_created_or_deleted
AFTER INSERT OR DELETE ON public.moments
FOR EACH ROW EXECUTE FUNCTION public.handle_moment_count();


-- ==========================================
-- ONE-TIME FIX: RECALCULATE EXISTING COUNTS
-- ==========================================

-- Update posts_count for all users
UPDATE public.users u
SET posts_count = (
  SELECT COUNT(*)
  FROM public.posts p
  WHERE p.user_id = u.id
);

-- Update stories_count for all users
UPDATE public.users u
SET stories_count = (
  SELECT COUNT(*)
  FROM public.moments m
  WHERE m.user_id = u.id
);
