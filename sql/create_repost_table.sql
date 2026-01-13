-- =====================================================
-- REPOST TABLE SCHEMA FOR SUPABASE
-- Purpose: Track reposts with sharer and original author information
-- =====================================================

-- Create the repost table
CREATE TABLE IF NOT EXISTS public.repost (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- WHO IS SHARING (Sharer Information)
  sharer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sharer_name TEXT NOT NULL,
  sharer_username TEXT,
  sharer_photo_url TEXT,
  sharer_role TEXT, -- athlete, coach, organization, parent, fan

  -- WHOSE POST IS BEING SHARED (Original Author Information)
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  original_author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  original_author_name TEXT NOT NULL,
  original_author_username TEXT,
  original_author_photo_url TEXT,
  original_author_role TEXT,

  -- REPOST DETAILS
  message TEXT, -- Custom message/caption added by the sharer
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),

  -- ORIGINAL POST SNAPSHOT (preserved in case original gets deleted)
  original_post_caption TEXT,
  original_post_media_url TEXT,
  original_post_media_type TEXT, -- 'image', 'video', 'text'
  original_post_created_at TIMESTAMP WITH TIME ZONE,

  -- ENGAGEMENT METRICS (for the repost itself)
  likes_count INTEGER DEFAULT 0 NOT NULL,
  comments_count INTEGER DEFAULT 0 NOT NULL,
  views_count INTEGER DEFAULT 0 NOT NULL,

  -- METADATA & TIMESTAMPS
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete support

  -- Additional metadata (JSON for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- CONSTRAINTS
  -- Prevent the same user from reposting the same post multiple times
  CONSTRAINT unique_user_post_repost UNIQUE(sharer_id, original_post_id),

  -- Ensure user cannot repost their own post
  CONSTRAINT no_self_repost CHECK (sharer_id != original_author_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding all reposts by a specific user
CREATE INDEX IF NOT EXISTS idx_repost_sharer_id
  ON public.repost(sharer_id)
  WHERE deleted_at IS NULL;

-- Index for finding all reposts of a specific post
CREATE INDEX IF NOT EXISTS idx_repost_original_post_id
  ON public.repost(original_post_id)
  WHERE deleted_at IS NULL;

-- Index for finding reposts by original author
CREATE INDEX IF NOT EXISTS idx_repost_original_author_id
  ON public.repost(original_author_id)
  WHERE deleted_at IS NULL;

-- Index for ordering by creation date (feed queries)
CREATE INDEX IF NOT EXISTS idx_repost_created_at
  ON public.repost(created_at DESC)
  WHERE deleted_at IS NULL;

-- Composite index for feed queries with privacy filtering
CREATE INDEX IF NOT EXISTS idx_repost_privacy_created_at
  ON public.repost(privacy, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for searching by sharer name
CREATE INDEX IF NOT EXISTS idx_repost_sharer_name
  ON public.repost USING gin(to_tsvector('english', sharer_name))
  WHERE deleted_at IS NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.repost ENABLE ROW LEVEL SECURITY;

-- Policy: Public reposts are viewable by everyone
CREATE POLICY "Public reposts are viewable by everyone"
  ON public.repost
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    privacy = 'public'
  );

-- Policy: Friends reposts are viewable by friends
CREATE POLICY "Friends reposts are viewable by friends"
  ON public.repost
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    privacy = 'friends' AND
    (
      sharer_id = auth.uid() OR
      -- Check if current user is friends with the sharer
      EXISTS (
        SELECT 1 FROM public.friendships
        WHERE (
          (user1_id = auth.uid() AND user2_id = sharer_id) OR
          (user1_id = sharer_id AND user2_id = auth.uid())
        )
        AND status = 'accepted'
      )
    )
  );

-- Policy: Private reposts are viewable only by the sharer
CREATE POLICY "Private reposts are viewable only by sharer"
  ON public.repost
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    privacy = 'private' AND
    sharer_id = auth.uid()
  );

-- Policy: Users can create their own reposts
CREATE POLICY "Users can create their own reposts"
  ON public.repost
  FOR INSERT
  WITH CHECK (
    sharer_id = auth.uid() AND
    sharer_id != original_author_id -- Prevent self-repost
  );

-- Policy: Users can update their own reposts (message, privacy)
CREATE POLICY "Users can update their own reposts"
  ON public.repost
  FOR UPDATE
  USING (sharer_id = auth.uid())
  WITH CHECK (sharer_id = auth.uid());

-- Policy: Users can delete their own reposts (soft delete)
CREATE POLICY "Users can delete their own reposts"
  ON public.repost
  FOR DELETE
  USING (sharer_id = auth.uid());

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_repost_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_repost_updated_at
  BEFORE UPDATE ON public.repost
  FOR EACH ROW
  EXECUTE FUNCTION update_repost_updated_at();

