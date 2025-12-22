import { useState, useEffect, useRef } from 'react';
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
  Percent,
  Save,
  CreditCard,
  QrCode,
  Upload,
  Check
} from 'lucide-react';

interface CommissionSettings {
  organizer_commission_percent: string;
  platform_commission_percent: string;
  prize_pool_percent: string;
}

interface PaymentSettings {
  admin_upi_id: string;
  payment_qr_url: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<CommissionSettings>({
    organizer_commission_percent: '10',
    platform_commission_percent: '10',
    prize_pool_percent: '80',
  });
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    admin_upi_id: '',
    payment_qr_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

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
      };

      const paymentMap: PaymentSettings = {
        admin_upi_id: '',
        payment_qr_url: '',
      };

      data?.forEach((s) => {
        if (s.setting_key in commissionMap) {
          commissionMap[s.setting_key as keyof CommissionSettings] = s.setting_value;
        }
        if (s.setting_key in paymentMap) {
          paymentMap[s.setting_key as keyof PaymentSettings] = s.setting_value;
        }
      });

      setSettings(commissionMap);
      setPaymentSettings(paymentMap);
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
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
