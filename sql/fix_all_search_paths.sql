-- ==============================================================================
-- SECURITY FIX: SMART Search Path Fixer (V3 - Final)
-- Description: Finds all USER-defined functions in 'public' and secures them.
-- CRITICAL CHANGE: Excludes functions belonging to EXTENSIONS (like pg_trgm)
-- to prevent "must be owner" errors.
-- ==============================================================================

DO $$
DECLARE
    func_record RECORD;
    func_sig TEXT;
BEGIN
    -- Loop through functions in 'public' schema
    FOR func_record IN
        SELECT p.oid::regprocedure as signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          -- EXCLUDE Extension functions (check pg_depend)
          -- We ensure the function is NOT dependent on an extension ('e')
          AND NOT EXISTS (
              SELECT 1 FROM pg_depend d 
              WHERE d.objid = p.oid 
              AND d.deptype = 'e'
          )
    LOOP
        func_sig := func_record.signature;
        
        RAISE NOTICE 'Securing User Function: %', func_sig;
        EXECUTE 'ALTER FUNCTION ' || func_sig || ' SET search_path = public';
        
    END LOOP;
    
    RAISE NOTICE 'All USER functions in public have been secured (Extensions skipped).';
END;
$$;
