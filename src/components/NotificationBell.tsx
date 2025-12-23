import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Check, Trophy, Users, Megaphone, Gift, Wallet, AlertCircle, ArrowLeft } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import vyuhaLogo from '@/assets/vyuha-logo.png';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    switch (notification.type) {
      case 'new_tournament':
      case 'tournament_created':
        navigate('/');
        setOpen(false);
        break;
      case 'wallet_credit':
      case 'wallet_debit':
      case 'withdrawal_approved':
      case 'withdrawal_rejected':
      case 'deposit_approved':
      case 'deposit_rejected':
        navigate('/wallet');
        setOpen(false);
        break;
      case 'prize_won':
      case 'commission_earned':
      case 'tournament_join':
      case 'tournament_exit':
      case 'tournament_cancelled':
        navigate('/my-match');
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_tournament':
      case 'tournament_created':
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'friend_request':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'group_invite':
      case 'team_invite':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'admin_broadcast':
        return <Megaphone className="h-4 w-4 text-primary" />;
      case 'prize_won':
        return <Gift className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'commission_earned':
        return <Wallet className="h-4 w-4 text-green-500" />;
      case 'wallet_credit':
      case 'wallet_debit':
      case 'withdrawal_approved':
      case 'deposit_approved':
        return <Wallet className="h-4 w-4 text-emerald-500" />;
      case 'withdrawal_rejected':
      case 'deposit_rejected':
      case 'tournament_cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'new_tournament':
      case 'tournament_created':
        return 'bg-amber-500/10';
      case 'friend_request':
        return 'bg-blue-500/10';
      case 'group_invite':
      case 'team_invite':
        return 'bg-purple-500/10';
      case 'admin_broadcast':
        return 'bg-primary/10';
      case 'prize_won':
        return 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20';
      case 'commission_earned':
        return 'bg-green-500/10';
      case 'wallet_credit':
      case 'wallet_debit':
      case 'withdrawal_approved':
      case 'deposit_approved':
        return 'bg-emerald-500/10';
      case 'withdrawal_rejected':
      case 'deposit_rejected':
      case 'tournament_cancelled':
        return 'bg-red-500/10';
      default:
        return 'bg-muted';
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    let key = 'Older';
    if (isToday(date)) key = 'Today';
    else if (isYesterday(date)) key = 'Yesterday';
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

  const groupOrder = ['Today', 'Yesterday', 'Older'];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div>
                <SheetTitle className="text-left">Notifications</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead} 
                className="text-xs hover:bg-primary/10 hover:text-primary"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark all
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Bell className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                When you receive notifications about tournaments, messages, or updates, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="pb-4">
              {groupOrder.map(group => {
                const items = groupedNotifications[group];
                if (!items || items.length === 0) return null;
                
                return (
                  <div key={group}>
                    <div className="px-4 py-2 bg-muted/30 sticky top-0">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {group}
                      </span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {items.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-4 text-left transition-all duration-200 hover:bg-muted/50 active:scale-[0.99] ${
                            !notification.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-full ${getIconBg(notification.type)} flex items-center justify-center flex-shrink-0`}>
                              {notification.type === 'admin_broadcast' ? (
                                <img src={vyuhaLogo} alt="Vyuha" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                getIcon(notification.type)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium line-clamp-1 ${
                                  !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {notification.title}
                                </p>
                                {!notification.is_read && (
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1 shadow-sm shadow-primary/50" />
                                )}
                              </div>
                              {notification.message && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-medium">
                                {formatNotificationTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationBell;