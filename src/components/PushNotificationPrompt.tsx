import React, { useEffect, useState } from 'react';
import { Bell, X, Sparkles } from 'lucide-react';
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

const PUSH_PROMPT_KEY = 'push_notification_prompted';

export const PushNotificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAndShowPrompt = async () => {
      if (!user) return;
      
      // Check if already prompted
      const alreadyPrompted = localStorage.getItem(PUSH_PROMPT_KEY);
      if (alreadyPrompted) return;
      
      // Initialize OneSignal
      await initOneSignal();
      
      // Wait a bit for OneSignal to fully load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check current permission status
      const status = getPushPermissionStatus();
      
      // Only show if permission is 'default' (not yet asked)
      if (status === 'default') {
        // Small delay before showing popup
        setTimeout(() => setShowPrompt(true), 2000);
      }
      
      // Link user to OneSignal
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      await loginOneSignal(user.id, profile?.email);
    };

    checkAndShowPrompt();
  }, [user]);

  const handleEnable = async () => {
    setIsLoading(true);
    
    try {
      const granted = await requestPushPermission();
      
      localStorage.setItem(PUSH_PROMPT_KEY, 'true');
      setShowPrompt(false);
      
      if (granted) {
        toast.success('🎉 Notifications enabled!', {
          description: 'You will get tournament & prize alerts.',
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PUSH_PROMPT_KEY, 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm max-h-[80vh] overflow-hidden bg-card border border-border rounded-2xl shadow-2xl animate-scale-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary via-orange-500 to-yellow-500 p-4 relative">
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-bold text-lg">Stay Updated!</h3>
                <Sparkles className="h-4 w-4 text-yellow-200" />
              </div>
              <p className="text-white/80 text-sm">Never miss a tournament</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-96px)]">
          <div className="space-y-2">
            <p className="text-foreground text-sm font-medium">Get notified for:</p>
            <ul className="space-y-1.5 text-muted-foreground text-sm">
              <li className="flex items-center gap-2">
                <span className="text-primary">🏆</span> New tournament announcements
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">⚔️</span> Match start reminders
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">💰</span> Prize & withdrawal updates
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">🎁</span> Special offers & giveaways
              </li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
              size="sm"
            >
              Not Now
            </Button>
            <Button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 text-white font-semibold"
              size="sm"
            >
              {isLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-1.5" />
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
