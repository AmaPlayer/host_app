-- =================================================================
-- SYNC STATS COUNTERS SCRIPT
-- =================================================================
-- This script recounts all likes, comments, and shares from the
-- detail tables and updates the main 'posts' table to match exactly.
-- Run this whenever you suspect the numbers are out of sync.
-- =================================================================

BEGIN;

-- 1. Reset all counts to 0 first (safety step)
UPDATE public.posts
SET 
  likes_count = 0,
  comments_count = 0,
  shares_count = 0;

-- 2. Recalculate Likes
WITH like_counts AS (
  SELECT post_id, COUNT(*) as real_count
  FROM public.post_likes
  GROUP BY post_id
)
UPDATE public.posts
SET likes_count = like_counts.real_count
FROM like_counts
WHERE posts.id = like_counts.post_id;

-- 3. Recalculate Comments
WITH comment_counts AS (
  SELECT post_id, COUNT(*) as real_count
  FROM public.post_comments
  GROUP BY post_id
)
UPDATE public.posts
SET comments_count = comment_counts.real_count
FROM comment_counts
WHERE posts.id = comment_counts.post_id;

-- 4. Recalculate Shares
WITH share_counts AS (
  SELECT post_id, COUNT(*) as real_count
  FROM public.post_shares
  GROUP BY post_id
)
UPDATE public.posts
SET shares_count = share_counts.real_count
FROM share_counts
WHERE posts.id = share_counts.post_id;

COMMIT;

-- Verify the specific post you mentioned (Optional: replace ID to check)
-- SELECT id, likes_count, comments_count FROM public.posts;
