-- Moments Feature Schema
-- Supports short-form vertical video content

-- 1. Create moments table
CREATE TABLE IF NOT EXISTS public.moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'approved',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create moment_likes join table
CREATE TABLE IF NOT EXISTS public.moment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID REFERENCES public.moments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moments_user ON public.moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created ON public.moments(created_at DESC);

-- 4. Create function to increment likes_count
CREATE OR REPLACE FUNCTION public.handle_moment_like()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.moments SET likes_count = likes_count + 1 WHERE id = NEW.moment_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.moments SET likes_count = likes_count - 1 WHERE id = OLD.moment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for likes
DROP TRIGGER IF EXISTS on_moment_like ON public.moment_likes;
CREATE TRIGGER on_moment_like
  AFTER INSERT OR DELETE ON public.moment_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_moment_like();
