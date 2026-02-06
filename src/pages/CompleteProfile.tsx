import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CompleteProfile = () => {
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    preferred_game: '',
    in_game_name: '',
    game_uid: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    checkExistingProfile();
  }, [user, navigate]);

  const checkExistingProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, phone, preferred_game, in_game_name, game_uid')
        .eq('user_id', user.id)
        .single();

      // If profile is already complete (has required gaming fields), redirect to home
      if (profile?.username && profile?.preferred_game && 
          profile?.in_game_name && profile?.game_uid) {
        navigate('/home');
        return;
      }

      // Pre-fill existing data
      if (profile) {
        setFormData({
          username: profile.username || '',
          preferred_game: profile.preferred_game || '',
          in_game_name: profile.in_game_name || '',
          game_uid: profile.game_uid || '',
        });
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setCheckingProfile(false);
    }
  };

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3 || !/^[a-z0-9]+$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('user_id', user?.id || '')
        .maybeSingle();

      setUsernameAvailable(!existingUser);
      if (existingUser) {
        setErrors(prev => ({ ...prev, username: 'This username is already taken' }));
      } else {
        setErrors(prev => ({ ...prev, username: '' }));
      }
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setCheckingUsername(false);
    }
  }, [user?.id]);

  // Debounce effect for username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username.length >= 3) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, checkUsernameAvailability]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Username must contain only lowercase letters and numbers';
    } else if (usernameAvailable === false) {
      newErrors.username = 'This username is already taken';
    }
    if (!formData.preferred_game) {
      newErrors.preferred_game = 'Please select your primary game';
    }
    if (!formData.in_game_name.trim()) {
      newErrors.in_game_name = 'In-game name is required';
    }
    if (!formData.game_uid.trim()) {
      newErrors.game_uid = 'Game UID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    // Double-check username availability before submit
    if (usernameAvailable === false || checkingUsername) {
      setErrors(prev => ({ ...prev, username: 'This username is already taken' }));
      return;
    }

    setLoading(true);
    try {
      // Use upsert so the profile can be created if it doesn't exist yet.
      if (!user.email) throw new Error('Missing user email');

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            email: user.email.toLowerCase().trim(),
            username: formData.username.toLowerCase().trim(),
            preferred_game: formData.preferred_game,
            in_game_name: formData.in_game_name.trim(),
            game_uid: formData.game_uid.trim(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      toast({ title: 'Profile Complete!', description: 'Welcome to Vyuha Esport!' });
      navigate('/home');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Failed to save profile. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <img src={vyuhaLogo} alt="Vyuha Esport" className="h-16 w-16 rounded-full object-cover mb-3 ring-2 ring-primary/30" />
            <h1 className="text-xl font-bold text-foreground">Complete Your Profile</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Please fill in all details to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                Username <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
                    setFormData({ ...formData, username: value });
                    setUsernameAvailable(null);
                    if (value.length < 3) {
                      setErrors({ ...errors, username: value.length > 0 ? 'Username must be at least 3 characters' : '' });
                    } else {
                      setErrors({ ...errors, username: '' });
                    }
                  }}
                  placeholder="Choose a unique username"
                  className={`pr-10 bg-background ${errors.username ? 'border-destructive' : usernameAvailable === true ? 'border-green-500' : 'border-border'}`}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!checkingUsername && usernameAvailable === true && formData.username.length >= 3 && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              {errors.username && <p className="text-destructive text-xs">{errors.username}</p>}
              {!errors.username && usernameAvailable === true && formData.username.length >= 3 && (
                <p className="text-success text-xs">Username is available!</p>
              )}
              <p className="text-xs text-muted-foreground">3-20 characters, lowercase letters and numbers only</p>
            </div>

            {/* Primary Game */}
            <div className="space-y-1.5">
              <Label htmlFor="preferred_game" className="text-sm font-medium text-foreground">
                Primary Game <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.preferred_game}
                onValueChange={(value) => {
                  setFormData({ ...formData, preferred_game: value });
                  setErrors({ ...errors, preferred_game: '' });
                }}
              >
                <SelectTrigger className={`bg-background ${errors.preferred_game ? 'border-destructive' : 'border-border'}`}>
                  <SelectValue placeholder="Select your main game" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="BGMI">BGMI</SelectItem>
                  <SelectItem value="Free Fire">Free Fire</SelectItem>
                </SelectContent>
              </Select>
              {errors.preferred_game && <p className="text-destructive text-xs">{errors.preferred_game}</p>}
            </div>

            {/* In-Game Name */}
            <div className="space-y-1.5">
              <Label htmlFor="in_game_name" className="text-sm font-medium text-foreground">
                In-Game Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="in_game_name"
                value={formData.in_game_name}
                onChange={(e) => {
                  setFormData({ ...formData, in_game_name: e.target.value });
                  setErrors({ ...errors, in_game_name: '' });
                }}
                placeholder="Your name in the game"
                className={`bg-background ${errors.in_game_name ? 'border-destructive' : 'border-border'}`}
              />
              {errors.in_game_name && <p className="text-destructive text-xs">{errors.in_game_name}</p>}
            </div>

            {/* Game UID */}
            <div className="space-y-1.5">
              <Label htmlFor="game_uid" className="text-sm font-medium text-foreground">
                Game UID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="game_uid"
                value={formData.game_uid}
                onChange={(e) => {
                  setFormData({ ...formData, game_uid: e.target.value });
                  setErrors({ ...errors, game_uid: '' });
                }}
                placeholder="Your unique game ID"
                className={`bg-background ${errors.game_uid ? 'border-destructive' : 'border-border'}`}
              />
              {errors.game_uid && <p className="text-destructive text-xs">{errors.game_uid}</p>}
              <p className="text-xs text-muted-foreground">This is used for account recovery</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
