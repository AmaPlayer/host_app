-- Row Level Security (RLS) Policies for Users Table
-- Required for Firebase Auth + Supabase integration

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- 1. SELECT Policy - Anyone can view user profiles (public read)
-- This is needed for displaying user info on posts, comments, etc.
CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT
  USING (true);

-- 2. INSERT Policy - Anyone can create their profile during signup
-- This allows Firebase Auth users to register in Supabase
CREATE POLICY "Users can insert their profile" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- 3. UPDATE Policy - Users can update their own profile
-- Note: Since we're using Firebase UID, we allow all updates for now
-- In production, you might want to restrict this to specific users
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4. DELETE Policy - Usually we don't allow deleting users
-- Uncomment if you want to allow user deletion
-- CREATE POLICY "Users can delete their own profile" ON public.users
--   FOR DELETE
--   USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- To verify policies are created, run:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'users';
