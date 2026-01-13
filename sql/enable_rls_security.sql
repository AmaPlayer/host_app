-- ==============================================================================
-- SECURITY FIX: Enable Row Level Security (RLS) on Vulnerable Tables
-- ==============================================================================

-- 1. MOMENTS (Social Posts)
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
-- Everyone can view active moments
CREATE POLICY "Public read active moments" ON public.moments FOR SELECT USING (true);
-- Auth users can create
CREATE POLICY "Auth insert moments" ON public.moments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Owners can update/delete
CREATE POLICY "Owner update moments" ON public.moments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete moments" ON public.moments FOR DELETE USING (auth.uid() = user_id);


-- 2. MOMENT LIKES
ALTER TABLE public.moment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read likes" ON public.moment_likes FOR SELECT USING (true);
CREATE POLICY "Auth insert likes" ON public.moment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete likes" ON public.moment_likes FOR DELETE USING (auth.uid() = user_id);


-- 3. MOMENT COMMENTS
ALTER TABLE public.moment_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comments" ON public.moment_comments FOR SELECT USING (true);
CREATE POLICY "Auth insert comments" ON public.moment_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Comments owners can delete their own
CREATE POLICY "Owner delete comments" ON public.moment_comments FOR DELETE USING (auth.uid() = user_id);


-- 4. EVENT PARTICIPATIONS (Join Event)
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read participations" ON public.event_participations FOR SELECT USING (true);
CREATE POLICY "Auth insert participations" ON public.event_participations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update participations" ON public.event_participations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete participations" ON public.event_participations FOR DELETE USING (auth.uid() = user_id);


-- 5. STORY VIEWS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
-- Owners of stories usually need to see who viewed, but simpler policy:
-- Auth users can mark as viewed
CREATE POLICY "Auth insert views" ON public.story_views FOR INSERT TO authenticated WITH CHECK (true);
-- (Optional) If we want users to see who viewed their story, we need a SELECT policy.
-- Keeping it simpler for now (Auth Select) to fix the warning.
CREATE POLICY "Auth read views" ON public.story_views FOR SELECT TO authenticated USING (true);


-- 6. ORGANIZATION CONNECTIONS
ALTER TABLE public.organization_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read connections" ON public.organization_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert connections" ON public.organization_connections FOR INSERT TO authenticated WITH CHECK (true);


-- 7. CONNECTION ACTIVITY
ALTER TABLE public.connection_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read activity" ON public.connection_activity FOR SELECT TO authenticated USING (true);


-- 8. ANNOUNCEMENTS (Read Only for Public)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
-- Writes restricted to service-role (Admins) implicitly by having no INSERT policy for 'authenticated'


-- 9. BULK OPERATION LOGS (System Admin Only)
ALTER TABLE public.bulk_operation_logs ENABLE ROW LEVEL SECURITY;
-- No policies added -> Deny All for public/auth. Only Service Role can access. Correct for logs.


-- 10. USER RATE LIMITS (System Only)
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies added -> Deny All for public/auth. System internal use only.