-- Trigger: Increment original post shares_count when repost is created
CREATE OR REPLACE FUNCTION increment_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = NEW.original_post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_shares_count
  AFTER INSERT ON public.repost
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_shares_count();

-- Trigger: Decrement original post shares_count when repost is deleted
CREATE OR REPLACE FUNCTION decrement_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0)
  WHERE id = OLD.original_post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_shares_count
  AFTER DELETE ON public.repost
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_shares_count();

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- View: Get reposts with full user and post details
CREATE OR REPLACE VIEW public.repost_feed_view AS
SELECT
  r.id,
  r.sharer_id,
  r.sharer_name,
  r.sharer_username,
  r.sharer_photo_url,
  r.sharer_role,
  r.original_post_id,
  r.original_author_id,
  r.original_author_name,
  r.original_author_username,
  r.original_author_photo_url,
  r.original_author_role,
  r.message,
  r.privacy,
  r.original_post_caption,
  r.original_post_media_url,
  r.original_post_media_type,
  r.original_post_created_at,
  r.likes_count,
  r.comments_count,
  r.views_count,
  r.created_at,
  r.updated_at,
  -- Additional post details if original still exists
  p.caption AS current_post_caption,
  p.media_url AS current_post_media_url,
  p.likes_count AS original_post_likes,
  p.comments_count AS original_post_comments,
  p.shares_count AS original_post_shares
FROM public.repost r
LEFT JOIN public.posts p ON r.original_post_id = p.id
WHERE r.deleted_at IS NULL;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get user's repost feed (posts from friends)
CREATE OR REPLACE FUNCTION get_repost_feed(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sharer_id UUID,
  sharer_name TEXT,
  sharer_photo_url TEXT,
  original_post_id UUID,
  original_author_name TEXT,
  message TEXT,
  original_post_media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.sharer_id,
    r.sharer_name,
    r.sharer_photo_url,
    r.original_post_id,
    r.original_author_name,
    r.message,
    r.original_post_media_url,
    r.created_at
  FROM public.repost r
  WHERE
    r.deleted_at IS NULL AND
    (
      r.privacy = 'public' OR
      (r.privacy = 'friends' AND (
        r.sharer_id = user_id_param OR
        EXISTS (
          SELECT 1 FROM public.friendships
          WHERE (
            (user1_id = user_id_param AND user2_id = r.sharer_id) OR
            (user1_id = r.sharer_id AND user2_id = user_id_param)
          )
          AND status = 'accepted'
        )
      )) OR
      (r.privacy = 'private' AND r.sharer_id = user_id_param)
    )
  ORDER BY r.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user has already reposted
CREATE OR REPLACE FUNCTION has_user_reposted(
  user_id_param UUID,
  post_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.repost
    WHERE sharer_id = user_id_param
      AND original_post_id = post_id_param
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Get repost count for a post
CREATE OR REPLACE FUNCTION get_post_repost_count(post_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.repost
    WHERE original_post_id = post_id_param
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.repost IS 'Stores all reposts with sharer and original author information';
COMMENT ON COLUMN public.repost.sharer_id IS 'UUID of the user who is sharing/reposting';
COMMENT ON COLUMN public.repost.sharer_name IS 'Display name of the user who is sharing';
COMMENT ON COLUMN public.repost.original_post_id IS 'UUID of the post being shared';
COMMENT ON COLUMN public.repost.original_author_id IS 'UUID of the original post author';
COMMENT ON COLUMN public.repost.original_author_name IS 'Display name of the original post author';
COMMENT ON COLUMN public.repost.message IS 'Custom message added by the sharer (optional)';
COMMENT ON COLUMN public.repost.privacy IS 'Visibility: public, friends, or private';
COMMENT ON COLUMN public.repost.original_post_caption IS 'Snapshot of original post caption';
COMMENT ON COLUMN public.repost.metadata IS 'Additional flexible metadata as JSON';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repost TO authenticated;
GRANT SELECT ON public.repost_feed_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_repost_feed TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_reposted TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_repost_count TO authenticated;

-- =====================================================
-- SAMPLE QUERIES (FOR TESTING)
-- =====================================================

-- Get all reposts by a user
-- SELECT * FROM repost WHERE sharer_id = 'user-uuid';

-- Get all reposts of a specific post
-- SELECT * FROM repost WHERE original_post_id = 'post-uuid';

-- Get repost feed for a user
-- SELECT * FROM get_repost_feed('user-uuid', 20, 0);

-- Check if user has reposted a post
-- SELECT has_user_reposted('user-uuid', 'post-uuid');

-- Get repost count for a post
-- SELECT get_post_repost_count('post-uuid');

-- =====================================================
-- END OF SCHEMA
-- =====================================================
