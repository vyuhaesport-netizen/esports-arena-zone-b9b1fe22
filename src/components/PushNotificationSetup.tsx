import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  initOneSignal, 
  loginOneSignal, 
  logoutOneSignal, 
  requestPushPermission, 
  isPushEnabled,
  getPushPermissionStatus 
} from '@/lib/onesignal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const PushNotificationSetup: React.FC = () => {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const setup = async () => {
      await initOneSignal();
      
      // Update permission status
      const status = getPushPermissionStatus();
      setPermissionStatus(status);
      
      // If user is logged in, link them to OneSignal
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        
        await loginOneSignal(user.id, profile?.email);
      }
    };

    setup();
  }, [user]);

  useEffect(() => {
    // Logout from OneSignal when user logs out
    if (!user) {
      logoutOneSignal();
    }
  }, [user]);

  const handleEnablePush = async () => {
    setIsLoading(true);
    
    try {
      const granted = await requestPushPermission();
      
      if (granted) {
        setPermissionStatus('granted');
        toast.success('Push notifications enabled!', {
          description: 'You will now receive important updates.',
        });
      } else {
        setPermissionStatus(getPushPermissionStatus());
        toast.info('Push notifications not enabled', {
          description: 'You can enable them later in your browser settings.',
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not logged in
  if (!user) {
    return null;
  }

  // Already granted
  if (permissionStatus === 'granted' && isPushEnabled()) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <BellRing className="h-4 w-4" />
        <span>Push notifications enabled</span>
      </div>
    );
  }

  // Denied - show info
  if (permissionStatus === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Push notifications blocked. Enable in browser settings.</span>
      </div>
    );
  }

  // Default - show enable button
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnablePush}
      disabled={isLoading}
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {isLoading ? 'Enabling...' : 'Enable Push Notifications'}
    </Button>
  );
};

export default PushNotificationSetup;
