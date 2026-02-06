import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Percent,
  Save,
  CreditCard,
  QrCode,
  Upload,
  Check,
  MessageCircle,
  Instagram,
  FileText,
  Youtube,
  Globe,
  Wrench,
  AlertTriangle,
  Link,
  Copy,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  Trophy
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface CommissionSettings {
  organizer_commission_percent: string;
  platform_commission_percent: string;
  prize_pool_percent: string;
  local_tournament_organizer_commission: string;
}

interface PaymentSettings {
  admin_upi_id: string;
  payment_qr_url: string;
}

interface OwnerContactSettings {
  owner_whatsapp: string;
  owner_instagram: string;
  owner_contact_note: string;
}

interface SocialSettings {
  social_discord: string;
  social_instagram: string;
  social_youtube: string;
}

interface MaintenanceSettings {
  maintenance_mode: string;
  maintenance_message: string;
  maintenance_bypass_token: string;
}

interface WithdrawalSettings {
  min_deposit_amount: string;
  max_withdrawal_per_day: string;
  withdrawal_fee_threshold: string;
  withdrawal_fee_percent: string;
}

interface AuthSettings {
  google_auth_enabled: string;
}

interface TournamentLimitSettings {
  tournament_creation_limit: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<CommissionSettings>({
    organizer_commission_percent: '10',
    platform_commission_percent: '10',
    prize_pool_percent: '80',
    local_tournament_organizer_commission: '20',
  });
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    admin_upi_id: '',
    payment_qr_url: '',
  });
  const [ownerContactSettings, setOwnerContactSettings] = useState<OwnerContactSettings>({
    owner_whatsapp: '',
    owner_instagram: '',
    owner_contact_note: '',
  });
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    social_discord: '',
    social_instagram: '',
    social_youtube: '',
  });
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    maintenance_mode: 'false',
    maintenance_message: 'We are currently performing scheduled maintenance. Please check back soon!',
    maintenance_bypass_token: '',
  });
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings>({
    min_deposit_amount: '10',
    max_withdrawal_per_day: '10000',
    withdrawal_fee_threshold: '1000',
    withdrawal_fee_percent: '2',
  });
  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    google_auth_enabled: 'false',
  });
  const [tournamentLimitSettings, setTournamentLimitSettings] = useState<TournamentLimitSettings>({
    tournament_creation_limit: '5',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingOwnerContact, setSavingOwnerContact] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [savingTournamentLimit, setSavingTournamentLimit] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [generatingBypassToken, setGeneratingBypassToken] = useState(false);

  const qrInputRef = useRef<HTMLInputElement>(null);

  const { user, isSuperAdmin, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('settings:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('settings:view')) {
      fetchSettings();
    }
  }, [hasPermission]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const commissionMap: CommissionSettings = {
        organizer_commission_percent: '10',
        platform_commission_percent: '10',
        prize_pool_percent: '80',
        local_tournament_organizer_commission: '20',
      };

      const paymentMap: PaymentSettings = {
        admin_upi_id: '',
        payment_qr_url: '',
      };

      const ownerContactMap: OwnerContactSettings = {
        owner_whatsapp: '',
        owner_instagram: '',
        owner_contact_note: '',
      };

      const socialMap: SocialSettings = {
        social_discord: '',
        social_instagram: '',
        social_youtube: '',
      };

      const maintenanceMap: MaintenanceSettings = {
        maintenance_mode: 'false',
        maintenance_message: 'We are currently performing scheduled maintenance. Please check back soon!',
        maintenance_bypass_token: '',
      };

      const withdrawalMap: WithdrawalSettings = {
        min_deposit_amount: '10',
        max_withdrawal_per_day: '10000',
        withdrawal_fee_threshold: '1000',
        withdrawal_fee_percent: '2',
      };

      const authMap: AuthSettings = {
        google_auth_enabled: 'false',
      };

      const tournamentLimitMap: TournamentLimitSettings = {
        tournament_creation_limit: '5',
      };

      data?.forEach((s) => {
        if (s.setting_key in commissionMap) {
          commissionMap[s.setting_key as keyof CommissionSettings] = s.setting_value;
        }
        if (s.setting_key in paymentMap) {
          paymentMap[s.setting_key as keyof PaymentSettings] = s.setting_value;
        }
        if (s.setting_key in ownerContactMap) {
          ownerContactMap[s.setting_key as keyof OwnerContactSettings] = s.setting_value;
        }
        if (s.setting_key in socialMap) {
          socialMap[s.setting_key as keyof SocialSettings] = s.setting_value;
        }
        if (s.setting_key in maintenanceMap) {
          maintenanceMap[s.setting_key as keyof MaintenanceSettings] = s.setting_value;
        }
        if (s.setting_key in withdrawalMap) {
          withdrawalMap[s.setting_key as keyof WithdrawalSettings] = s.setting_value;
        }
        if (s.setting_key in authMap) {
          authMap[s.setting_key as keyof AuthSettings] = s.setting_value;
        }
        if (s.setting_key in tournamentLimitMap) {
          tournamentLimitMap[s.setting_key as keyof TournamentLimitSettings] = s.setting_value;
        }
      });

      setSettings(commissionMap);
      setPaymentSettings(paymentMap);
      setOwnerContactSettings(ownerContactMap);
      setSocialSettings(socialMap);
      setMaintenanceSettings(maintenanceMap);
      setWithdrawalSettings(withdrawalMap);
      setAuthSettings(authMap);
      setTournamentLimitSettings(tournamentLimitMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePercentages = () => {
    const org = parseFloat(settings.organizer_commission_percent) || 0;
    const platform = parseFloat(settings.platform_commission_percent) || 0;
    const prize = parseFloat(settings.prize_pool_percent) || 0;
    
    return org + platform + prize === 100;
  };

  const handleSaveCommission = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    if (!validatePercentages()) {
      toast({ title: 'Invalid Percentages', description: 'All percentages must add up to 100%.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ 
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({ title: 'Settings Saved', description: 'Commission percentages have been updated.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingPayment(true);

    try {
      for (const [key, value] of Object.entries(paymentSettings)) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ 
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({ title: 'Payment Settings Saved', description: 'Payment configuration has been updated.' });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({ title: 'Error', description: 'Failed to save payment settings.', variant: 'destructive' });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveOwnerContact = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingOwnerContact(true);

    try {
      for (const [key, value] of Object.entries(ownerContactSettings)) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ 
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({ title: 'Owner Contact Saved', description: 'Contact details for organizers/creators have been updated.' });
    } catch (error) {
      console.error('Error saving owner contact settings:', error);
      toast({ title: 'Error', description: 'Failed to save owner contact settings.', variant: 'destructive' });
    } finally {
      setSavingOwnerContact(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingSocial(true);

    try {
      for (const [key, value] of Object.entries(socialSettings)) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ 
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({ title: 'Social Links Saved', description: 'Social media links have been updated.' });
    } catch (error) {
      console.error('Error saving social settings:', error);
      toast({ title: 'Error', description: 'Failed to save social links.', variant: 'destructive' });
    } finally {
      setSavingSocial(false);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingMaintenance(true);

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          setting_key: 'maintenance_mode',
          setting_value: enabled ? 'true' : 'false',
          updated_by: user?.id,
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setMaintenanceSettings(prev => ({ ...prev, maintenance_mode: enabled ? 'true' : 'false' }));
      
      toast({ 
        title: enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled', 
        description: enabled ? 'Users cannot access the website now.' : 'Users can access the website now.',
        variant: enabled ? 'destructive' : 'default'
      });
    } catch (error) {
      console.error('Error toggling maintenance:', error);
      toast({ title: 'Error', description: 'Failed to toggle maintenance mode.', variant: 'destructive' });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleSaveMaintenance = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingMaintenance(true);

    try {
      for (const [key, value] of Object.entries(maintenanceSettings)) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ 
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({ title: 'Maintenance Settings Saved', description: 'Maintenance configuration has been updated.' });
    } catch (error) {
      console.error('Error saving maintenance settings:', error);
      toast({ title: 'Error', description: 'Failed to save maintenance settings.', variant: 'destructive' });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const generateBypassToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleGenerateBypassLink = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can generate bypass links.', variant: 'destructive' });
      return;
    }

    setGeneratingBypassToken(true);

    try {
      const newToken = generateBypassToken();
      
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          setting_key: 'maintenance_bypass_token',
          setting_value: newToken,
          updated_by: user?.id,
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setMaintenanceSettings(prev => ({ ...prev, maintenance_bypass_token: newToken }));
      
      toast({ 
        title: 'Bypass Link Generated', 
        description: 'New bypass link has been created. Share it with your team.',
      });
    } catch (error) {
      console.error('Error generating bypass token:', error);
      toast({ title: 'Error', description: 'Failed to generate bypass link.', variant: 'destructive' });
    } finally {
      setGeneratingBypassToken(false);
    }
  };

  const getBypassUrl = () => {
    if (!maintenanceSettings.maintenance_bypass_token) return '';
    return `${window.location.origin}/?bypass=${maintenanceSettings.maintenance_bypass_token}`;
  };

  const handleCopyBypassLink = async () => {
    const url = getBypassUrl();
    if (!url) {
      toast({ title: 'No Link', description: 'Generate a bypass link first.', variant: 'destructive' });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied!', description: 'Bypass link copied to clipboard.' });
    } catch (error) {
      toast({ title: 'Copy Failed', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  const handleSaveWithdrawal = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingWithdrawal(true);

    try {
      for (const [key, value] of Object.entries(withdrawalSettings)) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ 
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({ title: 'Withdrawal Settings Saved', description: 'Deposit and withdrawal limits have been updated.' });
    } catch (error) {
      console.error('Error saving withdrawal settings:', error);
      toast({ title: 'Error', description: 'Failed to save withdrawal settings.', variant: 'destructive' });
    } finally {
      setSavingWithdrawal(false);
    }
  };

  const handleToggleGoogleAuth = async (enabled: boolean) => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingAuth(true);

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          setting_key: 'google_auth_enabled',
          setting_value: enabled ? 'true' : 'false',
          updated_by: user?.id,
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setAuthSettings(prev => ({ ...prev, google_auth_enabled: enabled ? 'true' : 'false' }));
      
      toast({ 
        title: enabled ? 'Google Auth Enabled' : 'Google Auth Disabled', 
        description: enabled ? 'Continue with Google button will now show on login.' : 'Google sign in is now hidden.',
      });
    } catch (error) {
      console.error('Error toggling Google auth:', error);
      toast({ title: 'Error', description: 'Failed to toggle Google auth.', variant: 'destructive' });
    } finally {
      setSavingAuth(false);
    }
  };

  const handleSaveTournamentLimit = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can change settings.', variant: 'destructive' });
      return;
    }

    setSavingTournamentLimit(true);

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          setting_key: 'tournament_creation_limit',
          setting_value: tournamentLimitSettings.tournament_creation_limit,
          updated_by: user?.id,
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      toast({ 
        title: 'Tournament Limit Saved', 
        description: `Organizers/Creators can now create max ${tournamentLimitSettings.tournament_creation_limit} active tournaments.`,
      });
    } catch (error) {
      console.error('Error saving tournament limit:', error);
      toast({ title: 'Error', description: 'Failed to save tournament limit.', variant: 'destructive' });
    } finally {
      setSavingTournamentLimit(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please upload an image file (PNG, JPG, etc.)', variant: 'destructive' });
      return;
    }

    // 5MB limit
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({ 
        title: 'File Too Large', 
        description: `Your file is ${fileSizeMB}MB. Please upload an image under 5MB.`, 
        variant: 'destructive' 
      });
      return;
    }

    setUploadingQr(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `payment-qr/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(filePath);

      setPaymentSettings(prev => ({ ...prev, payment_qr_url: urlData.publicUrl }));
      toast({ title: 'QR Uploaded', description: 'QR code image uploaded successfully.' });
    } catch (error: any) {
      console.error('Error uploading QR:', error);
      toast({ 
        title: 'Upload Failed', 
        description: error?.message || 'Failed to upload QR code. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingQr(false);
    }
  };

  const updateSetting = (key: keyof CommissionSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) return;
    
    setSettings({ ...settings, [key]: value });
  };

  const getTotalPercentage = () => {
    return (
      (parseFloat(settings.organizer_commission_percent) || 0) +
      (parseFloat(settings.platform_commission_percent) || 0) +
      (parseFloat(settings.prize_pool_percent) || 0)
    );
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Platform Settings">
      <div className="p-4 space-y-4">
        {/* Maintenance Mode - Most Important */}
        <Card className={maintenanceSettings.maintenance_mode === 'true' ? 'border-destructive bg-destructive/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className={`h-5 w-5 ${maintenanceSettings.maintenance_mode === 'true' ? 'text-destructive' : 'text-primary'}`} />
              Maintenance Mode
              {maintenanceSettings.maintenance_mode === 'true' && (
                <span className="ml-auto text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full animate-pulse">
                  ACTIVE
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenanceSettings.maintenance_mode === 'true' && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Website is currently in maintenance mode!</p>
                  <p className="text-sm text-destructive/80 mt-1">
                    No users can access the website. Only admins can disable this.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Enable Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Block all user access to the website</p>
              </div>
              <Switch
                checked={maintenanceSettings.maintenance_mode === 'true'}
                onCheckedChange={handleToggleMaintenance}
                disabled={!isSuperAdmin || savingMaintenance}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  placeholder="Enter message to show users during maintenance..."
                  value={maintenanceSettings.maintenance_message}
                  onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, maintenance_message: e.target.value }))}
                  disabled={!isSuperAdmin}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">This message will be displayed on the login page</p>
              </div>

            </div>

            {/* Bypass Link Section */}
            <div className="border-t pt-4 mt-4">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  Maintenance Bypass Link
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate a special link that allows you and your team to access the site during maintenance.
                </p>
                
                {maintenanceSettings.maintenance_bypass_token ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={getBypassUrl()}
                        readOnly
                        className="flex-1 text-xs font-mono bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyBypassLink}
                        title="Copy bypass link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyBypassLink}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateBypassLink}
                          disabled={generatingBypassToken}
                          className="flex-1"
                        >
                          {generatingBypassToken ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Regenerate
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Share this link only with trusted team members. Anyone with this link can bypass maintenance.
                    </p>
                  </div>
                ) : (
                  isSuperAdmin && (
                    <Button
                      variant="outline"
                      onClick={handleGenerateBypassLink}
                      disabled={generatingBypassToken}
                      className="w-full"
                    >
                      {generatingBypassToken ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Link className="h-4 w-4 mr-2" />
                      )}
                      Generate Bypass Link
                    </Button>
                  )
                )}
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSaveMaintenance}
                disabled={savingMaintenance}
              >
                {savingMaintenance ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Maintenance Settings
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Google Auth Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable or disable "Continue with Google" button on login/signup.
            </p>

            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Google Sign In</p>
                  <p className="text-xs text-muted-foreground">Show "Continue with Google" on login page</p>
                </div>
                <Switch
                  checked={authSettings.google_auth_enabled === 'true'}
                  onCheckedChange={handleToggleGoogleAuth}
                  disabled={!isSuperAdmin || savingAuth}
                />
              </div>

              {authSettings.google_auth_enabled === 'true' && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Note:</span> Make sure you have enabled Google provider in your Supabase project's Authentication settings with correct Client ID and Secret.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tournament Creation Limit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Tournament Creation Limit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the maximum number of active (upcoming/ongoing) tournaments that an Organizer or Creator can have at a time.
            </p>

            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label>Max Active Tournaments per User</Label>
                <Input
                  type="number"
                  placeholder="5"
                  min="1"
                  max="50"
                  value={tournamentLimitSettings.tournament_creation_limit}
                  onChange={(e) => setTournamentLimitSettings(prev => ({ ...prev, tournament_creation_limit: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Organizers/Creators cannot create new tournaments if they have this many active (upcoming or ongoing) tournaments.
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSaveTournamentLimit}
                disabled={savingTournamentLimit}
              >
                {savingTournamentLimit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Tournament Limit
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Payment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure the UPI ID and QR code for receiving deposits.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Admin UPI ID</Label>
                <Input
                  placeholder="yourname@upi"
                  value={paymentSettings.admin_upi_id}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, admin_upi_id: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <p className="text-xs text-muted-foreground">Users will pay to this UPI ID</p>
              </div>

              <div className="space-y-2">
                <Label>Payment QR Code</Label>
                <div 
                  onClick={() => isSuperAdmin && qrInputRef.current?.click()}
                  className={`border-2 border-dashed border-border rounded-lg p-4 text-center ${isSuperAdmin ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
                >
                  {paymentSettings.payment_qr_url ? (
                    <div className="space-y-2">
                      <img 
                        src={paymentSettings.payment_qr_url} 
                        alt="Payment QR" 
                        className="w-32 h-32 mx-auto object-contain rounded-lg"
                      />
                      <div className="flex items-center justify-center gap-1 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        QR Code Uploaded
                      </div>
                      {isSuperAdmin && (
                        <p className="text-xs text-muted-foreground">Click to replace</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {uploadingQr ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <QrCode className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {isSuperAdmin ? 'Click to upload QR code image' : 'No QR code uploaded'}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="hidden"
                />
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSavePayment}
                disabled={savingPayment}
              >
                {savingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Payment Settings
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Commission Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-primary" />
              Commission Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure how entry fees are split between organizers, platform, and prize pool.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Organizer Commission (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.organizer_commission_percent}
                    onChange={(e) => updateSetting('organizer_commission_percent', e.target.value)}
                    disabled={!isSuperAdmin}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Amount organizers earn from each entry fee</p>
              </div>

              <div className="space-y-2">
                <Label>Platform Commission (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.platform_commission_percent}
                    onChange={(e) => updateSetting('platform_commission_percent', e.target.value)}
                    disabled={!isSuperAdmin}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Platform revenue from each entry fee</p>
              </div>

              <div className="space-y-2">
                <Label>Prize Pool (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.prize_pool_percent}
                    onChange={(e) => updateSetting('prize_pool_percent', e.target.value)}
                    disabled={!isSuperAdmin}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Amount added to tournament prize pool</p>
              </div>
            </div>

            {/* Total Validation */}
            <div className={`p-3 rounded-lg ${getTotalPercentage() === 100 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className={`font-bold ${getTotalPercentage() === 100 ? 'text-green-600' : 'text-destructive'}`}>
                  {getTotalPercentage()}%
                </span>
              </div>
              {getTotalPercentage() !== 100 && (
                <p className="text-xs text-destructive mt-1">
                  Total must equal 100%
                </p>
              )}
            </div>

            {/* Example Calculation */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Example: ₹100 Entry Fee</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organizer:</span>
                  <span className="font-medium">₹{parseFloat(settings.organizer_commission_percent) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-medium">₹{parseFloat(settings.platform_commission_percent) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prize Pool:</span>
                  <span className="font-medium text-primary">₹{parseFloat(settings.prize_pool_percent) || 0}</span>
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSaveCommission}
                disabled={saving || getTotalPercentage() !== 100}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Commission Settings
              </Button>
            )}

            {!isSuperAdmin && (
              <p className="text-sm text-muted-foreground text-center">
                Only Super Admin can modify these settings.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Owner Contact Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Owner Contact (For Organizers/Creators)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure contact details that organizers and creators can use to reach you.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  WhatsApp Number
                </Label>
                <Input
                  placeholder="+91 9876543210"
                  value={ownerContactSettings.owner_whatsapp}
                  onChange={(e) => setOwnerContactSettings(prev => ({ ...prev, owner_whatsapp: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Instagram Link
                </Label>
                <Input
                  placeholder="https://instagram.com/yourusername"
                  value={ownerContactSettings.owner_instagram}
                  onChange={(e) => setOwnerContactSettings(prev => ({ ...prev, owner_instagram: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <p className="text-xs text-muted-foreground">Full Instagram profile URL</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Note for Organizers/Creators
                </Label>
                <Textarea
                  placeholder="Enter any important message or guidelines for organizers and creators..."
                  value={ownerContactSettings.owner_contact_note}
                  onChange={(e) => setOwnerContactSettings(prev => ({ ...prev, owner_contact_note: e.target.value }))}
                  disabled={!isSuperAdmin}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">This note will be displayed on the "Connect With Owner" page</p>
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSaveOwnerContact}
                disabled={savingOwnerContact}
              >
                {savingOwnerContact ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Owner Contact Settings
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Social Media Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Social Media Links (Profile Page)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure social media links displayed on user profile pages.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-500" />
                  Discord Server
                </Label>
                <Input
                  placeholder="https://discord.gg/your-server"
                  value={socialSettings.social_discord}
                  onChange={(e) => setSocialSettings(prev => ({ ...prev, social_discord: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Instagram
                </Label>
                <Input
                  placeholder="https://instagram.com/yourusername"
                  value={socialSettings.social_instagram}
                  onChange={(e) => setSocialSettings(prev => ({ ...prev, social_instagram: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-500" />
                  YouTube Channel
                </Label>
                <Input
                  placeholder="https://youtube.com/@yourchannel"
                  value={socialSettings.social_youtube}
                  onChange={(e) => setSocialSettings(prev => ({ ...prev, social_youtube: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSaveSocial}
                disabled={savingSocial}
              >
                {savingSocial ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Social Links
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal & Deposit Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Withdrawal & Deposit Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure minimum deposit, maximum withdrawal per day, and withdrawal fees.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  Minimum Deposit Amount (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={withdrawalSettings.min_deposit_amount}
                  onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, min_deposit_amount: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <p className="text-xs text-muted-foreground">Users cannot deposit below this amount</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                  Maximum Withdrawal Per Day (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={withdrawalSettings.max_withdrawal_per_day}
                  onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, max_withdrawal_per_day: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <p className="text-xs text-muted-foreground">Maximum amount a user can withdraw in 24 hours</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Withdrawal Fee Settings</p>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Fee Threshold (₹)</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={withdrawalSettings.withdrawal_fee_threshold}
                      onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, withdrawal_fee_threshold: e.target.value }))}
                      disabled={!isSuperAdmin}
                    />
                    <p className="text-xs text-muted-foreground">Fee applies only for withdrawals above this amount</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Withdrawal Fee (%)</Label>
                    <Input
                      type="number"
                      placeholder="2"
                      min="0"
                      max="100"
                      value={withdrawalSettings.withdrawal_fee_percent}
                      onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, withdrawal_fee_percent: e.target.value }))}
                      disabled={!isSuperAdmin}
                    />
                    <p className="text-xs text-muted-foreground">Fee percentage for withdrawals above threshold</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Example: Withdrawal of ₹2000</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Withdrawal Amount:</span>
                  <span className="font-medium">₹2000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({withdrawalSettings.withdrawal_fee_percent}% above ₹{withdrawalSettings.withdrawal_fee_threshold}):</span>
                  <span className="font-medium text-destructive">
                    -₹{Math.round((2000 - parseInt(withdrawalSettings.withdrawal_fee_threshold || '1000')) * (parseInt(withdrawalSettings.withdrawal_fee_percent || '2') / 100))}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">User Receives:</span>
                  <span className="font-medium text-success">
                    ₹{2000 - Math.round((2000 - parseInt(withdrawalSettings.withdrawal_fee_threshold || '1000')) * (parseInt(withdrawalSettings.withdrawal_fee_percent || '2') / 100))}
                  </span>
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <Button 
                variant="gaming" 
                className="w-full" 
                onClick={handleSaveWithdrawal}
                disabled={savingWithdrawal}
              >
                {savingWithdrawal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Withdrawal Settings
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
