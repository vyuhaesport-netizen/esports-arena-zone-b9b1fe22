import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Eye, EyeOff, Loader2, ArrowLeft, Wrench, Clock } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface MaintenanceState {
  isEnabled: boolean;
  message: string;
  endTime: string;
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    isEnabled: false,
    message: '',
    endTime: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    terms?: string;
    gameUid?: string;
  }>({});
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  useEffect(() => {
    checkMaintenanceMode();
  }, []);

  useEffect(() => {
    if (user && !maintenance.isEnabled) {
      navigate('/home');
    }
  }, [user, navigate, maintenance.isEnabled]);

  const checkMaintenanceMode = async () => {
    try {
      // Check for bypass token in URL
      const bypassToken = searchParams.get('bypass');
      
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['maintenance_mode', 'maintenance_message', 'maintenance_end_time', 'maintenance_bypass_token']);

      const maintenanceData: MaintenanceState = {
        isEnabled: false,
        message: 'We are currently performing scheduled maintenance. Please check back soon!',
        endTime: '',
      };

      let storedBypassToken = '';

      data?.forEach((s) => {
        if (s.setting_key === 'maintenance_mode') {
          maintenanceData.isEnabled = s.setting_value === 'true';
        }
        if (s.setting_key === 'maintenance_message' && s.setting_value) {
          maintenanceData.message = s.setting_value;
        }
        if (s.setting_key === 'maintenance_end_time' && s.setting_value) {
          maintenanceData.endTime = s.setting_value;
        }
        if (s.setting_key === 'maintenance_bypass_token' && s.setting_value) {
          storedBypassToken = s.setting_value;
        }
      });

      // If bypass token matches, disable maintenance for this session
      if (bypassToken && storedBypassToken && bypassToken === storedBypassToken) {
        maintenanceData.isEnabled = false;
        // Store bypass in sessionStorage so it persists during navigation
        sessionStorage.setItem('maintenance_bypass', 'true');
      }
      
      // Check if already bypassed in this session
      if (sessionStorage.getItem('maintenance_bypass') === 'true') {
        maintenanceData.isEnabled = false;
      }

      setMaintenance(maintenanceData);
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    } finally {
      setCheckingMaintenance(false);
    }
  };


  const getErrorMessage = (error: Error): string => {
    if (error.message === 'Failed to fetch') {
      return 'Unable to connect to server. Please check your internet connection and try again.';
    }
    if (error.message === 'Invalid login credentials') {
      return 'Invalid email or password. Please try again.';
    }
    return error.message;
  };

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      terms?: string;
      gameUid?: string;
    } = {};
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    if (!isForgotPassword) {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }
    
    // Signup-specific validations - only terms acceptance
    if (!isLogin && !isForgotPassword) {
      if (!acceptedTerms) {
        newErrors.terms = 'You must accept the Terms & Conditions';
      }
    }
    
    if (isForgotPassword && !gameUid.trim()) {
      newErrors.gameUid = 'Game UID is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Verify email and game_uid match from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, game_uid')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (profileError || !profile) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this email.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Check if game_uid matches
      if (!profile.game_uid || profile.game_uid.toLowerCase() !== gameUid.toLowerCase().trim()) {
        toast({
          title: 'Verification Failed',
          description: 'The Game UID does not match our records.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Sign in the user with a temporary session to allow password change
      // Store verified user info and redirect to profile settings
      localStorage.setItem('password_reset_user_id', profile.user_id);
      localStorage.setItem('password_reset_verified', 'true');
      
      toast({
        title: 'Verification Successful!',
        description: 'Redirecting to change your password...',
      });
      
      // Redirect to a password change page
      navigate('/change-password');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const errorMessage = getErrorMessage(error);
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive'
          });
        } else {
          navigate('/home');
        }
      } else {
        const { data: authData, error } = await signUp(email, password);
        if (error) {
          const errorMessage = getErrorMessage(error);
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account Exists',
              description: 'This email is already registered. Please login instead.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Sign Up Failed',
              description: errorMessage,
              variant: 'destructive'
            });
          }
        } else if (authData?.user) {
          toast({
            title: 'Account Created!',
            description: 'Please complete your gaming profile.'
          });
          // Redirect to complete-profile after signup
          navigate('/complete-profile');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error && err.message === 'Failed to fetch'
        ? 'Unable to connect to server. Please check your internet connection and try again.'
        : 'An unexpected error occurred. Please try again.';
      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Maintenance Mode View
  if (maintenance.isEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
            {/* Logo */}
            <img 
              src={vyuhaLogo} 
              alt="Vyuha Esport" 
              className="h-24 w-24 rounded-full object-cover mx-auto mb-6 border-4 border-orange-500/30" 
            />
            
            {/* Maintenance Icon */}
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wrench className="h-10 w-10 text-orange-500 animate-pulse" />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">Under Maintenance</h1>
            <p className="text-gray-400 mb-6 text-sm">{maintenance.message}</p>
            
            {/* Estimated Time */}
            {maintenance.endTime && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-orange-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Estimated Return</span>
                </div>
                <p className="text-white font-semibold">
                  {new Date(maintenance.endTime).toLocaleString()}
                </p>
              </div>
            )}
            
            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Maintenance in progress</span>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-colors text-sm font-medium"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 p-4 relative overflow-hidden">
        {/* Background Gaming Stickers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-8 text-4xl opacity-20 animate-float" style={{ animationDelay: '0s' }}>🎮</div>
          <div className="absolute top-20 right-12 text-3xl opacity-15 animate-float" style={{ animationDelay: '0.5s' }}>🕹️</div>
          <div className="absolute bottom-32 left-6 text-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>🎯</div>
          <div className="absolute bottom-20 right-8 text-4xl opacity-15 animate-float" style={{ animationDelay: '1.5s' }}>🏆</div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 animate-scale-in border border-border/50">
            <button 
              onClick={() => setIsForgotPassword(false)} 
              className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150" />
                <img src={vyuhaLogo} alt="Vyuha Esport" className="h-24 w-24 rounded-full object-cover mb-4 border-4 border-primary/30 shadow-xl relative z-10" />
              </div>
              <h1 className="text-center mb-2 text-foreground font-semibold text-xl">Reset Password</h1>
              <p className="text-center text-sm text-muted-foreground">Verify your identity to reset password</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">Email address</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }} 
                  className={`bg-background/50 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${errors.email ? 'border-destructive' : ''}`} 
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-uid" className="text-sm font-medium text-foreground">Game UID</Label>
                <Input 
                  id="game-uid" 
                  type="text" 
                  placeholder="Enter your Game UID" 
                  value={gameUid} 
                  onChange={e => {
                    setGameUid(e.target.value);
                    setErrors(prev => ({ ...prev, gameUid: undefined }));
                  }} 
                  className={`bg-background/50 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${errors.gameUid ? 'border-destructive' : ''}`} 
                />
                {errors.gameUid && <p className="text-destructive text-xs">{errors.gameUid}</p>}
                <p className="text-xs text-muted-foreground">Enter the Game UID from your profile</p>
              </div>

              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={loading} 
                className="w-full bg-gradient-to-r from-primary to-gaming-purple text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : 'Verify & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 p-4 relative overflow-hidden">
      {/* Background Gaming Stickers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Controller icons */}
        <div className="absolute top-10 left-8 text-4xl opacity-20 animate-float" style={{ animationDelay: '0s' }}>🎮</div>
        <div className="absolute top-20 right-12 text-3xl opacity-15 animate-float" style={{ animationDelay: '0.5s' }}>🕹️</div>
        <div className="absolute bottom-32 left-6 text-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>🎯</div>
        <div className="absolute bottom-20 right-8 text-4xl opacity-15 animate-float" style={{ animationDelay: '1.5s' }}>🏆</div>
        <div className="absolute top-1/3 left-4 text-2xl opacity-15 animate-float" style={{ animationDelay: '2s' }}>⭐</div>
        <div className="absolute top-1/2 right-6 text-2xl opacity-20 animate-float" style={{ animationDelay: '0.3s' }}>🎲</div>
        <div className="absolute bottom-1/3 left-12 text-3xl opacity-15 animate-float" style={{ animationDelay: '0.8s' }}>👾</div>
        <div className="absolute top-16 left-1/3 text-2xl opacity-15 animate-float" style={{ animationDelay: '1.2s' }}>🔥</div>
        <div className="absolute bottom-24 right-1/4 text-2xl opacity-20 animate-float" style={{ animationDelay: '0.7s' }}>💎</div>
        <div className="absolute top-2/3 right-1/3 text-3xl opacity-15 animate-float" style={{ animationDelay: '1.8s' }}>🎪</div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 animate-scale-in border border-border/50">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150" />
              <img src={vyuhaLogo} alt="Vyuha Esport" className="h-28 w-28 rounded-full object-cover mb-4 border-4 border-primary/30 shadow-xl relative z-10" />
            </div>
            <h1 className="text-center mb-6 text-foreground font-semibold text-lg mt-2">
              {isLogin ? 'Your Gaming Journey Starts Here' : 'Create Your Account'}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => {
              setEmail(e.target.value);
              setErrors(prev => ({
                ...prev,
                email: undefined
              }));
            }} className={`bg-background/50 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${errors.email ? 'border-destructive' : ''}`} />
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => {
                setPassword(e.target.value);
                setErrors(prev => ({
                  ...prev,
                  password: undefined
                }));
              }} className={`bg-background/50 border-border rounded-lg pr-10 focus:ring-2 focus:ring-primary focus:border-primary ${errors.password ? 'border-destructive' : ''}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
            </div>

            {/* Signup-only fields - just terms */}
            {!isLogin && (
              <>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms} 
                      onCheckedChange={checked => {
                        setAcceptedTerms(checked as boolean);
                        setErrors(prev => ({ ...prev, terms: undefined }));
                      }} 
                      className="mt-0.5" 
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        Terms & Conditions
                      </Link>
                      ,{' '}
                      <Link to="/refund-policy" className="text-primary hover:underline">
                        Refund Policy
                      </Link>
                      {' '}and{' '}
                      <Link to="/about" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  {errors.terms && <p className="text-destructive text-xs">{errors.terms}</p>}
                </div>
              </>
            )}

            {/* Forgot Password - Login Only */}
            {isLogin && (
              <div className="text-right">
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-orange-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              {loading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Logging in...' : 'Creating account...'}
                </> : isLogin ? 'Log in' : 'Sign Up'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? <>
                Don't have an account?{' '}
                <button onClick={() => setIsLogin(false)} className="text-primary font-semibold hover:underline">
                  Sign Up
                </button>
              </> : <>
                Already have an account?{' '}
                <button onClick={() => setIsLogin(true)} className="text-primary font-semibold hover:underline">
                  Log in
                </button>
              </>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;