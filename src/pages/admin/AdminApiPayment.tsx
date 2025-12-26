import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Loader2, 
  Save, 
  Eye, 
  EyeOff,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  IndianRupee,
  RefreshCw,
  Settings2,
  History,
  Copy,
  Link2,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface PaymentGatewayConfig {
  id: string;
  gateway_name: string;
  display_name: string;
  is_enabled: boolean;
  is_default: boolean;
  api_key_id: string | null;
  api_key_secret: string | null;
  webhook_secret: string | null;
  environment: string;
  currency: string;
  supports_auto_credit: boolean;
  supports_refunds: boolean;
  min_amount: number;
  max_amount: number;
  platform_fee_percent: number;
  platform_fee_fixed: number;
  additional_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface PaymentTransaction {
  id: string;
  user_id: string;
  gateway_name: string;
  order_id: string | null;
  payment_id: string | null;
  amount: number;
  status: string;
  transaction_type: string;
  created_at: string;
}

const AdminApiPayment = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, hasPermission, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    details?: Record<string, boolean>;
  }>({ status: 'idle' });
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    gateway: string;
    action: 'enable' | 'disable' | 'default';
  }>({ open: false, gateway: '', action: 'enable' });

  // Form state for Razorpay
  const [razorpayForm, setRazorpayForm] = useState({
    api_key_id: '',
    api_key_secret: '',
    webhook_secret: '',
    environment: 'test',
    min_amount: '10',
    max_amount: '50000',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isSuperAdmin && !hasPermission('settings:view')) {
        navigate('/admin');
        toast({
          title: 'Access Denied',
          description: 'You need permission to access this page.',
          variant: 'destructive',
        });
      } else {
        fetchData();
      }
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const [gatewayRes, transactionRes] = await Promise.all([
        supabase
          .from('payment_gateway_config')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('payment_gateway_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (gatewayRes.data) {
        setGateways(gatewayRes.data as PaymentGatewayConfig[]);
        
        // Initialize Razorpay form with existing data
        const razorpay = gatewayRes.data.find(g => g.gateway_name === 'razorpay');
        if (razorpay) {
          setRazorpayForm({
            api_key_id: razorpay.api_key_id || '',
            api_key_secret: razorpay.api_key_secret || '',
            webhook_secret: razorpay.webhook_secret || '',
            environment: razorpay.environment || 'test',
            min_amount: razorpay.min_amount?.toString() || '10',
            max_amount: razorpay.max_amount?.toString() || '50000',
          });
        }
      }

      if (transactionRes.data) {
        setTransactions(transactionRes.data as PaymentTransaction[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment gateway data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRazorpay = async () => {
    if (!razorpayForm.api_key_id.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Razorpay Key ID',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_gateway_config')
        .update({
          api_key_id: razorpayForm.api_key_id.trim(),
          api_key_secret: razorpayForm.api_key_secret.trim() || null,
          webhook_secret: razorpayForm.webhook_secret.trim() || null,
          environment: razorpayForm.environment,
          min_amount: parseFloat(razorpayForm.min_amount) || 10,
          max_amount: parseFloat(razorpayForm.max_amount) || 50000,
          updated_by: user?.id,
        })
        .eq('gateway_name', 'razorpay');

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Razorpay settings have been updated',
      });

      fetchData();
    } catch (error) {
      console.error('Error saving Razorpay config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setWebhookStatus({ status: 'idle' });
    
    try {
      const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'drwxtjgtjejwegsneutq'}.supabase.co/functions/v1/razorpay-webhook`;
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        setWebhookStatus({
          status: 'success',
          message: 'Webhook endpoint is active and responding',
          details: {
            database_connected: data.database_connected,
            webhook_secret_configured: data.webhook_secret_configured,
          }
        });
        toast({
          title: 'Webhook Active',
          description: 'The webhook endpoint is working correctly',
        });
      } else {
        setWebhookStatus({
          status: 'error',
          message: data.message || 'Webhook endpoint returned an error',
        });
        toast({
          title: 'Webhook Error',
          description: data.message || 'Failed to verify webhook',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setWebhookStatus({
        status: 'error',
        message: 'Could not connect to webhook endpoint',
      });
      toast({
        title: 'Connection Failed',
        description: 'Could not reach the webhook endpoint',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleGateway = async (gatewayName: string, enable: boolean) => {
    setSaving(true);
    try {
      if (enable && gatewayName === 'razorpay') {
        // Check if API keys are configured
        const razorpay = gateways.find(g => g.gateway_name === 'razorpay');
        if (!razorpay?.api_key_id) {
          toast({
            title: 'API Keys Required',
            description: 'Please configure Razorpay API keys before enabling',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }

      // If enabling a new gateway, disable others and set as default
      if (enable) {
        // Disable all other gateways first
        await supabase
          .from('payment_gateway_config')
          .update({ is_enabled: false, is_default: false })
          .neq('gateway_name', gatewayName);

        // Enable and set as default
        await supabase
          .from('payment_gateway_config')
          .update({ 
            is_enabled: true, 
            is_default: true,
            updated_by: user?.id 
          })
          .eq('gateway_name', gatewayName);
      } else {
        // Just disable this gateway
        await supabase
          .from('payment_gateway_config')
          .update({ 
            is_enabled: false, 
            is_default: false,
            updated_by: user?.id 
          })
          .eq('gateway_name', gatewayName);

        // Enable manual_upi as fallback
        await supabase
          .from('payment_gateway_config')
          .update({ is_enabled: true, is_default: true })
          .eq('gateway_name', 'manual_upi');
      }

      toast({
        title: enable ? 'Gateway Enabled' : 'Gateway Disabled',
        description: enable 
          ? `${gatewayName === 'razorpay' ? 'Razorpay' : gatewayName === 'zapupi' ? 'ZapUPI' : 'Manual UPI'} is now active` 
          : 'Manual UPI payment is now active',
      });

      fetchData();
    } catch (error) {
      console.error('Error toggling gateway:', error);
      toast({
        title: 'Error',
        description: 'Failed to update gateway status',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setConfirmDialog({ open: false, gateway: '', action: 'enable' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const razorpayGateway = gateways.find(g => g.gateway_name === 'razorpay');
  const manualGateway = gateways.find(g => g.gateway_name === 'manual_upi');
  const zapupiGateway = gateways.find(g => g.gateway_name === 'zapupi');

  if (authLoading || loading) {
    return (
      <AdminLayout title="API Payment">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="API Payment">
      <div className="p-4 space-y-6">
        {/* Header Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Payment Gateway Configuration</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure and switch between payment gateways. Credits go through selected gateway automatically, 
                  while debits (withdrawals) are always processed manually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Gateway Status */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`${razorpayGateway?.is_enabled ? 'border-green-500/50 bg-green-500/5' : 'border-border'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`h-5 w-5 ${razorpayGateway?.is_enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Razorpay</span>
                </div>
                {razorpayGateway?.is_enabled ? (
                  <Badge className="bg-green-500 text-white">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {razorpayGateway?.is_enabled ? 'Auto-credit enabled' : 'Enable for instant payments'}
              </p>
            </CardContent>
          </Card>

          <Card className={`${manualGateway?.is_enabled ? 'border-blue-500/50 bg-blue-500/5' : 'border-border'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${manualGateway?.is_enabled ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Manual UPI</span>
                </div>
                {manualGateway?.is_enabled ? (
                  <Badge className="bg-blue-500 text-white">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {manualGateway?.is_enabled ? 'Admin approval required' : 'Current backup method'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gateways" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="gateways" className="text-xs">Gateways</TabsTrigger>
            <TabsTrigger value="razorpay" className="text-xs">Razorpay</TabsTrigger>
            <TabsTrigger value="zapupi" className="text-xs">ZapUPI</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="gateways" className="space-y-4">
            {/* Payment Gateway Apps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Gateway Apps
                </CardTitle>
                <CardDescription className="text-xs">
                  Select and configure payment gateways for your platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Razorpay */}
                <div className={`p-4 rounded-lg border-2 ${razorpayGateway?.is_enabled ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        R
                      </div>
                      <div>
                        <p className="font-semibold">Razorpay</p>
                        <p className="text-xs text-muted-foreground">UPI, Cards, NetBanking, Wallets</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {razorpayGateway?.is_enabled && <Badge className="bg-green-500 text-white text-xs">Active</Badge>}
                      <Switch
                        checked={razorpayGateway?.is_enabled || false}
                        onCheckedChange={(checked) => {
                          setConfirmDialog({
                            open: true,
                            gateway: 'razorpay',
                            action: checked ? 'enable' : 'disable'
                          });
                        }}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">UPI</Badge>
                    <Badge variant="outline" className="text-[10px]">Credit Card</Badge>
                    <Badge variant="outline" className="text-[10px]">Debit Card</Badge>
                    <Badge variant="outline" className="text-[10px]">NetBanking</Badge>
                    <Badge variant="outline" className="text-[10px]">Paytm Wallet</Badge>
                  </div>
                </div>

                {/* ZapUPI - Active Gateway */}
                <div className={`p-4 rounded-lg border-2 ${zapupiGateway?.is_enabled ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                        Z
                      </div>
                      <div>
                        <p className="font-semibold">ZapUPI</p>
                        <p className="text-xs text-muted-foreground">Instant UPI Payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {zapupiGateway?.is_enabled && <Badge className="bg-green-500 text-white text-xs">Active</Badge>}
                      <Switch
                        checked={zapupiGateway?.is_enabled || false}
                        onCheckedChange={(checked) => {
                          setConfirmDialog({
                            open: true,
                            gateway: 'zapupi',
                            action: checked ? 'enable' : 'disable'
                          });
                        }}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">UPI</Badge>
                    <Badge variant="outline" className="text-[10px]">Auto Credit</Badge>
                    <Badge variant="outline" className="text-[10px]">Webhook</Badge>
                  </div>
                </div>

                {/* PhonePe */}
                <div className="p-4 rounded-lg border-2 border-border opacity-75">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        P
                      </div>
                      <div>
                        <p className="font-semibold">PhonePe</p>
                        <p className="text-xs text-muted-foreground">UPI, Cards, Wallets</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">PhonePe UPI</Badge>
                    <Badge variant="outline" className="text-[10px]">PhonePe Wallet</Badge>
                    <Badge variant="outline" className="text-[10px]">Cards</Badge>
                  </div>
                </div>

                {/* Paytm */}
                <div className="p-4 rounded-lg border-2 border-border opacity-75">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-sm">
                        Pt
                      </div>
                      <div>
                        <p className="font-semibold">Paytm</p>
                        <p className="text-xs text-muted-foreground">Paytm Wallet, UPI, Cards</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">Paytm UPI</Badge>
                    <Badge variant="outline" className="text-[10px]">Paytm Wallet</Badge>
                    <Badge variant="outline" className="text-[10px]">Postpaid</Badge>
                  </div>
                </div>

                {/* Cashfree */}
                <div className="p-4 rounded-lg border-2 border-border opacity-75">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                        CF
                      </div>
                      <div>
                        <p className="font-semibold">Cashfree</p>
                        <p className="text-xs text-muted-foreground">UPI, Cards, NetBanking</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">UPI AutoPay</Badge>
                    <Badge variant="outline" className="text-[10px]">Paylater</Badge>
                    <Badge variant="outline" className="text-[10px]">EMI</Badge>
                  </div>
                </div>

                {/* PayU */}
                <div className="p-4 rounded-lg border-2 border-border opacity-75">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                        PU
                      </div>
                      <div>
                        <p className="font-semibold">PayU</p>
                        <p className="text-xs text-muted-foreground">Multi-mode payments</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">UPI</Badge>
                    <Badge variant="outline" className="text-[10px]">Cards</Badge>
                    <Badge variant="outline" className="text-[10px]">NetBanking</Badge>
                  </div>
                </div>

                {/* Instamojo */}
                <div className="p-4 rounded-lg border-2 border-border opacity-75">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                        IM
                      </div>
                      <div>
                        <p className="font-semibold">Instamojo</p>
                        <p className="text-xs text-muted-foreground">Payment Links, UPI</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">Payment Links</Badge>
                    <Badge variant="outline" className="text-[10px]">UPI</Badge>
                    <Badge variant="outline" className="text-[10px]">Cards</Badge>
                  </div>
                </div>

                {/* Manual UPI */}
                <div className={`p-4 rounded-lg border-2 ${manualGateway?.is_enabled ? 'border-blue-500 bg-blue-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
                        M
                      </div>
                      <div>
                        <p className="font-semibold">Manual UPI</p>
                        <p className="text-xs text-muted-foreground">QR Code + UTR verification</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {manualGateway?.is_enabled && <Badge className="bg-blue-500 text-white text-xs">Active</Badge>}
                      <Switch
                        checked={manualGateway?.is_enabled || false}
                        onCheckedChange={(checked) => {
                          setConfirmDialog({
                            open: true,
                            gateway: 'manual_upi',
                            action: checked ? 'enable' : 'disable'
                          });
                        }}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">Admin Approval</Badge>
                    <Badge variant="outline" className="text-[10px]">No API needed</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Guide */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Integration Guide</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only Razorpay and Manual UPI are currently available. Other gateways require integration 
                      development. Contact support if you need a specific gateway integrated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="razorpay" className="space-y-4">
            {/* Enable/Disable Switch */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Razorpay Gateway
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Enable to use Razorpay for instant payments
                    </CardDescription>
                  </div>
                  <Switch
                    checked={razorpayGateway?.is_enabled || false}
                    onCheckedChange={(checked) => {
                      setConfirmDialog({
                        open: true,
                        gateway: 'razorpay',
                        action: checked ? 'enable' : 'disable'
                      });
                    }}
                    disabled={saving}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* API Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  API Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Enter your Razorpay API credentials from dashboard.razorpay.com
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Key ID *</Label>
                  <Input
                    type="text"
                    placeholder="rzp_test_xxxxxxxxxxxxx"
                    value={razorpayForm.api_key_id}
                    onChange={(e) => setRazorpayForm({ ...razorpayForm, api_key_id: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Your Razorpay Key ID (starts with rzp_)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Key Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['secret'] ? 'text' : 'password'}
                      placeholder="Enter Key Secret"
                      value={razorpayForm.api_key_secret}
                      onChange={(e) => setRazorpayForm({ ...razorpayForm, api_key_secret: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowSecrets({ ...showSecrets, secret: !showSecrets['secret'] })}
                    >
                      {showSecrets['secret'] ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Required for server-side operations</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Webhook Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['webhook'] ? 'text' : 'password'}
                      placeholder="Enter Webhook Secret"
                      value={razorpayForm.webhook_secret}
                      onChange={(e) => setRazorpayForm({ ...razorpayForm, webhook_secret: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowSecrets({ ...showSecrets, webhook: !showSecrets['webhook'] })}
                    >
                      {showSecrets['webhook'] ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">For verifying webhook callbacks</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Environment</Label>
                    <Select
                      value={razorpayForm.environment}
                      onValueChange={(value) => setRazorpayForm({ ...razorpayForm, environment: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test Mode</SelectItem>
                        <SelectItem value="live">Live Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Currency</Label>
                    <Input value="INR" disabled className="bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Min Amount (₹)</Label>
                    <Input
                      type="number"
                      value={razorpayForm.min_amount}
                      onChange={(e) => setRazorpayForm({ ...razorpayForm, min_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Amount (₹)</Label>
                    <Input
                      type="number"
                      value={razorpayForm.max_amount}
                      onChange={(e) => setRazorpayForm({ ...razorpayForm, max_amount: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveRazorpay}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            {/* Webhook URL - Important */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  Webhook URL (Important)
                </CardTitle>
                <CardDescription className="text-xs">
                  Add this URL in your Razorpay Dashboard → Webhooks section
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Webhook Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'drwxtjgtjejwegsneutq'}.supabase.co/functions/v1/razorpay-webhook`}
                      className="bg-muted text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'drwxtjgtjejwegsneutq'}.supabase.co/functions/v1/razorpay-webhook`;
                        navigator.clipboard.writeText(url);
                        toast({
                          title: 'Copied!',
                          description: 'Webhook URL copied to clipboard',
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">Setup Instructions:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to Razorpay Dashboard → Settings → Webhooks</li>
                    <li>Click "Add New Webhook"</li>
                    <li>Paste the above URL</li>
                    <li>Select events: <span className="font-mono text-[10px]">payment.captured, payment.failed</span></li>
                    <li>Copy the Webhook Secret and paste it above</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open('https://dashboard.razorpay.com/app/webhooks', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Razorpay Dashboard
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={handleTestWebhook}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Test Webhook
                  </Button>
                </div>

                {/* Webhook Test Status */}
                {webhookStatus.status !== 'idle' && (
                  <div className={`rounded-lg p-3 ${
                    webhookStatus.status === 'success' 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {webhookStatus.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        webhookStatus.status === 'success' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {webhookStatus.status === 'success' ? 'Webhook Active' : 'Webhook Error'}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      webhookStatus.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {webhookStatus.message}
                    </p>
                    {webhookStatus.details && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          {webhookStatus.details.database_connected ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className="text-muted-foreground">Database connected</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {webhookStatus.details.webhook_secret_configured ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          )}
                          <span className="text-muted-foreground">
                            Webhook secret {webhookStatus.details.webhook_secret_configured ? 'configured' : 'not configured'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Environment Warning */}
            {razorpayForm.environment === 'test' && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-700">Test Mode Active</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Payments won't be processed with real money. Switch to Live mode for production.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ZapUPI Tab */}
          <TabsContent value="zapupi" className="space-y-4">
            {/* Enable/Disable Switch */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-500" />
                      ZapUPI Gateway
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Enable to use ZapUPI for instant UPI payments
                    </CardDescription>
                  </div>
                  <Switch
                    checked={zapupiGateway?.is_enabled || false}
                    onCheckedChange={(checked) => {
                      setConfirmDialog({
                        open: true,
                        gateway: 'zapupi',
                        action: checked ? 'enable' : 'disable'
                      });
                    }}
                    disabled={saving}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* ZapUPI Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  API Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  ZapUPI API credentials are stored securely in backend secrets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">API Keys Configured</span>
                  </div>
                  <p className="text-xs text-green-600">
                    Your ZapUPI Token and Secret keys are securely stored in the backend and ready to use.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Min Amount (₹)</Label>
                    <Input value={zapupiGateway?.min_amount || 10} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Amount (₹)</Label>
                    <Input value={zapupiGateway?.max_amount || 50000} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Environment</Label>
                    <Input value="Live" disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Currency</Label>
                    <Input value="INR" disabled className="bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Webhook URL */}
            <Card className="border-cyan-500/50 bg-cyan-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-cyan-500" />
                  Webhook URL (Important)
                </CardTitle>
                <CardDescription className="text-xs">
                  Add this URL in your ZapUPI Dashboard → Settings → Deposit Webhook URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Webhook Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'drwxtjgtjejwegsneutq'}.supabase.co/functions/v1/zapupi-webhook`}
                      className="bg-muted text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'drwxtjgtjejwegsneutq'}.supabase.co/functions/v1/zapupi-webhook`;
                        navigator.clipboard.writeText(url);
                        toast({
                          title: 'Copied!',
                          description: 'Webhook URL copied to clipboard',
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">Setup Instructions:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to ZapUPI Dashboard → Settings</li>
                    <li>Find "Deposit Webhook URL" field</li>
                    <li>Paste the above URL</li>
                    <li>Whitelist Gateway IP: <span className="font-mono text-[10px] bg-muted px-1 rounded">148.135.143.154</span></li>
                    <li>Save settings</li>
                  </ol>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-yellow-700">IP Whitelisting Required</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Make sure to whitelist the ZapUPI Gateway IP (148.135.143.154) in your server firewall for webhooks to work correctly.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ZapUPI Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Auto Credit</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Instant UPI</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Webhook Support</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Refunds</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment Rules</CardTitle>
                <CardDescription className="text-xs">
                  How payments are processed on this platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">Credits (Deposits)</p>
                      <p className="text-xs text-muted-foreground">Processed via selected gateway</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600">Auto</Badge>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">Debits (Withdrawals)</p>
                      <p className="text-xs text-muted-foreground">Always requires admin approval</p>
                    </div>
                  </div>
                  <Badge className="bg-red-500/10 text-red-600">Manual</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Manual UPI Settings</CardTitle>
                <CardDescription className="text-xs">
                  Fallback payment method when Razorpay is disabled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable Manual UPI</p>
                    <p className="text-xs text-muted-foreground">Uses QR code and UTR verification</p>
                  </div>
                  <Switch
                    checked={manualGateway?.is_enabled || false}
                    onCheckedChange={(checked) => {
                      setConfirmDialog({
                        open: true,
                        gateway: 'manual_upi',
                        action: checked ? 'enable' : 'disable'
                      });
                    }}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Transaction History
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Recent gateway transactions
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">No gateway transactions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Transactions will appear here when Razorpay is enabled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            txn.transaction_type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            <IndianRupee className={`h-4 w-4 ${
                              txn.transaction_type === 'credit' ? 'text-green-500' : 'text-red-500'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {txn.gateway_name === 'razorpay' ? 'Razorpay' : 'Manual'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(txn.created_at), 'MMM dd, hh:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${
                            txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {txn.transaction_type === 'credit' ? '+' : '-'}₹{txn.amount}
                          </p>
                          {getStatusBadge(txn.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'enable' ? 'Enable' : 'Disable'} {confirmDialog.gateway === 'razorpay' ? 'Razorpay' : 'Manual UPI'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'enable' ? (
                confirmDialog.gateway === 'razorpay' ? (
                  'This will enable Razorpay for instant payments. Make sure your API keys are correctly configured.'
                ) : (
                  'This will enable Manual UPI payments. Users will need to submit UTR for admin verification.'
                )
              ) : (
                'This will disable this payment gateway. The other gateway will be activated as fallback.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleToggleGateway(confirmDialog.gateway, confirmDialog.action === 'enable')}
            >
              {confirmDialog.action === 'enable' ? 'Enable' : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminApiPayment;
