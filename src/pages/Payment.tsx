import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Upload, Loader2, Clock, QrCode, Shield, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ActiveGateway {
  gateway_name: string;
  display_name: string;
  is_enabled: boolean;
  environment: string;
  min_amount: number;
  max_amount: number;
  api_key_id: string | null;
}

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const amount = parseFloat(searchParams.get('amount') || '0');
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [timeLeft, setTimeLeft] = useState(7 * 60);
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminUpiId, setAdminUpiId] = useState('abbishekvyuha@fam');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [activeGateway, setActiveGateway] = useState<ActiveGateway | null>(null);
  const [loadingGateway, setLoadingGateway] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!amount || amount <= 0) {
      navigate('/wallet');
      return;
    }
    fetchPaymentSettings();
    fetchActiveGateway();
  }, [amount, navigate]);

  useEffect(() => {
    // Only run timer for manual UPI payments
    if (activeGateway?.gateway_name === 'razorpay') return;
    
    if (timeLeft <= 0) {
      toast({
        title: 'Time Expired',
        description: 'Payment session has expired. Please try again.',
        variant: 'destructive',
      });
      navigate('/wallet');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate, toast, activeGateway]);

  const fetchActiveGateway = async () => {
    try {
      const { data } = await supabase.rpc('get_active_payment_gateway');
      if (data && data.length > 0) {
        setActiveGateway(data[0] as ActiveGateway);
      }
    } catch (error) {
      console.error('Error fetching active gateway:', error);
    } finally {
      setLoadingGateway(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['admin_upi_id', 'payment_qr_url']);

      data?.forEach((s) => {
        if (s.setting_key === 'admin_upi_id' && s.setting_value) {
          setAdminUpiId(s.setting_value);
        }
        if (s.setting_key === 'payment_qr_url' && s.setting_value) {
          setQrCodeUrl(s.setting_value);
        }
      });
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(adminUpiId);
    setCopied(true);
    toast({ title: 'Copied!', description: 'UPI ID copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 5MB',
          variant: 'destructive',
        });
        return;
      }
      setScreenshot(file);
    }
  };

  const handleSubmit = async () => {
    if (!utrNumber.trim()) {
      toast({
        title: 'UTR Required',
        description: 'Please enter the UTR/Reference number',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'Please login to continue',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      let screenshotUrl = null;

      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(filePath, screenshot);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-screenshots')
          .getPublicUrl(filePath);

        screenshotUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: amount,
          status: 'pending',
          description: `Deposit via UPI`,
          utr_number: utrNumber.trim(),
          screenshot_url: screenshotUrl,
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Deposit request submitted. Waiting for admin approval.',
      });

      navigate('/wallet');
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Razorpay payment handler
  const handleRazorpayPayment = async () => {
    if (!user || !activeGateway?.api_key_id) return;

    setSubmitting(true);
    try {
      // Create order record first
      const { data: txnData, error: txnError } = await supabase
        .from('payment_gateway_transactions')
        .insert({
          user_id: user.id,
          gateway_name: 'razorpay',
          amount: amount,
          transaction_type: 'credit',
          status: 'created',
          metadata: { initiated_at: new Date().toISOString() }
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Load Razorpay script if not loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      const options = {
        key: activeGateway.api_key_id,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        name: 'Vyuha Esports',
        description: `Wallet Deposit - ₹${amount}`,
        handler: async function (response: any) {
          try {
            // Update transaction with payment details
            await supabase
              .from('payment_gateway_transactions')
              .update({
                payment_id: response.razorpay_payment_id,
                status: 'completed',
                completed_at: new Date().toISOString(),
                metadata: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                }
              })
              .eq('id', txnData.id);

            // Create wallet transaction and update balance
            await supabase
              .from('wallet_transactions')
              .insert({
                user_id: user.id,
                type: 'deposit',
                amount: amount,
                status: 'completed',
                description: `Razorpay Payment - ${response.razorpay_payment_id}`,
              });

            // Update wallet balance directly
            const { data: profileData } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('user_id', user.id)
              .single();

            const currentBalance = profileData?.wallet_balance || 0;
            await supabase
              .from('profiles')
              .update({ wallet_balance: currentBalance + amount })
              .eq('user_id', user.id);

            toast({
              title: 'Payment Successful!',
              description: `₹${amount} has been added to your wallet`,
            });

            navigate('/wallet');
          } catch (error) {
            console.error('Error processing payment:', error);
            toast({
              title: 'Payment Error',
              description: 'Payment received but there was an error updating your wallet. Please contact support.',
              variant: 'destructive',
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#FF6B00',
        },
        modal: {
          ondismiss: function() {
            setSubmitting(false);
            // Update transaction as cancelled
            supabase
              .from('payment_gateway_transactions')
              .update({ status: 'failed', error_description: 'User cancelled payment' })
              .eq('id', txnData.id);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error initiating Razorpay payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const isUrgent = timeLeft < 60;
  const isCritical = timeLeft <= 30;
  const isVeryLow = timeLeft <= 10;

  if (loadingGateway) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Razorpay Payment UI
  if (activeGateway?.gateway_name === 'razorpay') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/wallet')}
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors border border-border"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Pay ₹{amount}</h1>
                <p className="text-xs text-muted-foreground">Secure Razorpay Payment</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Razorpay Info Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Instant Payment</h2>
                <p className="text-sm text-muted-foreground">Powered by Razorpay</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-xl">₹{amount}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Credit Type</span>
                <span className="text-green-600 font-medium">Instant Credit</span>
              </div>
            </div>
          </div>

          {/* Environment Badge */}
          {activeGateway.environment === 'test' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">Test Mode - No real charges will be made</p>
            </div>
          )}

          {/* Payment Methods Info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium mb-3">Accepted Payment Methods</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted rounded-lg p-3">
                <span className="text-2xl">💳</span>
                <p className="text-xs mt-1 text-muted-foreground">Cards</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <span className="text-2xl">📱</span>
                <p className="text-xs mt-1 text-muted-foreground">UPI</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <span className="text-2xl">🏦</span>
                <p className="text-xs mt-1 text-muted-foreground">NetBanking</p>
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handleRazorpayPayment}
            disabled={submitting}
            className="w-full h-14 text-lg font-bold"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Pay ₹{amount} Now
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your payment is secured by Razorpay. Amount will be instantly credited to your wallet.
          </p>
        </div>
      </div>
    );
  }

  // ZapUPI Payment UI
  if (activeGateway?.gateway_name === 'zapupi') {
    const handleZapupiPayment = async () => {
      if (!user) return;

      setSubmitting(true);
      try {
        // Get user profile for phone number
        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone')
          .eq('user_id', user.id)
          .single();

        const response = await supabase.functions.invoke('zapupi-create-order', {
          body: {
            amount: amount.toString(),
            userId: user.id,
            mobile: profileData?.phone || '',
            redirectUrl: `${window.location.origin}/wallet`
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to create payment order');
        }

        if (response.data?.success && response.data?.payment_url) {
          // Redirect to ZapUPI payment page
          window.location.href = response.data.payment_url;
        } else {
          throw new Error(response.data?.error || 'Failed to get payment URL');
        }
      } catch (error) {
        console.error('Error initiating ZapUPI payment:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.',
          variant: 'destructive',
        });
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/wallet')}
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors border border-border"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Pay ₹{amount}</h1>
                <p className="text-xs text-muted-foreground">Secure ZapUPI Payment</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* ZapUPI Info Card */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-2 border-cyan-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Instant UPI Payment</h2>
                <p className="text-sm text-muted-foreground">Powered by ZapUPI</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-xl">₹{amount}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Credit Type</span>
                <span className="text-green-600 font-medium">Instant Credit</span>
              </div>
            </div>
          </div>

          {/* Payment Method Info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium mb-3">Payment via UPI</h3>
            <div className="flex justify-center">
              <div className="bg-muted rounded-lg p-4 text-center">
                <span className="text-3xl">📱</span>
                <p className="text-sm mt-2 text-muted-foreground">UPI Apps</p>
                <p className="text-xs text-muted-foreground mt-1">GPay, PhonePe, Paytm, etc.</p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-start gap-2">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Secure Payment</p>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to a secure payment page. Complete the payment using any UPI app.
              </p>
            </div>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handleZapupiPayment}
            disabled={submitting}
            className="w-full h-14 text-lg font-bold bg-cyan-600 hover:bg-cyan-700"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Connecting to ZapUPI...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Pay ₹{amount} via UPI
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your payment is secured by ZapUPI. Amount will be instantly credited to your wallet after successful payment.
          </p>
        </div>
      </div>
    );
  }

  // Manual UPI Payment UI (existing code)

  return (
    <div className={`min-h-screen bg-background ${isCritical ? 'animate-pulse' : ''}`}>
      {/* Urgency Overlay for Critical Time */}
      {isCritical && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-destructive/5 animate-pulse" />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/wallet')}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors border border-border"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Pay ₹{amount}</h1>
              <p className="text-xs text-muted-foreground">Secure UPI Payment</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        
        {/* Countdown Timer Card - Compact & Wide */}
        <div className={`bg-card border-2 rounded-xl overflow-hidden shadow-sm ${
          isCritical ? 'border-destructive' : 'border-border'
        }`}>
          <div className={`px-4 py-2 flex items-center justify-between ${
            isCritical 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-destructive/90 text-destructive-foreground'
          }`}>
            <div className="flex items-center gap-2">
              {isCritical ? (
                <AlertTriangle className={`h-5 w-5 ${isVeryLow ? 'animate-ping' : 'animate-pulse'}`} />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="font-semibold text-sm">
                {isVeryLow ? '⚠️ HURRY!' : isCritical ? '⏰ Expiring!' : '⏱️ Time Left'}
              </span>
            </div>
            
            {/* Large Timer Display */}
            <div className={`font-mono font-black text-2xl tracking-wider ${isVeryLow ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-muted">
            <div 
              className={`h-full transition-all duration-1000 ${
                isVeryLow ? 'bg-destructive animate-pulse' : isCritical ? 'bg-destructive' : 'bg-destructive/80'
              }`}
              style={{ width: `${(timeLeft / (7 * 60)) * 100}%` }}
            />
          </div>
        </div>
        
        {/* QR Code Section - Hero */}
        <div className="bg-card border-2 border-border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-secondary/50 px-4 py-3 border-b border-border">
            <div className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Scan & Pay ₹{amount}</span>
            </div>
          </div>
          
          <div className="p-6 flex flex-col items-center">
            {/* Large QR Code - Full Fitted */}
            <div className="w-72 h-72 bg-card border-2 border-border rounded-xl overflow-hidden shadow-xs">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Payment QR code" 
                  className="w-full h-full object-contain bg-card"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                  <QrCode className="h-16 w-16 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground text-center">QR not available</p>
                  <p className="text-xs text-muted-foreground">Use UPI ID below</p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Open any UPI app and scan this QR code
            </p>
          </div>
        </div>

        {/* UPI ID Section */}
        <div className="bg-card border-2 border-border rounded-xl p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Or copy UPI ID</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-4 py-3 font-mono text-sm text-foreground border border-border text-center font-medium">
              {adminUpiId}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyUpiId}
              className="shrink-0 h-12 w-12 border-2"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-sm font-medium text-muted-foreground">After Payment</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* UTR Input - Prominent */}
        <div className="bg-card border-2 border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Verify Payment</h3>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">UTR / Reference Number *</Label>
            <Input
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="bg-background h-14 text-lg font-mono border-2 text-center tracking-wider"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground text-center">
              Find this in your UPI app → Payment History → Transaction Details
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium text-muted-foreground">Screenshot (Optional)</Label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                screenshot 
                  ? 'border-green-500 bg-green-500/5' 
                  : 'border-border hover:border-primary hover:bg-muted/50'
              }`}
            >
              {screenshot ? (
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-foreground">{screenshot.name}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tap to upload screenshot</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !utrNumber.trim()}
          className="w-full h-14 text-lg font-bold border-2 border-border shadow-xs hover:shadow-none transition-all"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Submit Payment'
          )}
        </Button>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          Your deposit will be credited within 5-10 minutes after verification
        </p>
      </div>
    </div>
  );
};

export default Payment;
