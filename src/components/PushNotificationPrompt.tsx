import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Trophy, Swords, Wallet, Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  initOneSignal, 
  loginOneSignal, 
  requestPushPermission, 
  getPushPermissionStatus 
} from '@/lib/onesignal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const PushNotificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkAndShowPrompt = useCallback(async () => {
    if (!user) return;
    
    // Initialize OneSignal
    await initOneSignal();
    
    // Wait a bit for OneSignal to fully load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check current permission status
    const status = getPushPermissionStatus();
    
    // If permission already granted or denied permanently, don't show
    if (status === 'granted' || status === 'denied') {
      return;
    }
    
    // Show popup after small delay on every login
    setTimeout(() => setShowPrompt(true), 2000);
    
    // Link user to OneSignal
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle();
    
    await loginOneSignal(user.id, profile?.email);
  }, [user]);

  useEffect(() => {
    checkAndShowPrompt();
  }, [checkAndShowPrompt]);

  const handleEnable = async () => {
    setIsLoading(true);
    
    try {
      const granted = await requestPushPermission();
      setShowPrompt(false);
      
      if (granted) {
        toast.success('Notifications enabled', {
          description: 'You will receive tournament and prize alerts.',
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !user) return null;

  const notificationFeatures = [
    { icon: Trophy, text: 'Tournament announcements' },
    { icon: Swords, text: 'Match start reminders' },
    { icon: Wallet, text: 'Prize and withdrawal updates' },
    { icon: Gift, text: 'Special offers and rewards' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-sm">Enable Notifications</h3>
              <p className="text-muted-foreground text-xs">Stay updated with tournaments</p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Get notified about:
          </p>
          
          <div className="space-y-2">
            {notificationFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-foreground">
                <feature.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 text-xs"
              size="sm"
            >
              Not Now
            </Button>
            <Button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 text-xs bg-primary hover:bg-primary/90"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1.5" />
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
