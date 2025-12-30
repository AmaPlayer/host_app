-- Row Level Security (RLS) Policies for Posts and Related Tables
-- These policies allow users to interact with posts while maintaining security

-- =====================================================
-- POSTS TABLE POLICIES
-- =====================================================

-- Enable RLS on posts table (if not already enabled)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- 1. SELECT Policy - Anyone can view posts (public read access)
CREATE POLICY "Anyone can view posts" ON public.posts
  FOR SELECT
  USING (true);

-- 2. INSERT Policy - Any authenticated user can create posts
-- Note: We're using Firebase Auth, so we check if user exists in users table
CREATE POLICY "Users can insert their own posts" ON public.posts
  FOR INSERT
  WITH CHECK (
    -- Check if the user_id exists in the users table
    EXISTS (
      SELECT 1 FROM public.users WHERE id = user_id
    )
  );

-- 3. UPDATE Policy - Users can update their own posts
CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE
  USING (
    -- User can only update if they own the post
    user_id IN (SELECT id FROM public.users)
  )
  WITH CHECK (
    -- Ensure they're not changing the user_id to someone else
    user_id IN (SELECT id FROM public.users)
  );

-- 4. DELETE Policy - Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE
  USING (
    -- User can only delete if they own the post
    user_id IN (SELECT id FROM public.users)
  );

-- =====================================================
-- POST LIKES TABLE POLICIES
-- =====================================================

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;

-- 1. SELECT - Anyone can view likes
CREATE POLICY "Anyone can view likes" ON public.post_likes
  FOR SELECT
  USING (true);

-- 2. INSERT - Users can add likes
CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = user_id)
  );

-- 3. DELETE - Users can remove their own likes
CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE
  USING (
    user_id IN (SELECT id FROM public.users)
  );

-- =====================================================
-- POST COMMENTS TABLE POLICIES
-- =====================================================

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can add comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

-- 1. SELECT - Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.post_comments
  FOR SELECT
  USING (true);

-- 2. INSERT - Users can add comments
CREATE POLICY "Users can add comments" ON public.post_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = user_id)
  );

-- 3. UPDATE - Users can edit their own comments
CREATE POLICY "Users can update their own comments" ON public.post_comments
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users))
  WITH CHECK (user_id IN (SELECT id FROM public.users));

-- 4. DELETE - Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.post_comments
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.users));

-- =====================================================
-- POST SHARES TABLE POLICIES
-- =====================================================

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view shares" ON public.post_shares;
DROP POLICY IF EXISTS "Users can share posts" ON public.post_shares;
DROP POLICY IF EXISTS "Users can unshare posts" ON public.post_shares;

-- 1. SELECT - Anyone can view shares
CREATE POLICY "Anyone can view shares" ON public.post_shares
  FOR SELECT
  USING (true);

-- 2. INSERT - Users can share posts
CREATE POLICY "Users can share posts" ON public.post_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = user_id)
  );

-- 3. DELETE - Users can remove their shares
CREATE POLICY "Users can unshare posts" ON public.post_shares
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.users));

-- =====================================================
-- VERIFICATION
-- =====================================================

-- To verify policies are created, run:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('posts', 'post_likes', 'post_comments', 'post_shares');
