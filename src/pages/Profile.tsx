import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  Edit2, 
  Save, 
  X, 
  Trophy, 
  Calendar,
  Loader2,
  Shield,
  Gamepad2
} from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
}

interface Registration {
  id: string;
  tournament_id: string;
  team_name: string | null;
  status: string | null;
  registered_at: string;
  tournaments: {
    title: string;
    game: string;
    start_date: string;
    status: string | null;
  };
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone: '',
    bio: '',
  });

  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRegistrations();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setFormData({
          username: data.username || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          bio: data.bio || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          tournament_id,
          team_name,
          status,
          registered_at,
          tournaments (
            title,
            game,
            start_date,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data as unknown as Registration[] || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username || null,
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Registration Cancelled',
        description: 'Your tournament registration has been cancelled.',
      });
      
      fetchRegistrations();
    } catch (error) {
      console.error('Error cancelling registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel registration. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-gaming">
                {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-gaming text-2xl font-bold">
                  {profile?.full_name || profile?.username || 'Gamer'}
                </h1>
                {isAdmin && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Mail className="h-4 w-4" />
                <span>{profile?.email}</span>
              </div>

              {profile?.username && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>@{profile.username}</span>
                </div>
              )}
            </div>

            <Button
              variant={editing ? 'secondary' : 'gaming-outline'}
              onClick={() => setEditing(!editing)}
            >
              {editing ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="font-gaming">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="font-gaming">
              <Trophy className="mr-2 h-4 w-4" />
              My Tournaments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!editing}
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!editing}
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editing}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editing}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                {editing && (
                  <Button
                    variant="gaming"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full md:w-auto"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tournaments">
            <div className="bg-card rounded-xl border border-border p-6">
              {registrations.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-gaming text-xl font-semibold mb-2">No Registrations</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't registered for any tournaments yet.
                  </p>
                  <Button variant="gaming" onClick={() => navigate('/tournaments')}>
                    Browse Tournaments
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Gamepad2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{reg.tournaments.title}</h4>
                          <p className="text-sm text-muted-foreground">{reg.tournaments.game}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(reg.tournaments.start_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            reg.tournaments.status === 'upcoming'
                              ? 'bg-primary/10 text-primary'
                              : reg.tournaments.status === 'ongoing'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {reg.tournaments.status}
                        </Badge>
                        
                        {reg.tournaments.status === 'upcoming' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRegistration(reg.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
