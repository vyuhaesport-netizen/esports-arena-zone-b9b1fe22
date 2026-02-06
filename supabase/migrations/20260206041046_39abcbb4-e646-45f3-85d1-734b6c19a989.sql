-- Create function to trigger collab qualification on wallet transactions
CREATE OR REPLACE FUNCTION public.trigger_collab_qualification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_referral RECORD;
  link_info RECORD;
  commission_amount NUMERIC;
BEGIN
  -- Only trigger for completed deposits or tournament joins
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if this is a qualifying action (deposit, admin_credit, tournament_join, prize)
  IF NEW.type NOT IN ('deposit', 'admin_credit', 'tournament_join', 'prize', 'prize_won') THEN
    RETURN NEW;
  END IF;
  
  -- Only qualify if amount >= 10 (meaningful transaction)
  IF NEW.amount < 10 THEN
    RETURN NEW;
  END IF;
  
  -- Find pending referral for this user
  SELECT cr.id, cr.link_id, cr.status
  INTO pending_referral
  FROM collab_referrals cr
  WHERE cr.referred_user_id = NEW.user_id
    AND cr.status = 'registered'
  LIMIT 1;
  
  IF pending_referral.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get link info
  SELECT cl.id, cl.user_id, cl.commission_per_registration, cl.total_qualified, cl.total_earned
  INTO link_info
  FROM collab_links cl
  WHERE cl.id = pending_referral.link_id;
  
  IF link_info.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  commission_amount := COALESCE(link_info.commission_per_registration, 5);
  
  -- Update referral to qualified
  UPDATE collab_referrals
  SET status = 'qualified',
      qualified_at = NOW(),
      qualification_type = NEW.type,
      commission_amount = commission_amount,
      commission_credited = TRUE
  WHERE id = pending_referral.id;
  
  -- Update link totals
  UPDATE collab_links
  SET total_qualified = COALESCE(total_qualified, 0) + 1,
      total_earned = COALESCE(total_earned, 0) + commission_amount,
      updated_at = NOW()
  WHERE id = link_info.id;
  
  -- Credit commission to link owner's withdrawable balance
  UPDATE profiles
  SET withdrawable_balance = COALESCE(withdrawable_balance, 0) + commission_amount
  WHERE user_id = link_info.user_id;
  
  -- Create wallet transaction for the commission
  INSERT INTO wallet_transactions (user_id, amount, type, status, description)
  VALUES (
    link_info.user_id,
    commission_amount,
    'collab_commission',
    'completed',
    'Collab Commission: Referral qualified via ' || NEW.type
  );
  
  RAISE NOTICE 'Collab qualification triggered: user %, commission % to %', 
    NEW.user_id, commission_amount, link_info.user_id;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_collab_qualification_on_wallet ON wallet_transactions;

-- Create trigger on wallet_transactions
CREATE TRIGGER trigger_collab_qualification_on_wallet
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_collab_qualification();

-- Also create similar trigger for tournament registrations
CREATE OR REPLACE FUNCTION public.trigger_collab_qualification_on_tournament()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_referral RECORD;
  link_info RECORD;
  commission_amount NUMERIC;
BEGIN
  -- Find pending referral for this user
  SELECT cr.id, cr.link_id, cr.status
  INTO pending_referral
  FROM collab_referrals cr
  WHERE cr.referred_user_id = NEW.user_id
    AND cr.status = 'registered'
  LIMIT 1;
  
  IF pending_referral.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get link info
  SELECT cl.id, cl.user_id, cl.commission_per_registration, cl.total_qualified, cl.total_earned
  INTO link_info
  FROM collab_links cl
  WHERE cl.id = pending_referral.link_id;
  
  IF link_info.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  commission_amount := COALESCE(link_info.commission_per_registration, 5);
  
  -- Update referral to qualified
  UPDATE collab_referrals
  SET status = 'qualified',
      qualified_at = NOW(),
      qualification_type = 'tournament_join',
      commission_amount = commission_amount,
      commission_credited = TRUE
  WHERE id = pending_referral.id;
  
  -- Update link totals
  UPDATE collab_links
  SET total_qualified = COALESCE(total_qualified, 0) + 1,
      total_earned = COALESCE(total_earned, 0) + commission_amount,
      updated_at = NOW()
  WHERE id = link_info.id;
  
  -- Credit commission to link owner
  UPDATE profiles
  SET withdrawable_balance = COALESCE(withdrawable_balance, 0) + commission_amount
  WHERE user_id = link_info.user_id;
  
  -- Create wallet transaction
  INSERT INTO wallet_transactions (user_id, amount, type, status, description)
  VALUES (
    link_info.user_id,
    commission_amount,
    'collab_commission',
    'completed',
    'Collab Commission: Referral joined tournament'
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_collab_on_tournament_reg ON tournament_registrations;

-- Create trigger on tournament_registrations
CREATE TRIGGER trigger_collab_on_tournament_reg
AFTER INSERT ON tournament_registrations
FOR EACH ROW
EXECUTE FUNCTION trigger_collab_qualification_on_tournament();