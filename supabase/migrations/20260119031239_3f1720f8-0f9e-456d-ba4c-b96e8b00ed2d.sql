-- Add last_activity_at column to profiles for tracking inactive users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update last_activity_at for all existing users
UPDATE public.profiles SET last_activity_at = updated_at WHERE last_activity_at IS NULL;

-- Create a function for Groq AI to unban users after verification
CREATE OR REPLACE FUNCTION public.ai_unban_user(
  p_user_id UUID,
  p_verified_email TEXT,
  p_verified_phone TEXT,
  p_verified_uid TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_active_ban RECORD;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Verify at least 2 out of 3 fields match
  DECLARE
    v_matches INT := 0;
  BEGIN
    IF LOWER(v_profile.email) = LOWER(p_verified_email) THEN
      v_matches := v_matches + 1;
    END IF;
    
    IF v_profile.phone IS NOT NULL AND v_profile.phone = p_verified_phone THEN
      v_matches := v_matches + 1;
    END IF;
    
    IF v_profile.game_uid IS NOT NULL AND LOWER(v_profile.game_uid) = LOWER(p_verified_uid) THEN
      v_matches := v_matches + 1;
    END IF;
    
    IF v_matches < 2 THEN
      RETURN json_build_object('success', false, 'error', 'Verification failed. Details do not match our records.');
    END IF;
  END;
  
  -- Get active ban
  SELECT * INTO v_active_ban FROM player_bans 
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY banned_at DESC LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No active ban found for this user');
  END IF;
  
  -- Check if it's a permanent ban (ban_number >= 3)
  IF v_active_ban.ban_number >= 3 OR v_active_ban.ban_type = 'permanent' THEN
    RETURN json_build_object('success', false, 'error', 'Permanent bans cannot be lifted through AI verification. Please contact admin.');
  END IF;
  
  -- Check if ban has already expired
  IF v_active_ban.expires_at IS NOT NULL AND v_active_ban.expires_at < now() THEN
    -- Lift the expired ban
    UPDATE player_bans 
    SET is_active = false, 
        lifted_at = now(), 
        lift_reason = 'Ban expired and verified by AI'
    WHERE id = v_active_ban.id;
    
    UPDATE profiles SET is_banned = false WHERE user_id = p_user_id;
    
    RETURN json_build_object('success', true, 'message', 'Your ban has already expired. Account is now active.');
  END IF;
  
  -- For temporary bans that haven't expired, only lift if it's an "Unusual Activity" ban
  IF v_active_ban.ban_reason ILIKE '%unusual activity%' OR v_active_ban.ban_reason ILIKE '%inactive%' THEN
    UPDATE player_bans 
    SET is_active = false, 
        lifted_at = now(), 
        lift_reason = 'Verified and restored by AI assistant'
    WHERE id = v_active_ban.id;
    
    UPDATE profiles SET is_banned = false, last_activity_at = now() WHERE user_id = p_user_id;
    
    RETURN json_build_object('success', true, 'message', 'Account verified and restored successfully! You can now access all features.');
  ELSE
    RETURN json_build_object('success', false, 'error', 'This ban type requires manual review. Please wait for the ban duration to complete or contact support.');
  END IF;
END;
$$;

-- Create function to check and ban inactive users (called by scheduled job or on login)
CREATE OR REPLACE FUNCTION public.check_and_ban_inactive_user(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_days_inactive INT;
  v_existing_ban RECORD;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('is_banned', false);
  END IF;
  
  -- If already banned, return early
  IF v_profile.is_banned = true THEN
    RETURN json_build_object('is_banned', true, 'reason', 'already_banned');
  END IF;
  
  -- Calculate days since last activity
  v_last_activity := COALESCE(v_profile.last_activity_at, v_profile.created_at);
  v_days_inactive := EXTRACT(DAY FROM (now() - v_last_activity));
  
  -- If inactive for 7+ days, create a ban
  IF v_days_inactive >= 7 THEN
    -- Check if there's already an inactive ban to avoid duplicate bans
    SELECT * INTO v_existing_ban FROM player_bans 
    WHERE user_id = p_user_id 
      AND ban_reason ILIKE '%unusual activity%' 
      AND is_active = true;
    
    IF NOT FOUND THEN
      -- Create the ban
      INSERT INTO player_bans (
        user_id,
        ban_reason,
        ban_type,
        banned_by,
        ban_number,
        expires_at,
        is_active
      ) VALUES (
        p_user_id,
        'Unusual Activity: Account inactive for ' || v_days_inactive || ' days. Please verify your identity on the Support page to restore access.',
        'temporary',
        p_user_id, -- Self-triggered
        1, -- First offense style
        now() + interval '24 hours',
        true
      );
      
      UPDATE profiles SET is_banned = true WHERE user_id = p_user_id;
      
      RETURN json_build_object('is_banned', true, 'reason', 'inactive', 'days_inactive', v_days_inactive);
    END IF;
  END IF;
  
  RETURN json_build_object('is_banned', false);
END;
$$;

-- Create function to update user's last activity
CREATE OR REPLACE FUNCTION public.update_user_activity(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET last_activity_at = now() WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ai_unban_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_ban_inactive_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_activity(UUID) TO authenticated;