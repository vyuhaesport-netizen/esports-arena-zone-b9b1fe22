
-- Create player_bans table to track all bans
CREATE TABLE public.player_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  ban_reason text NOT NULL,
  report_id uuid REFERENCES public.tournament_reports(id),
  ban_type text NOT NULL DEFAULT 'temporary', -- 'temporary', 'terminated', 'manual_termination'
  ban_number integer NOT NULL DEFAULT 1, -- 1st, 2nd, 3rd ban
  ban_duration_hours integer, -- 24 for 1st, 168 for 2nd, NULL for terminated
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone, -- NULL for permanent/terminated
  is_active boolean NOT NULL DEFAULT true,
  lifted_by uuid,
  lifted_at timestamp with time zone,
  lift_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_bans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all bans"
ON public.player_bans FOR SELECT
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert bans"
ON public.player_bans FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()) OR is_organizer(auth.uid()) OR is_creator(auth.uid()));

CREATE POLICY "Admins can update bans"
ON public.player_bans FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can view bans they created"
ON public.player_bans FOR SELECT
USING (banned_by = auth.uid());

CREATE POLICY "Users can view their own bans"
ON public.player_bans FOR SELECT
USING (user_id = auth.uid());

-- Function to get active ban count for a user
CREATE OR REPLACE FUNCTION public.get_user_ban_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT banned_by)::integer
  FROM public.player_bans
  WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION public.check_user_ban_status(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ban RECORD;
  v_total_bans integer;
BEGIN
  -- Check for terminated account first
  SELECT * INTO v_ban
  FROM public.player_bans
  WHERE user_id = p_user_id
    AND ban_type IN ('terminated', 'manual_termination')
    AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'is_banned', true,
      'ban_type', v_ban.ban_type,
      'reason', v_ban.ban_reason,
      'expires_at', NULL,
      'is_permanent', true
    );
  END IF;

  -- Check for active temporary ban
  SELECT * INTO v_ban
  FROM public.player_bans
  WHERE user_id = p_user_id
    AND ban_type = 'temporary'
    AND is_active = true
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'is_banned', true,
      'ban_type', 'temporary',
      'reason', v_ban.ban_reason,
      'expires_at', v_ban.expires_at,
      'is_permanent', false,
      'ban_number', v_ban.ban_number
    );
  END IF;

  RETURN json_build_object('is_banned', false);
END;
$$;

