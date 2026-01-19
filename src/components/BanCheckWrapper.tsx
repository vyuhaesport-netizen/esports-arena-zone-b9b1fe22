import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BanOverlay from './BanOverlay';

interface BanInfo {
  is_banned: boolean;
  ban_type?: string;
  reason?: string;
  expires_at?: string | null;
  is_permanent?: boolean;
  ban_number?: number;
}

interface BanCheckWrapperProps {
  children: React.ReactNode;
}

// Pages that banned users can still access
const ALLOWED_PATHS_FOR_BANNED_USERS = [
  '/help-support',
  '/',
  '/terms',
  '/refund-policy',
  '/about',
  '/docs'
];

const BanCheckWrapper = ({ children }: BanCheckWrapperProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [checkingBan, setCheckingBan] = useState(true);
  const activityUpdated = useRef(false);

  const isAllowedPath = ALLOWED_PATHS_FOR_BANNED_USERS.some(
    path => location.pathname === path || location.pathname.startsWith(path + '/')
  );

  // Update user activity when they're active
  const updateUserActivity = useCallback(async () => {
    if (!user || activityUpdated.current) return;
    
    try {
      await supabase.rpc('update_user_activity', { p_user_id: user.id });
      activityUpdated.current = true;
    } catch (err) {
      console.error('Error updating user activity:', err);
    }
  }, [user]);

  // Check for inactivity ban on login
  const checkInactivityBan = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase.rpc('check_and_ban_inactive_user', {
        p_user_id: user.id
      });
      
      const result = data as { is_banned?: boolean; reason?: string } | null;
      if (result?.is_banned && result?.reason === 'inactive') {
        console.log('User was auto-banned for inactivity');
      }
    } catch (err) {
      console.error('Error checking inactivity:', err);
    }
  }, [user]);

  const checkBanStatus = useCallback(async () => {
    if (!user) {
      setBanInfo(null);
      setCheckingBan(false);
      return;
    }

    try {
      // First check if user should be banned for inactivity
      await checkInactivityBan();
      
      const { data, error } = await supabase.rpc('check_user_ban_status', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking ban status:', error);
        setBanInfo(null);
      } else if (data && typeof data === 'object' && 'is_banned' in data) {
        setBanInfo(data as unknown as BanInfo);
        
        // If not banned, update activity
        if (!(data as any).is_banned) {
          updateUserActivity();
        }
      }
    } catch (err) {
      console.error('Error checking ban status:', err);
      setBanInfo(null);
    } finally {
      setCheckingBan(false);
    }
  }, [user, checkInactivityBan, updateUserActivity]);

  useEffect(() => {
    if (!loading) {
      checkBanStatus();
    }
  }, [loading, user?.id, checkBanStatus]);

  // Recheck ban status when navigating
  useEffect(() => {
    if (!loading && user && banInfo?.is_banned) {
      checkBanStatus();
    }
  }, [location.pathname]);

  const handleBanLifted = useCallback(() => {
    // Recheck ban status when countdown expires
    checkBanStatus();
  }, [checkBanStatus]);

  // Don't show ban overlay while loading
  if (loading || checkingBan) {
    return <>{children}</>;
  }

  // If user is not logged in or not banned, show normal content
  if (!user || !banInfo?.is_banned) {
    return <>{children}</>;
  }

  // If user is banned but on an allowed path (like support), show content without overlay
  // But still show a subtle indicator
  if (isAllowedPath && location.pathname === '/help-support') {
    return <>{children}</>;
  }

  // User is banned and trying to access restricted content - show overlay
  return (
    <>
      {/* Blurred content behind overlay */}
      <div className="filter blur-lg pointer-events-none select-none opacity-30">
        {children}
      </div>
      
      {/* Ban overlay on top */}
      <BanOverlay banInfo={banInfo} onBanLifted={handleBanLifted} />
    </>
  );
};

export default BanCheckWrapper;
