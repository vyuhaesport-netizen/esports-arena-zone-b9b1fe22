import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Eye, EyeOff, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const getPasswordStrength = (password: string): { level: 'weak' | 'medium' | 'strong'; score: number } => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { level: 'weak', score };
  if (score <= 3) return { level: 'medium', score };
  return { level: 'strong', score };
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user came from forgot password verification
    const resetUserId = localStorage.getItem('password_reset_user_id');
    const verified = localStorage.getItem('password_reset_verified');

    if (!resetUserId || verified !== 'true') {
      toast({
        title: 'Access Denied',
        description: 'Please verify your identity first.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    setUserId(resetUserId);
  }, [navigate, toast]);

  const validateForm = () => {
    const newErrors: {
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    try {
      passwordSchema.parse(newPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.newPassword = e.errors[0].message;
      }
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm() || !userId) return;

    setLoading(true);
    try {
      // Use admin API to update user password (via edge function)
      const { error } = await supabase.functions.invoke('update-user-password', {
        body: { userId, newPassword }
      });

      if (error) throw error;

      // Clear reset tokens
      localStorage.removeItem('password_reset_user_id');
      localStorage.removeItem('password_reset_verified');

      toast({
        title: 'Password Changed!',
        description: 'Your password has been updated successfully.',
      });

      navigate('/home');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-scale-in">
          <button 
            onClick={() => {
              localStorage.removeItem('password_reset_user_id');
              localStorage.removeItem('password_reset_verified');
              navigate('/auth');
            }} 
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
          </button>
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Lock className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-center mb-2 text-slate-950 font-semibold text-xl">Set New Password</h1>
            <p className="text-center text-sm text-gray-600">Create a strong password for your account</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">New Password</Label>
              <div className="relative">
                <Input 
                  id="new-password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  value={newPassword} 
                  onChange={e => {
                    setNewPassword(e.target.value);
                    setErrors(prev => ({ ...prev, newPassword: undefined }));
                  }} 
                  className={`border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.newPassword ? 'border-red-500' : ''}`} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= getPasswordStrength(newPassword).score
                            ? getPasswordStrength(newPassword).level === 'weak'
                              ? 'bg-red-500'
                              : getPasswordStrength(newPassword).level === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    getPasswordStrength(newPassword).level === 'weak'
                      ? 'text-red-500'
                      : getPasswordStrength(newPassword).level === 'medium'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}>
                    Password strength: {getPasswordStrength(newPassword).level}
                  </p>
                </div>
              )}
              {errors.newPassword && <p className="text-red-500 text-xs">{errors.newPassword}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }} 
                className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.confirmPassword ? 'border-red-500' : ''}`} 
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
            </div>

            <button 
              type="button"
              onClick={handleChangePassword}
              disabled={loading} 
              className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;