-- Function for organizer/creator to ban a player
CREATE OR REPLACE FUNCTION public.ban_player_from_report(
  p_report_id uuid,
  p_ban_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
  v_tournament RECORD;
  v_existing_ban_count integer;
  v_ban_duration_hours integer;
  v_ban_type text;
  v_expires_at timestamp with time zone;
  v_already_banned_by_same boolean;
BEGIN
  -- Get report details
  SELECT * INTO v_report
  FROM public.tournament_reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Report not found');
  END IF;

  -- Get tournament to verify ownership
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = v_report.tournament_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Verify caller is the tournament organizer/creator
  IF v_tournament.created_by != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to ban players from this tournament');
  END IF;

  -- Check if this organizer already banned this player
  SELECT EXISTS (
    SELECT 1 FROM public.player_bans
    WHERE user_id = v_report.reported_player_id
      AND banned_by = auth.uid()
      AND is_active = true
  ) INTO v_already_banned_by_same;

  IF v_already_banned_by_same THEN
    RETURN json_build_object('success', false, 'error', 'You have already banned this player');
  END IF;

  -- Count existing bans from different organizers/creators
  SELECT COUNT(DISTINCT banned_by)::integer INTO v_existing_ban_count
  FROM public.player_bans
  WHERE user_id = v_report.reported_player_id
    AND is_active = true;

  -- Determine ban severity based on count
  IF v_existing_ban_count >= 2 THEN
    -- 3rd ban = terminated
    v_ban_type := 'terminated';
    v_ban_duration_hours := NULL;
    v_expires_at := NULL;
  ELSIF v_existing_ban_count = 1 THEN
    -- 2nd ban = 7 days
    v_ban_type := 'temporary';
    v_ban_duration_hours := 168;
    v_expires_at := now() + interval '7 days';
  ELSE
    -- 1st ban = 24 hours
    v_ban_type := 'temporary';
    v_ban_duration_hours := 24;
    v_expires_at := now() + interval '24 hours';
  END IF;

  -- Insert the ban
  INSERT INTO public.player_bans (
    user_id,
    banned_by,
    ban_reason,
    report_id,
    ban_type,
    ban_number,
    ban_duration_hours,
    expires_at
  ) VALUES (
    v_report.reported_player_id,
    auth.uid(),
    p_ban_reason,
    p_report_id,
    v_ban_type,
    v_existing_ban_count + 1,
    v_ban_duration_hours,
    v_expires_at
  );

  -- Update report status
  UPDATE public.tournament_reports
  SET status = 'resolved',
      admin_notes = COALESCE(admin_notes, '') || E'\n[BANNED] Player banned by organizer/creator. Ban type: ' || v_ban_type,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_report_id;

  -- Send notification to banned user
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    v_report.reported_player_id,
    'account_banned',
    CASE 
      WHEN v_ban_type = 'terminated' THEN '🚫 Account Terminated'
      ELSE '⚠️ Account Suspended'
    END,
    CASE 
      WHEN v_ban_type = 'terminated' THEN 'Your account has been terminated due to multiple violations. Contact support for appeal.'
      WHEN v_ban_duration_hours = 168 THEN 'Your account has been suspended for 7 days due to repeated violations. Reason: ' || p_ban_reason
      ELSE 'Your account has been suspended for 24 hours due to a violation. Reason: ' || p_ban_reason
    END
  );

  RETURN json_build_object(
    'success', true,
    'ban_type', v_ban_type,
    'ban_number', v_existing_ban_count + 1,
    'expires_at', v_expires_at
  );
END;
$$;

-- Admin function to lift a ban
CREATE OR REPLACE FUNCTION public.admin_lift_ban(
  p_ban_id uuid,
  p_lift_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ban RECORD;
BEGIN
  -- Verify admin
  IF NOT (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid())) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_ban
  FROM public.player_bans
  WHERE id = p_ban_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Ban not found');
  END IF;

  UPDATE public.player_bans
  SET is_active = false,
      lifted_by = auth.uid(),
      lifted_at = now(),
      lift_reason = p_lift_reason,
      updated_at = now()
  WHERE id = p_ban_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    v_ban.user_id,
    'ban_lifted',
    '✅ Account Restored',
    'Your account suspension has been lifted. Reason: ' || p_lift_reason
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Admin function for manual termination
CREATE OR REPLACE FUNCTION public.admin_terminate_account(
  p_user_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid())) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Deactivate any existing bans first
  UPDATE public.player_bans
  SET is_active = false,
      updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;

  -- Insert termination ban
  INSERT INTO public.player_bans (
    user_id,
    banned_by,
    ban_reason,
    ban_type,
    ban_number,
    is_active
  ) VALUES (
    p_user_id,
    auth.uid(),
    p_reason,
    'manual_termination',
    99,
    true
  );

  -- Notify user
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    p_user_id,
    'account_terminated',
    '🚫 Account Terminated',
    'Your account has been permanently terminated by admin. Reason: ' || p_reason
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Admin function to restore terminated account
CREATE OR REPLACE FUNCTION public.admin_restore_account(
  p_user_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid())) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Deactivate all bans
  UPDATE public.player_bans
  SET is_active = false,
      lifted_by = auth.uid(),
      lifted_at = now(),
      lift_reason = p_reason,
      updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    p_user_id,
    'account_restored',
    '✅ Account Restored',
    'Your account has been fully restored by admin. Reason: ' || p_reason
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Create index for performance
CREATE INDEX idx_player_bans_user_id ON public.player_bans(user_id);
CREATE INDEX idx_player_bans_active ON public.player_bans(is_active, expires_at);
