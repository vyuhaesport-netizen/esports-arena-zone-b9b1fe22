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
          ? `${gatewayName === 'razorpay' ? 'Razorpay' : 'Manual UPI'} is now active` 
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

        <Tabs defaultValue="razorpay" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="razorpay" className="text-xs">Razorpay</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

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

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open('https://dashboard.razorpay.com/app/webhooks', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Razorpay Dashboard
                </Button>
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
