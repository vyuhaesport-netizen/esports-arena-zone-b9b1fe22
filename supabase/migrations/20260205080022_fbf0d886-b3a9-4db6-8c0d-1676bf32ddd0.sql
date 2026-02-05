-- Create collab_links table for tracking referral links given to organizers/creators
CREATE TABLE public.collab_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('organizer', 'creator')),
  link_code TEXT NOT NULL UNIQUE,
  commission_per_registration NUMERIC NOT NULL DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_signups INTEGER NOT NULL DEFAULT 0,
  total_qualified INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collab_referrals table for tracking individual referrals
CREATE TABLE public.collab_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.collab_links(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'qualified')),
  qualification_type TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qualified_at TIMESTAMP WITH TIME ZONE,
  commission_amount NUMERIC,
  commission_credited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on link_id + referred_user_id
CREATE UNIQUE INDEX collab_referrals_unique_user ON public.collab_referrals(link_id, referred_user_id);

-- Enable RLS on both tables
ALTER TABLE public.collab_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for collab_links
CREATE POLICY "Admins can manage all collab links"
  ON public.collab_links
  FOR ALL
  USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own collab link"
  ON public.collab_links
  FOR SELECT
  USING (auth.uid() = user_id AND is_active = true);

-- RLS policies for collab_referrals
CREATE POLICY "Admins can manage all collab referrals"
  ON public.collab_referrals
  FOR ALL
  USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Link owners can view their referrals"
  ON public.collab_referrals
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.collab_links cl
    WHERE cl.id = collab_referrals.link_id
    AND cl.user_id = auth.uid()
  ));

CREATE POLICY "System can insert referrals"
  ON public.collab_referrals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update referrals"
  ON public.collab_referrals
  FOR UPDATE
  USING (true);

-- Create function to generate unique link code
CREATE OR REPLACE FUNCTION generate_collab_link_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to credit collab commission when referral qualifies
CREATE OR REPLACE FUNCTION credit_collab_commission(
  p_referral_id UUID,
  p_qualification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_link_id UUID;
  v_link_user_id UUID;
  v_commission NUMERIC;
  v_referral_status TEXT;
  v_already_credited BOOLEAN;
BEGIN
  -- Get referral details
  SELECT link_id, status, commission_credited INTO v_link_id, v_referral_status, v_already_credited
  FROM collab_referrals
  WHERE id = p_referral_id;
  
  -- Skip if already qualified or credited
  IF v_referral_status = 'qualified' OR v_already_credited THEN
    RETURN FALSE;
  END IF;
  
  -- Get link details
  SELECT user_id, commission_per_registration INTO v_link_user_id, v_commission
  FROM collab_links
  WHERE id = v_link_id AND is_active = true;
  
  IF v_link_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update referral status
  UPDATE collab_referrals
  SET status = 'qualified',
      qualified_at = now(),
      qualification_type = p_qualification_type,
      commission_amount = v_commission,
      commission_credited = true
  WHERE id = p_referral_id;
  
  -- Update link stats
  UPDATE collab_links
  SET total_qualified = total_qualified + 1,
      total_earned = total_earned + v_commission,
      updated_at = now()
  WHERE id = v_link_id;
  
  -- Credit commission to user's dhana balance
  INSERT INTO dhana_transactions (user_id, amount, type, status, description)
  VALUES (v_link_user_id, v_commission, 'collab_commission', 'completed', 'Collab referral commission');
  
  -- Update dhana balance
  UPDATE dhana_balances
  SET available_dhana = available_dhana + v_commission,
      total_earned = total_earned + v_commission,
      updated_at = now()
  WHERE user_id = v_link_user_id;
  
  -- Create if not exists
  IF NOT FOUND THEN
    INSERT INTO dhana_balances (user_id, available_dhana, total_earned)
    VALUES (v_link_user_id, v_commission, v_commission);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check qualification on tournament completion
CREATE OR REPLACE FUNCTION check_collab_qualification_on_tournament()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_record RECORD;
BEGIN
  -- Only trigger when tournament status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if any joined user has a collab referral
    FOR v_referral_record IN 
      SELECT cr.id, cr.referred_user_id
      FROM collab_referrals cr
      WHERE cr.referred_user_id = ANY(NEW.joined_users)
      AND cr.status = 'registered'
    LOOP
      PERFORM credit_collab_commission(v_referral_record.id, 'tournament_completed');
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_collab_on_tournament_complete
  AFTER UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION check_collab_qualification_on_tournament();

-- Create trigger to check qualification on deposit
CREATE OR REPLACE FUNCTION check_collab_qualification_on_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_record RECORD;
BEGIN
  -- Only trigger when deposit is approved and amount >= 50
  IF NEW.status = 'approved' AND NEW.type = 'deposit' AND NEW.amount >= 50 THEN
    -- Check if user has a collab referral
    FOR v_referral_record IN 
      SELECT cr.id
      FROM collab_referrals cr
      WHERE cr.referred_user_id = NEW.user_id
      AND cr.status = 'registered'
    LOOP
      PERFORM credit_collab_commission(v_referral_record.id, 'deposit_50_plus');
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_collab_on_deposit
  AFTER UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_collab_qualification_on_deposit();