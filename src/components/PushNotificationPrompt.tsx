import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Trophy, Swords, Wallet, Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  initOneSignal, 
  loginOneSignal, 
  requestPushPermission, 
  getPushPermissionStatus,
  canUsePushNotifications
} from '@/lib/onesignal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PROMPT_DISMISSED_KEY = 'push_prompt_dismissed_v2';
const PROMPT_ENABLED_KEY = 'push_enabled';

export const PushNotificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkAndShowPrompt = useCallback(async () => {
    if (!user) return;
    
    // Check if push notifications can work on this domain
    if (!canUsePushNotifications()) {
      console.log('Push notifications not available on this domain');
      return;
    }
    
    // Check if already enabled
    if (localStorage.getItem(PROMPT_ENABLED_KEY) === 'true') {
      return;
    }
    
    // Check native permission first
    if ('Notification' in window) {
      const nativePermission = Notification.permission;
      if (nativePermission === 'granted') {
        localStorage.setItem(PROMPT_ENABLED_KEY, 'true');
        return;
      }
      if (nativePermission === 'denied') {
        return; // Don't show prompt if blocked
      }
    }
    
    // Check if dismissed within 7 days
    const dismissedData = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissedData) {
      try {
        const { timestamp } = JSON.parse(dismissedData);
        const daysSinceDismiss = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceDismiss < 7) {
          return;
        }
      } catch {
        // Invalid data, continue
      }
    }
    
    // Initialize OneSignal (with timeout handling)
    const initialized = await initOneSignal();
    
    // Final permission check
    const status = getPushPermissionStatus();
    if (status === 'granted') {
      localStorage.setItem(PROMPT_ENABLED_KEY, 'true');
      return;
    }
    if (status === 'denied') {
      return;
    }
    
    // Show prompt after delay
    setTimeout(() => setShowPrompt(true), 1500);
    
    // Link user to OneSignal only if initialized
    if (initialized) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      await loginOneSignal(user.id, profile?.email);
    }
  }, [user]);

  useEffect(() => {
    checkAndShowPrompt();
  }, [checkAndShowPrompt]);

  const handleEnable = async () => {
    setIsLoading(true);
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      toast.error('Request timed out. Please try again.');
      setShowPrompt(false);
    }, 15000);
    
    try {
      const granted = await requestPushPermission();
      
      clearTimeout(timeoutId);
      
      if (granted) {
        localStorage.setItem(PROMPT_ENABLED_KEY, 'true');
        localStorage.removeItem(PROMPT_DISMISSED_KEY);
        toast.success('Notifications enabled!', {
          description: 'You will receive tournament and prize alerts.',
        });
      } else {
        toast.info('Notifications not enabled', {
          description: 'You can enable them later from settings.',
        });
      }
      
      setShowPrompt(false);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error enabling push:', error);
      toast.error('Failed to enable notifications');
      setShowPrompt(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, JSON.stringify({
      timestamp: Date.now()
    }));
    setShowPrompt(false);
  };

  // Don't render if no user or prompt shouldn't show
  if (!showPrompt || !user) return null;

  const features = [
    { icon: Trophy, text: 'Tournament alerts' },
    { icon: Swords, text: 'Match reminders' },
    { icon: Wallet, text: 'Prize updates' },
    { icon: Gift, text: 'Special offers' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold text-sm">Stay Updated</h3>
                <p className="text-muted-foreground text-xs">Never miss a tournament</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Get instant alerts for:
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                <feature.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-foreground font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 h-10 text-sm"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 h-10 text-sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
