import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Shield, User, Loader2, Zap, Eye, EyeOff, Lock } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email');
const gameUidSchema = z.string().min(1, 'Game UID is required');
const passwordSchema = z.string().min(6, 'Min 6 characters');

const ForgotPassword = () => {
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [email, setEmail] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    gameUid?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const navigate = useNavigate();
  const { toast } = useToast();

  const validateVerifyForm = () => {
    const newErrors: typeof errors = {};
    try { emailSchema.parse(email); } catch { newErrors.email = 'Invalid email'; }
    try { gameUidSchema.parse(gameUid); } catch { newErrors.gameUid = 'Game UID is required'; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetForm = () => {
    const newErrors: typeof errors = {};
    try { passwordSchema.parse(newPassword); } catch { newErrors.newPassword = 'Min 6 characters'; }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateVerifyForm()) return;

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id, email, game_uid')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error || !profile) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this email.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      if (!profile.game_uid || profile.game_uid.toLowerCase() !== gameUid.toLowerCase().trim()) {
        toast({
          title: 'Verification Failed',
          description: 'The Game UID does not match our records.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      setVerifiedUserId(profile.user_id);
      setStep('reset');
      toast({
        title: 'Verification Successful!',
        description: 'Now set your new password.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Verification failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateResetForm() || !verifiedUserId) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-password', {
        body: { userId: verifiedUserId, newPassword }
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Successful!',
        description: 'Redirecting to login...',
      });

      setTimeout(() => navigate('/'), 1500);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reset password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-[100px] bg-primary/5" />
        <div className="absolute top-1/2 -right-32 w-[350px] h-[350px] rounded-full blur-[100px] bg-muted/10" />
        <div className="absolute -bottom-20 left-1/3 w-[300px] h-[300px] rounded-full blur-[100px] bg-primary/3" />
        
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="w-full max-w-[380px] relative z-10">
        <div className="bg-card border border-border text-card-foreground overflow-y-auto rounded-xl p-6">
          {/* Back Button */}
          <button 
            onClick={() => step === 'reset' ? setStep('verify') : navigate('/')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 'reset' ? 'Back to verify' : 'Back to login'}
          </button>

          {/* Title */}
          <h2 className="text-xl font-semibold tracking-tight mb-1 text-foreground">
            {step === 'verify' ? 'Verify Identity' : 'Set New Password'}
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            {step === 'verify' ? 'Confirm your email and Game UID' : 'Create a new secure password'}
          </p>

          {step === 'verify' ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <span className="text-sm">@</span>
                  </div>
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                    placeholder="Enter your email"
                    className={`h-10 pl-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.email ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Game UID</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <Input 
                    value={gameUid}
                    onChange={(e) => { setGameUid(e.target.value); setErrors(p => ({...p, gameUid: undefined})); }}
                    placeholder="Enter your Game UID"
                    className={`h-10 pl-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.gameUid ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.gameUid && <p className="text-[10px] text-destructive">{errors.gameUid}</p>}
                <p className="text-[10px] text-muted-foreground">Enter the Game UID from your profile</p>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Verify Identity
                    <Shield className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">New Password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setErrors(p => ({...p, newPassword: undefined})); }}
                    placeholder="Enter new password"
                    className={`h-10 pl-10 pr-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.newPassword ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-[10px] text-destructive">{errors.newPassword}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Confirm Password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({...p, confirmPassword: undefined})); }}
                    placeholder="Confirm new password"
                    className={`h-10 pl-10 pr-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[10px] text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Reset Password
                    <Zap className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Back to login */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            Remember your password? <button type="button" onClick={() => navigate('/')} className="text-primary hover:underline font-medium">Login</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
