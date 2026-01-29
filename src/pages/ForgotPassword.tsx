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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-[80px] bg-indigo-600/20" />
        <div className="absolute top-1/2 -right-32 w-[350px] h-[350px] rounded-full blur-[80px] bg-purple-600/15" />
        <div className="absolute -bottom-20 left-1/3 w-[300px] h-[300px] rounded-full blur-[80px] bg-cyan-600/15" />
        
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="w-full max-w-[380px] relative z-10">
        <div 
          className="bg-[#0d0d0d] border border-[#1a1a1a] text-white overflow-y-auto relative"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[#00ff00]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-[#00ff00]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[#00ff00]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[#00ff00]" />

          <div className="p-6">
            {/* Back Button */}
            <button 
              onClick={() => step === 'reset' ? setStep('verify') : navigate('/')}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white mb-4 tracking-wider"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 'reset' ? 'BACK_TO_VERIFY' : 'BACK_TO_LOGIN'}
            </button>

            {/* Status Badge */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1.5 bg-[#00ff00] text-black text-[11px] font-bold tracking-[0.15em] uppercase">
                {step === 'verify' ? 'IDENTITY_VERIFICATION' : 'PASSWORD_RESET'}
              </span>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {step === 'verify' ? (
                <>VERIFY <span className="text-[#00ff00]">IDENTITY</span></>
              ) : (
                <>SET NEW <span className="text-[#00ff00]">PASSWORD</span></>
              )}
            </h2>
            <p className="text-[11px] text-gray-500 tracking-[0.2em] uppercase mb-6" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {step === 'verify' ? 'CONFIRM YOUR EMAIL AND GAME UID' : 'CREATE A NEW SECURE PASSWORD'}
            </p>

            {step === 'verify' ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/80 tracking-[0.15em] uppercase font-medium" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    EMAIL
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <span className="text-sm">@</span>
                    </div>
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                      placeholder="Enter your email"
                      className={`h-11 pl-10 text-sm bg-[#0a0a0a] border-[#222] text-white placeholder:text-gray-600 focus:border-[#00ff00] focus:ring-0 rounded-sm ${errors.email ? 'border-red-500' : ''}`}
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-500 tracking-wider">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/80 tracking-[0.15em] uppercase font-medium" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    GAME_UID
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <User className="h-4 w-4" />
                    </div>
                    <Input 
                      value={gameUid}
                      onChange={(e) => { setGameUid(e.target.value); setErrors(p => ({...p, gameUid: undefined})); }}
                      placeholder="Enter your Game UID"
                      className={`h-11 pl-10 text-sm bg-[#0a0a0a] border-[#222] text-white placeholder:text-gray-600 focus:border-[#00ff00] focus:ring-0 rounded-sm ${errors.gameUid ? 'border-red-500' : ''}`}
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    />
                  </div>
                  {errors.gameUid && <p className="text-[10px] text-red-500 tracking-wider">{errors.gameUid}</p>}
                  <p className="text-[10px] text-gray-500 tracking-wider">Enter the Game UID from your profile</p>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 text-sm bg-[#00ff00] hover:bg-[#00dd00] text-black font-bold tracking-[0.15em] uppercase rounded-sm border-0"
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      VERIFY_IDENTITY
                      <Shield className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/80 tracking-[0.15em] uppercase font-medium" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    NEW_PASSWORD
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setErrors(p => ({...p, newPassword: undefined})); }}
                      placeholder="Enter new password"
                      className={`h-11 pl-10 pr-10 text-sm bg-[#0a0a0a] border-[#222] text-white placeholder:text-gray-600 focus:border-[#00ff00] focus:ring-0 rounded-sm ${errors.newPassword ? 'border-red-500' : ''}`}
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-[10px] text-red-500 tracking-wider">{errors.newPassword}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/80 tracking-[0.15em] uppercase font-medium" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    CONFIRM_PASSWORD
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({...p, confirmPassword: undefined})); }}
                      placeholder="Confirm new password"
                      className={`h-11 pl-10 pr-10 text-sm bg-[#0a0a0a] border-[#222] text-white placeholder:text-gray-600 focus:border-[#00ff00] focus:ring-0 rounded-sm ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-[10px] text-red-500 tracking-wider">{errors.confirmPassword}</p>}
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 text-sm bg-[#00ff00] hover:bg-[#00dd00] text-black font-bold tracking-[0.15em] uppercase rounded-sm border-0"
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      RESET_PASSWORD
                      <Zap className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Back to login */}
            <p className="text-center text-[11px] text-gray-400 tracking-wider pt-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Remember your password? <button type="button" onClick={() => navigate('/')} className="text-[#00ff00] hover:underline font-semibold">Login</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
