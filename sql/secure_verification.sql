-- Function: verify_talent_video_secure
-- Description: Securely adds a verification, enforcing "One Verification Per Athlete" AND "No Self-Verification" (Email Match).
-- Usage: supabase.rpc('verify_talent_video_secure', { p_video_id: '...', p_verifier_data: { ... } })

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
