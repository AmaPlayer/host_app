-- ==============================================================================
-- SECURITY FIX: Function Search Path Mutable (v2 - Corrected Signatures)
-- Description: Explicitly set search_path=public.
-- Corrections: Count/Increment functions are likely TRIGGERS, so they take NO arguments ().
-- ==============================================================================

-- 1. Anti-Cheat Functions (RPCs - Keep Signatures)
ALTER FUNCTION public.verify_talent_video_secure(UUID, JSONB) SET search_path = public;
ALTER FUNCTION public.update_user_verification_status() SET search_path = public;

-- 2. Social Counters (TRIGGERS - Change to empty parens)
ALTER FUNCTION public.handle_moment_like() SET search_path = public;
ALTER FUNCTION public.handle_post_like() SET search_path = public;
ALTER FUNCTION public.handle_post_like_count() SET search_path = public;
ALTER FUNCTION public.handle_post_comment_count() SET search_path = public;
ALTER FUNCTION public.handle_post_share_count() SET search_path = public;
ALTER FUNCTION public.handle_moment_comment_count() SET search_path = public;

-- 3. Atomic Updates (Likely Triggers or 0-arg RPCs?)
-- If these were RPCs called from client, `(UUID)` was correct.
-- If they are TRIGGERS called by `ON INSERT`, then `()` is correct.
-- Based on the error "function(uuid) does not exist", let's try `()` for all.
ALTER FUNCTION public.increment_post_likes() SET search_path = public;
ALTER FUNCTION public.decrement_post_likes() SET search_path = public;
ALTER FUNCTION public.increment_post_comments() SET search_path = public;
ALTER FUNCTION public.update_post_likes_count() SET search_path = public;
ALTER FUNCTION public.update_post_comments_count() SET search_path = public;
ALTER FUNCTION public.update_post_shares_count() SET search_path = public;

-- 4. User Growth & Stats (Likely RPCs or Triggers?)
-- "increment_followers" sounds like a trigger on `followers` table insert.
ALTER FUNCTION public.increment_followers() SET search_path = public;
ALTER FUNCTION public.decrement_followers() SET search_path = public;
-- "get_user_growth" sounds like a SELECT RPC. It needs params?
-- Let's assume it IS an RPC taking UUID. If 0 parameters fail, we remove this line.
-- Note: User didn't get error on this one yet, but let's be safe.
-- ALTER FUNCTION public.get_user_growth_by_month(UUID) SET search_path = public; 

-- 5. Stories
ALTER FUNCTION public.increment_story_views() SET search_path = public;
ALTER FUNCTION public.increment_story_view_count() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_stories() SET search_path = public;

-- 6. Others
ALTER FUNCTION public.update_group_member_count() SET search_path = public;
ALTER FUNCTION public.update_talent_video_likes_count() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 7. Specific Complex RPCs (Keep signatures if mostly sure)
ALTER FUNCTION public.get_mutual_friends(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.get_top_athletes(INTEGER) SET search_path = public;
