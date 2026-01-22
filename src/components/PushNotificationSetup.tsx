import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface PushNotificationSetupProps {
  variant?: 'inline' | 'card';
}

export const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({ variant = 'inline' }) => {
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

  // Card variant - beautiful promotional card
  if (variant === 'card') {
    // Already granted - show success card
    if (permissionStatus === 'granted' && isPushEnabled()) {
      return (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Notifications Enabled</p>
              <p className="text-xs text-muted-foreground">You'll receive tournament alerts & updates</p>
            </div>
            <BellRing className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
      );
    }

    // Denied - show info card
    if (permissionStatus === 'denied') {
      return (
        <Card className="bg-gradient-to-r from-destructive/10 to-orange-500/10 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
              <BellOff className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Notifications Blocked</p>
              <p className="text-xs text-muted-foreground">Enable in browser settings to get alerts</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default - show enable card with CTA
    return (
      <Card className="bg-gradient-to-r from-primary/10 via-orange-500/10 to-yellow-500/10 border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shrink-0 shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-sm text-foreground">Enable Notifications</p>
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get instant alerts for tournaments, match results, and prize updates!
              </p>
            </div>
          </div>
          <Button 
            onClick={handleEnablePush}
            disabled={isLoading}
            className="w-full mt-3 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-semibold"
            size="sm"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
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

  // Inline variant (original behavior)
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
