-- ==============================================================================
-- CRITICAL SECURITY HARDENING PATCH (v1)
-- Description: Fixes IDOR in connections, Privilege Escalation in users, and IDOR in stories.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN ORGANIZATION CONNECTIONS (Fix IDOR)
-- ------------------------------------------------------------------------------
-- Problem: Previous policy "USING (true)" allowed ANY user to view/insert ANY connection.
-- Fix: Restrict to Sender, Recipient, and Admins.

DROP POLICY IF EXISTS "Auth read connections" ON public.organization_connections;
DROP POLICY IF EXISTS "Auth insert connections" ON public.organization_connections;

-- Policy: Admin Access (View/Manage All)
CREATE POLICY "Admins can manage all connections"
ON public.organization_connections
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policy: Participants (Sender/Recipient) can View
CREATE POLICY "Participants can view own connections"
ON public.organization_connections FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Policy: Senders can Insert (Must be themselves)
CREATE POLICY "Users can insert as sender"
ON public.organization_connections FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
);

-- Policy: Participants can Update (e.g. Status)
CREATE POLICY "Participants can update own connections"
ON public.organization_connections FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);


-- ------------------------------------------------------------------------------
-- 2. HARDEN USERS TABLE (Prevent Privilege Escalation)
-- ------------------------------------------------------------------------------
-- Problem: If users can UPDATE "role", they can become admins.
-- Fix: Prevent `role` column from being modified by the user.

-- We assume an existing policy allows update. We will create a TRIGGER that validates permissions on update.
-- This is safer than replacing RLS policies which might be complex.

CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If the role is changing
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Allow if the *current user* is an admin
        IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
            RETURN NEW;
        END IF;

        -- Allow if it's a System/Service Role (not usually applicable in RLS trigger context unless checking role)
        -- But for standard user updates: BLOCK.
        RAISE EXCEPTION 'Security Violation: You are not authorized to change your user role.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_user_role ON public.users;
CREATE TRIGGER tr_protect_user_role
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change();


-- ------------------------------------------------------------------------------
-- 3. HARDEN STORY VIEWS (Prevent Spam)
-- ------------------------------------------------------------------------------
-- Problem: Users could insert random views.
-- Fix: Ensure the viewer is the authenticated user.

DROP POLICY IF EXISTS "Auth insert views" ON public.story_views;

CREATE POLICY "Users can only log their own views"
ON public.story_views FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = viewer_id
);
