-- ==============================================================================
-- SECURITY FIX: Explicit Lockdown Policies
-- Description: Adds "Deny All" policies to system tables.
-- Functionally, this is the same as having NO policies (Default Deny),
-- but this makes it EXPLICIT to satisfy the Security Linter.
-- Service Role (Backend/Admin) will still bypass this and have access.
-- ==============================================================================

-- 1. BULK OPERATION LOGS
-- Explicitly state that no public/authenticated user can access this.
CREATE POLICY "System Only - No User Access" 
ON public.bulk_operation_logs 
FOR ALL 
USING (false);


-- 2. USER RATE LIMITS
-- Explicitly state that no public/authenticated user can access this.
CREATE POLICY "System Only - No User Access" 
ON public.user_rate_limits 
FOR ALL 
USING (false);

-- Result: Tables remain 100% private, but Linter sees a policy and is happy.
