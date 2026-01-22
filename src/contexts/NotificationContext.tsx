import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { initOneSignal, loginOneSignal, logoutOneSignal } from '@/lib/onesignal';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Prize-related notification types that deserve special attention
const PRIZE_NOTIFICATION_TYPES = ['prize_won', 'commission_earned'];
const IMPORTANT_NOTIFICATION_TYPES = [...PRIZE_NOTIFICATION_TYPES, 'tournament_cancelled', 'deposit_approved', 'withdrawal_approved'];
// Broadcast types that should NOT appear in notifications (they have their own channel)
const BROADCAST_NOTIFICATION_TYPES = ['broadcast', 'ai_broadcast'];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Play notification sound for important notifications
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  // Show toast for new notifications
  const showNotificationToast = useCallback((notification: Notification) => {
    const isPrizeNotification = PRIZE_NOTIFICATION_TYPES.includes(notification.type);
    const isImportant = IMPORTANT_NOTIFICATION_TYPES.includes(notification.type);

    if (isImportant) {
      playNotificationSound();
    }

    // Special handling for prize won notifications
    if (isPrizeNotification) {
      toast({
        title: notification.title,
        description: notification.message || 'Check your wallet!',
        duration: 8000,
        className: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50',
      });
    } else if (isImportant) {
      toast({
        title: notification.title,
        description: notification.message || '',
        duration: 5000,
      });
    }
  }, [playNotificationSound]);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      // Filter out broadcast notifications - they belong in Broadcast Channel only
      const filteredData = (data || []).filter(n => !BROADCAST_NOTIFICATION_TYPES.includes(n.type));
      setNotifications(filteredData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize OneSignal and handle user login/logout
  useEffect(() => {
    const setupOneSignal = async () => {
      await initOneSignal();
      
      if (user) {
        // Fetch user email for OneSignal tagging
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        
        await loginOneSignal(user.id, profile?.email);
      } else {
        await logoutOneSignal();
      }
    };

    setupOneSignal();
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscription for new notifications
    if (user) {
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            
            // Skip broadcast notifications - they belong in Broadcast Channel only
            if (BROADCAST_NOTIFICATION_TYPES.includes(newNotification.type)) {
              return;
            }
            
            setNotifications((prev) => [newNotification, ...prev]);
            
            // Show toast notification for new notifications
            showNotificationToast(newNotification);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, showNotificationToast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
