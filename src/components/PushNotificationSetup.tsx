import React, { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, BellRing, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  initOneSignal, 
  loginOneSignal, 
  logoutOneSignal, 
  requestPushPermission, 
  getPushPermissionStatus,
  canUsePushNotifications
} from '@/lib/onesignal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationSetupProps {
  variant?: 'inline' | 'card';
}

const PROMPT_ENABLED_KEY = 'push_enabled';

export const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({ variant = 'inline' }) => {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const updatePermissionStatus = useCallback(() => {
    if ('Notification' in window) {
      const status = Notification.permission as 'default' | 'granted' | 'denied';
      setPermissionStatus(status);
      if (status === 'granted') {
        localStorage.setItem(PROMPT_ENABLED_KEY, 'true');
      }
      return status;
    }
    const osStatus = getPushPermissionStatus();
    setPermissionStatus(osStatus);
    return osStatus;
  }, []);

  useEffect(() => {
    const setup = async () => {
      setIsInitializing(true);
      
      // Check if push notifications are available on this domain
      if (!canUsePushNotifications()) {
        setIsAvailable(false);
        setIsInitializing(false);
        return;
      }
      
      const initialized = await initOneSignal();
      
      updatePermissionStatus();
      
      // Link user to OneSignal only if initialized
      if (user && initialized) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        
        await loginOneSignal(user.id, profile?.email);
      }
      
      setIsInitializing(false);
    };

    setup();
  }, [user, updatePermissionStatus]);

  useEffect(() => {
    if (!user) {
      logoutOneSignal();
    }
  }, [user]);

  const handleEnablePush = async () => {
    setIsLoading(true);
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      toast.error('Request timed out. Please try again.');
    }, 15000);
    
    try {
      const granted = await requestPushPermission();
      
      clearTimeout(timeoutId);
      
      if (granted) {
        setPermissionStatus('granted');
        localStorage.setItem(PROMPT_ENABLED_KEY, 'true');
        toast.success('Notifications enabled!', {
          description: 'You will now receive important updates.',
        });
      } else {
        updatePermissionStatus();
        if ('Notification' in window && Notification.permission === 'denied') {
          toast.error('Notifications blocked', {
            description: 'Please enable in browser settings.',
          });
        } else {
          toast.info('Notifications not enabled', {
            description: 'You can try again later.',
          });
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error enabling push:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not logged in
  if (!user) return null;

  // Show unavailable state for unsupported domains
  if (!isAvailable) {
    return variant === 'card' ? (
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Push Not Available</p>
            <p className="text-xs text-muted-foreground">Available on published app only</p>
          </div>
        </CardContent>
      </Card>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>Push available on published app</span>
      </div>
    );
  }

  // Show loading state
  if (isInitializing) {
    return variant === 'card' ? (
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    // Enabled state
    if (permissionStatus === 'granted') {
      return (
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Notifications Enabled</p>
              <p className="text-xs text-muted-foreground">You'll receive tournament & prize alerts</p>
            </div>
            <BellRing className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      );
    }

    // Denied state
    if (permissionStatus === 'denied') {
      return (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
              <BellOff className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Notifications Blocked</p>
              <p className="text-xs text-muted-foreground">Enable in browser settings to get alerts</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default - show enable CTA
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">Get tournament, prize & match alerts</p>
            </div>
          </div>
          <Button 
            onClick={handleEnablePush}
            disabled={isLoading}
            className="w-full"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Turn On Notifications
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  if (permissionStatus === 'granted') {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <BellRing className="h-4 w-4" />
        <span>Push notifications enabled</span>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notifications blocked. Enable in browser settings.</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnablePush}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {isLoading ? 'Enabling...' : 'Enable Push Notifications'}
    </Button>
  );
};

export default PushNotificationSetup;
