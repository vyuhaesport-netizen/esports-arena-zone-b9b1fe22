import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Settings,
  Percent,
  Save
} from 'lucide-react';

interface CommissionSettings {
  organizer_commission_percent: string;
  platform_commission_percent: string;
  prize_pool_percent: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<CommissionSettings>({
    organizer_commission_percent: '10',
    platform_commission_percent: '10',
    prize_pool_percent: '80',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      const settingsMap: CommissionSettings = {
        organizer_commission_percent: '10',
        platform_commission_percent: '10',
        prize_pool_percent: '80',
      };

      data?.forEach((s) => {
        if (s.setting_key in settingsMap) {
          settingsMap[s.setting_key as keyof CommissionSettings] = s.setting_value;
        }
      });

      setSettings(settingsMap);
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

  const handleSave = async () => {
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
          .update({ 
            setting_value: value,
            updated_by: user?.id,
          })
          .eq('setting_key', key);

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
                onClick={handleSave}
                disabled={saving || getTotalPercentage() !== 100}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            )}

            {!isSuperAdmin && (
              <p className="text-sm text-muted-foreground text-center">
                Only Super Admin can modify these settings.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
