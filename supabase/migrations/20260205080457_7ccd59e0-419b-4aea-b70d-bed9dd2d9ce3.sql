-- Create function to track link clicks
CREATE OR REPLACE FUNCTION track_collab_link_click(p_link_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE collab_links
  SET total_clicks = total_clicks + 1,
      updated_at = now()
  WHERE link_code = p_link_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to record referral signup
CREATE OR REPLACE FUNCTION record_collab_referral(
  p_link_code TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Find active link
  SELECT id INTO v_link_id
  FROM collab_links
  WHERE link_code = p_link_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());
  
  IF v_link_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user already referred
  IF EXISTS (SELECT 1 FROM collab_referrals WHERE referred_user_id = p_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Create referral record
  INSERT INTO collab_referrals (link_id, referred_user_id, status)
  VALUES (v_link_id, p_user_id, 'registered');
  
  -- Update signup count
  UPDATE collab_links
  SET total_signups = total_signups + 1,
      updated_at = now()
  WHERE id = v_link_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION track_collab_link_click(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION track_collab_link_click(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_collab_referral(TEXT, UUID) TO authenticated;