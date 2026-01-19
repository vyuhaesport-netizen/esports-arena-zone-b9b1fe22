import { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, Ban, HeadphonesIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface BanInfo {
  is_banned: boolean;
  ban_type?: string;
  reason?: string;
  expires_at?: string | null;
  is_permanent?: boolean;
  ban_number?: number;
}

interface BanOverlayProps {
  banInfo: BanInfo;
  onBanLifted?: () => void;
}

const BanOverlay = ({ banInfo, onBanLifted }: BanOverlayProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isBanExpired, setIsBanExpired] = useState(false);

  useEffect(() => {
    if (!banInfo.expires_at || banInfo.is_permanent) {
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(banInfo.expires_at!).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setIsBanExpired(true);
        setTimeRemaining(null);
        if (onBanLifted) {
          onBanLifted();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [banInfo.expires_at, banInfo.is_permanent, onBanLifted]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSupport = () => {
    navigate('/help-support');
  };

  const getBanTitle = () => {
    if (banInfo.is_permanent) {
      return 'Account Permanently Terminated';
    }
    if (banInfo.ban_number === 1) {
      return '24-Hour Account Suspension';
    }
    if (banInfo.ban_number === 2) {
      return '7-Day Account Suspension';
    }
    return 'Account Suspended';
  };

  const getBanDescription = () => {
    if (banInfo.is_permanent) {
      return 'Your account has been permanently banned due to repeated violations of our community guidelines. This action is irreversible.';
    }
    if (banInfo.ban_number === 1) {
      return 'This is your first violation. Your account has been suspended for 24 hours. After this period, your access will be restored automatically.';
    }
    if (banInfo.ban_number === 2) {
      return 'This is your second violation. Your account has been suspended for 7 days. A third violation will result in permanent account termination.';
    }
    return 'Your account has been temporarily suspended.';
  };

  const getWarningMessage = () => {
    if (banInfo.is_permanent) {
      return null;
    }
    if (banInfo.ban_number === 1) {
      return '⚠️ Warning: A second violation will result in a 7-day suspension, and a third violation will permanently terminate your account.';
    }
    if (banInfo.ban_number === 2) {
      return '⚠️ Final Warning: A third violation will result in permanent account termination with no possibility of recovery.';
    }
    return null;
  };

  if (isBanExpired && !banInfo.is_permanent) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <Card className="w-full max-w-md mx-4 border-green-500/50 bg-card/95">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/20 border border-green-500/30">
              <Shield className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-400">Ban Period Ended!</CardTitle>
            <CardDescription>
              Your suspension period has ended. Please refresh the page to continue using the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              size="lg"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Blurred background */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl" />
      
      {/* Animated gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-red-900/30 via-black/50 to-orange-900/30 animate-pulse" />
      
      {/* Scrollable content container */}
      <div className="relative min-h-full flex items-start justify-center p-4 py-6">
        {/* Main content */}
        <Card className="relative w-full max-w-lg border-red-500/50 bg-card/95 shadow-2xl shadow-red-500/20 my-auto">
          <CardHeader className="text-center pb-2 pt-4">
            <div className="mx-auto mb-3 p-4 rounded-full bg-red-500/20 border-2 border-red-500/50 animate-pulse">
              {banInfo.is_permanent ? (
                <Ban className="h-10 w-10 md:h-14 md:w-14 text-red-500" />
              ) : (
                <AlertTriangle className="h-10 w-10 md:h-14 md:w-14 text-red-500" />
              )}
            </div>
            <CardTitle className="text-xl md:text-2xl text-red-400 font-bold">
              {getBanTitle()}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-sm md:text-base">
              {getBanDescription()}
            </CardDescription>
          </CardHeader>
        
          <CardContent className="space-y-4 pb-6">
            {/* Ban Reason */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Reason for Suspension
            </h4>
            <p className="text-foreground text-sm">
              {banInfo.reason || 'Violation of community guidelines'}
            </p>
          </div>

            {/* Countdown Timer - only for temporary bans */}
            {!banInfo.is_permanent && timeRemaining && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2 justify-center">
                <Clock className="h-4 w-4" />
                Time Until Access Restored
              </h4>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="text-center">
                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                      <div className="text-lg md:text-2xl font-bold text-primary font-mono">
                        {String(timeRemaining.days).padStart(2, '0')}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Days</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                      <div className="text-lg md:text-2xl font-bold text-primary font-mono">
                        {String(timeRemaining.hours).padStart(2, '0')}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Hours</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                      <div className="text-lg md:text-2xl font-bold text-primary font-mono">
                        {String(timeRemaining.minutes).padStart(2, '0')}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mins</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                      <div className="text-lg md:text-2xl font-bold text-primary font-mono animate-pulse">
                        {String(timeRemaining.seconds).padStart(2, '0')}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Secs</p>
                  </div>
                </div>
              </div>
            )}

            {/* Permanent Ban Message */}
            {banInfo.is_permanent && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <Ban className="h-6 w-6 text-destructive mx-auto mb-1" />
                <p className="text-destructive font-semibold text-base">
                  Your ID is Permanently Banned
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Contact Support to appeal this decision.
                </p>
              </div>
            )}

            {/* Unusual Activity Ban - Can be restored */}
            {!banInfo.is_permanent && banInfo.reason?.toLowerCase().includes('unusual activity') && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-amber-500 font-semibold text-sm">
                  Account Flagged for Unusual Activity
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Go to Support and chat with Vyuha AI to verify your identity and restore access instantly.
                </p>
              </div>
            )}

            {/* Regular temporary ban message */}
            {!banInfo.is_permanent && !banInfo.reason?.toLowerCase().includes('unusual activity') && (
              <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
                <p className="text-muted-foreground text-xs">
                  Your access will be automatically restored after the timer ends.
                </p>
              </div>
            )}

            {/* Warning Message */}
            {getWarningMessage() && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-center">
                <p className="text-yellow-500 text-xs font-medium">
                  {getWarningMessage()}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <Button 
                onClick={handleSupport}
                className="w-full gap-2"
                size="default"
              >
                <HeadphonesIcon className="h-4 w-4" />
                Contact Support
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="w-full gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
                size="default"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* Ban Number Badge */}
            {banInfo.ban_number && !banInfo.is_permanent && (
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium">
                  Violation #{banInfo.ban_number} of 3
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BanOverlay;
