-- ==============================================================================
-- SECURITY HARDENING PATCH (v2) - ANTI-DDOS & RATE LIMITING
-- Description: Implements server-side rate limiting to prevent spam/DDoS on RPCs.
-- ==============================================================================

-- 1. Create Rate Limits Table (Ephemeral Store)
CREATE TABLE IF NOT EXISTS public.rpc_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action_key TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action_key)
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rpc_rate_limits(window_start);

-- 2. Generic Rate Limit Check Function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_action_key TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_record RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Allow anonymous to pass? No, block.
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Rate Limit: Authentication required.';
    END IF;

    -- Cleanup old records for this user/action (lazy cleanup)
    -- Or we generally just check the current record.
    
    -- Upsert logic
    INSERT INTO public.rpc_rate_limits (user_id, action_key, count, window_start)
    VALUES (v_user_id, p_action_key, 1, v_now)
    ON CONFLICT (user_id, action_key)
    DO UPDATE SET
        -- If window expired, reset count and window
        count = CASE 
            WHEN (public.rpc_rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL) < EXCLUDED.window_start 
            THEN 1 
            ELSE public.rpc_rate_limits.count + 1 
        END,
        window_start = CASE 
            WHEN (public.rpc_rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL) < EXCLUDED.window_start 
            THEN EXCLUDED.window_start 
            ELSE public.rpc_rate_limits.window_start 
        END
    RETURNING count INTO v_record;

    -- Check Limit
    IF v_record.count > p_max_requests THEN
        RAISE EXCEPTION 'Rate Limit Exceeded: Too many requests. Please wait.';
    END IF;

    RETURN TRUE;
END;
$$;


-- 3. Apply Rate Limit to Critical Function: Verify Talent Video
-- Redefining the function to include the check.
CREATE OR REPLACE FUNCTION verify_talent_video_secure(
  p_video_id UUID,
  p_verifier_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_video_record RECORD;
  v_current_verifications JSONB;
  v_new_verification JSONB;
  v_device_fp TEXT;
  v_ip_addr TEXT;
  v_verifier_email TEXT;
  v_owner_email TEXT;
  v_is_duplicate BOOLEAN;
  v_threshold INTEGER;
  v_new_status TEXT;
  v_user_id UUID;
BEGIN
  -- [[ SECURITY: RATE LIMIT ]]
  -- Limit: 5 verifications per minute per user
  PERFORM public.check_rate_limit('verify_video', 5, 60);

  -- 1. Lock the video row
  SELECT * INTO v_video_record
  FROM talent_videos
  WHERE id = p_video_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Video not found'; END IF;

  v_current_verifications := COALESCE(v_video_record.verifications, '[]'::JSONB);
  v_user_id := v_video_record.user_id; -- The Athlete's ID
  v_threshold := 1; 

  -- 2. Extract Anti-Cheat Data
  v_device_fp := p_verifier_data ->> 'deviceFingerprint';
  v_ip_addr := p_verifier_data ->> 'ipAddress';
  v_verifier_email := p_verifier_data ->> 'verifierEmail';

  -- 3. SELF-VERIFICATION CHECK (Backend)
  -- Get owner email
  SELECT email INTO v_owner_email FROM users WHERE id = v_user_id;
  
  -- If verifier uses the same email as the owner -> BLOCK
  IF v_verifier_email IS NOT NULL AND v_owner_email IS NOT NULL AND LOWER(v_verifier_email) = LOWER(v_owner_email) THEN
    RAISE EXCEPTION 'Self-verification detected: You cannot use your own email to verify your video.';
  END IF;

  -- 4. DUPLICATE CHECK: Check for duplicates across ALL videos for this Athlete
  SELECT EXISTS (
    SELECT 1
    FROM talent_videos tv,
         jsonb_array_elements(COALESCE(tv.verifications, '[]'::JSONB)) as verify_entry
    WHERE tv.user_id = v_user_id -- Match the Athlete
      AND (
        (v_device_fp IS NOT NULL AND verify_entry ->> 'deviceFingerprint' = v_device_fp)
        OR 
        (v_ip_addr IS NOT NULL AND verify_entry ->> 'ipAddress' = v_ip_addr)
      )
  ) INTO v_is_duplicate;

  IF v_is_duplicate THEN
    RAISE EXCEPTION 'Duplicate verification detected: You have already verified a video for this athlete.';
  END IF;

  -- 5. Prepare & Update
  v_new_verification := p_verifier_data || jsonb_build_object('verifiedAt', NOW());

  IF (jsonb_array_length(v_current_verifications) + 1) >= v_threshold THEN
    v_new_status := 'verified';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE talent_videos
  SET verifications = v_current_verifications || v_new_verification,
      verification_status = v_new_status,
      updated_at = NOW()
  WHERE id = p_video_id;

  IF v_new_status = 'verified' THEN
    UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;
