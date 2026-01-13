-- ==============================================================================
-- SECURITY PATCH V3: FIREBASE AUTH COMPATIBILITY
-- Description: Adapts Rate Limiting to work without Supabase Auth (auth.uid() is null).
-- Uses Device Fingerprint / IP as the identifier instead.
-- ==============================================================================

-- 1. DROP Old Structures (Incompatible with Anonymous Users)
DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);
DROP TABLE IF EXISTS public.rpc_rate_limits;

-- 2. CREATE New Rate Limits Table (Uses Text Identifier instead of UUID)
CREATE TABLE public.rpc_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- Device ID, IP, or Email
    action_key TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, action_key)
);

-- Index for cleanup
CREATE INDEX idx_rate_limits_window ON public.rpc_rate_limits(window_start);

-- 3. CREATE New Rate Limit Check Function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier TEXT,
    p_action_key TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- If no identifier provided (e.g. anonymous with no fingerprint), fallback to Generic IP?
    -- For this app, we expect 'deviceFingerprint' to be passed.
    IF p_identifier IS NULL OR p_identifier = '' THEN
        -- Fallback to IP address if available, or fail safe
        -- Doing a soft block if no identity possible
        RAISE EXCEPTION 'Rate Limit: Missing client identifier (Device/IP).';
    END IF;

    -- Upsert logic
    INSERT INTO public.rpc_rate_limits (identifier, action_key, count, window_start)
    VALUES (p_identifier, p_action_key, 1, v_now)
    ON CONFLICT (identifier, action_key)
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


-- 4. UPDATE Verification Function to use Device Fingerprint
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
  v_rate_limit_key TEXT;
BEGIN
  -- Extract Identifiers First
  v_device_fp := p_verifier_data ->> 'deviceFingerprint';
  v_ip_addr := p_verifier_data ->> 'ipAddress';
  v_verifier_email := p_verifier_data ->> 'verifierEmail';

  -- Prioritize Device Fingerprint, then IP, then Email for rate limiting
  v_rate_limit_key := COALESCE(v_device_fp, v_ip_addr, v_verifier_email);

  -- [[ SECURITY: RATE LIMIT ]]
  -- Pass the extracted key. Limit: 5 per minute per Device/IP.
  PERFORM public.check_rate_limit(v_rate_limit_key, 'verify_video', 5, 60);

  -- 1. Lock the video row
  SELECT * INTO v_video_record
  FROM talent_videos
  WHERE id = p_video_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Video not found'; END IF;

  v_current_verifications := COALESCE(v_video_record.verifications, '[]'::JSONB);
  v_user_id := v_video_record.user_id; -- The Athlete's ID
  v_threshold := 1; 

  -- 2. SELF-VERIFICATION CHECK (Backend)
  -- Get owner email
  SELECT email INTO v_owner_email FROM users WHERE id = v_user_id;
  
  -- If verifier uses the same email as the owner -> BLOCK
  IF v_verifier_email IS NOT NULL AND v_owner_email IS NOT NULL AND LOWER(v_verifier_email) = LOWER(v_owner_email) THEN
    RAISE EXCEPTION 'Self-verification detected: You cannot use your own email to verify your video.';
  END IF;

  -- 3. DUPLICATE CHECK: Check for duplicates across ALL videos for this Athlete
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

  -- 4. Prepare & Update
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
