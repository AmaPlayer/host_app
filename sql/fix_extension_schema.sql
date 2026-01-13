-- ==============================================================================
-- SECURITY FIX: Move Extensions to Dedicated Schema
-- Description: Moves 'pg_trgm' out of 'public' to 'extensions'.
-- CRITICAL STEP included: Updates database search_path so the app still works.
-- ==============================================================================

-- 1. Create the dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Move the extension
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 3. CRITICAL: Update the Database Search Path
-- This ensures 'extensions' is searched automatically, so you don't need
-- to rewrite all your queries (e.g. `similarity()` vs `extensions.similarity()`).
-- We add 'extensions' to the existing paths.
ALTER DATABASE postgres SET search_path TO public, extensions;

-- 4. Grant usage to authenticated users (so they can still search)
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 5. Grant execute on all functions in extensions to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- NOTE: You may need to reconnect for search_path changes to take effect.
