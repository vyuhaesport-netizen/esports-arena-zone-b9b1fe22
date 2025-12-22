import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9]+$/, 'Username must contain only lowercase letters and numbers');
const fullNameSchema = z.string().min(2, 'Full name is required');
const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .regex(/^[0-9]+$/, 'Phone number must contain only digits');

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    terms?: string;
    gameUid?: string;
    username?: string;
    fullName?: string;
    phone?: string;
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
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || isLogin) return;
    
    const timer = setTimeout(async () => {
      try {
        usernameSchema.parse(username);
        setCheckingUsername(true);
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        
        if (data) {
          setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
        } else {
          setErrors(prev => ({ ...prev, username: undefined }));
        }
      } catch (e) {
        if (e instanceof z.ZodError) {
          setErrors(prev => ({ ...prev, username: e.errors[0].message }));
        }
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, isLogin]);

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
      username?: string;
      fullName?: string;
      phone?: string;
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
    
    // Signup-specific validations
    if (!isLogin && !isForgotPassword) {
      try {
        usernameSchema.parse(username);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.username = e.errors[0].message;
        }
      }
      
      try {
        fullNameSchema.parse(fullName.trim());
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.fullName = e.errors[0].message;
        }
      }
      
      try {
        phoneSchema.parse(phone);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.phone = e.errors[0].message;
        }
      }
      
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
        // Check username availability one more time before signup
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        
        if (existingUser) {
          toast({
            title: 'Username Taken',
            description: 'This username is already taken. Please choose another.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

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
          // Update the profile with additional fields
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              username: username.toLowerCase(),
              full_name: fullName.trim(),
              phone: phone
            })
            .eq('user_id', authData.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
          
          toast({
            title: 'Account Created!',
            description: 'Welcome to Vyuha Esport!'
          });
          navigate('/home');
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

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 border-gray-300">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-scale-in">
            <button 
              onClick={() => setIsForgotPassword(false)} 
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <img src={vyuhaLogo} alt="Vyuha Esport" className="h-20 w-20 rounded-full object-cover mb-4 border-slate-400" />
              <h1 className="text-center mb-2 text-slate-950 font-semibold text-xl">Reset Password</h1>
              <p className="text-center text-sm text-gray-600">Verify your identity to reset password</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700">Email address</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }} 
                  className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.email ? 'border-red-500' : ''}`} 
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-uid" className="text-sm font-medium text-gray-700">Game UID</Label>
                <Input 
                  id="game-uid" 
                  type="text" 
                  placeholder="Enter your Game UID" 
                  value={gameUid} 
                  onChange={e => {
                    setGameUid(e.target.value);
                    setErrors(prev => ({ ...prev, gameUid: undefined }));
                  }} 
                  className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.gameUid ? 'border-red-500' : ''}`} 
                />
                {errors.gameUid && <p className="text-red-500 text-xs">{errors.gameUid}</p>}
                <p className="text-xs text-gray-500">Enter the Game UID from your profile</p>
              </div>

              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={loading} 
                className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 border-gray-300">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-scale-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src={vyuhaLogo} alt="Vyuha Esport" className="h-20 w-20 rounded-full object-cover mb-4 border-slate-400" />
            <h1 className="text-center mb-8 text-slate-950 font-normal text-base">
              {isLogin ? 'eSports Journey start here' : 'Create Your Account'}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => {
              setEmail(e.target.value);
              setErrors(prev => ({
                ...prev,
                email: undefined
              }));
            }} className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.email ? 'border-red-500' : ''}`} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => {
                setPassword(e.target.value);
                setErrors(prev => ({
                  ...prev,
                  password: undefined
                }));
              }} className={`border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.password ? 'border-red-500' : ''}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
            </div>

            {/* Signup-only fields */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Username
                  </Label>
                  <div className="relative">
                    <Input 
                      id="username" 
                      type="text" 
                      placeholder="yourname123" 
                      value={username} 
                      onChange={e => {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }} 
                      className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.username ? 'border-red-500' : ''}`} 
                    />
                    {checkingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}
                  <p className="text-xs text-gray-500">Only lowercase letters and numbers</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <Input 
                    id="fullName" 
                    type="text" 
                    placeholder="Your Full Name" 
                    value={fullName} 
                    onChange={e => {
                      setFullName(e.target.value);
                      setErrors(prev => ({ ...prev, fullName: undefined }));
                    }} 
                    className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.fullName ? 'border-red-500' : ''}`} 
                  />
                  {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="9876543210" 
                    value={phone} 
                    onChange={e => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setPhone(value);
                      setErrors(prev => ({ ...prev, phone: undefined }));
                    }} 
                    className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phone ? 'border-red-500' : ''}`} 
                  />
                  {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                </div>

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
                    <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                      I agree to the{' '}
                      <Link to="/terms" className="text-orange-600 hover:underline">
                        Terms & Conditions
                      </Link>
                      ,{' '}
                      <Link to="/refund-policy" className="text-orange-600 hover:underline">
                        Refund Policy
                      </Link>
                      {' '}and{' '}
                      <Link to="/about" className="text-orange-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}
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
          <p className="text-center text-sm text-gray-600 mt-6">
            {isLogin ? <>
                Don't have an account?{' '}
                <button onClick={() => setIsLogin(false)} className="text-orange-600 font-semibold hover:underline">
                  Sign Up
                </button>
              </> : <>
                Already have an account?{' '}
                <button onClick={() => setIsLogin(true)} className="text-orange-600 font-semibold hover:underline">
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